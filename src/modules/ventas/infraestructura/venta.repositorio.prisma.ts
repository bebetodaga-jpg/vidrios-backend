import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { ErrorNegocioException } from '@shared/infraestructura/error-negocio.exception';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { VentaConfirmar, VentaConfirmada, VentaRepositorio } from '../dominio/ventas.puertos';

const SERIE_NOTA_VENTA = 'NV01';

/**
 * LA transacción del POS (prueba de QA del S2: dos cajas vendiendo el mismo stock).
 * Todo o nada: numeración + stock atómico + kárdex + venta + evento outbox.
 */
@Injectable()
export class VentaRepositorioPrisma implements VentaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async confirmar(venta: VentaConfirmar): Promise<Resultado<VentaConfirmada>> {
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        // 1) Debe haber caja abierta (la venta pertenece a una sesión de caja).
        const sesion = await tx.cajaSesion.findFirst({ where: { cerradaEn: null } });
        if (!sesion) {
          throw new ErrorNegocioException({ codigo: 'CAJA_CERRADA', mensaje: 'No hay una caja abierta: abra caja antes de vender.' });
        }

        // 2) Numeración correlativa dentro de la transacción (sin huecos ni duplicados).
        const numeracion = await tx.numeracion.upsert({
          where: { serie: SERIE_NOTA_VENTA },
          create: { serie: SERIE_NOTA_VENTA, correlativo: 1 },
          update: { correlativo: { increment: 1 } },
        });
        const numero = `${SERIE_NOTA_VENTA}-${String(numeracion.correlativo).padStart(6, '0')}`;

        // 3) Descuento ATÓMICO de stock por ítem contable (unidades y barrillas).
        for (const item of venta.items.filter((i) => i.descuentaStock)) {
          const producto = await tx.producto.findUniqueOrThrow({ where: { codigo: item.codigoProducto } });
          await this.asegurarStockResumen(tx, producto.id);

          const descuento = await tx.stockResumen.updateMany({
            where: { productoId: producto.id, saldo: { gte: item.cantidad } },
            data: { saldo: { decrement: item.cantidad } },
          });
          if (descuento.count === 0) {
            // Otra caja ganó el stock: rollback completo de ESTA venta.
            throw new ErrorNegocioException({
              codigo: 'STOCK_INSUFICIENTE',
              mensaje: `Stock insuficiente para ${item.nombre}: otra venta lo tomó primero o no alcanza.`,
            });
          }
          await tx.movimientoKardex.create({
            data: {
              productoId: producto.id,
              tipo: 'SALIDA',
              cantidad: -item.cantidad, // en BD con signo
              costoCentimos: 0, // la salida valoriza al promedio (kardex.calculos)
              referencia: `Venta ${numero}`,
            },
          });
        }

        // 4) La venta con sus ítems (snapshot de precios).
        const ventaCreada = await tx.venta.create({
          data: {
            numero,
            metodoPago: venta.metodoPago,
            descuentoPct: venta.descuentoPct,
            subtotalCentimos: venta.totales.subtotalCentimos,
            totalCentimos: venta.totales.totalCentimos,
            vendedorId: venta.vendedorId,
            clienteId: venta.clienteId ?? null,
            cajaSesionId: sesion.id,
            items: {
              create: venta.items.map((i) => ({
                codigoProducto: i.codigoProducto,
                nombre: i.nombre,
                unidadVenta: i.unidadVenta,
                cantidad: i.cantidad,
                anchoMm: i.anchoMm ?? null,
                altoMm: i.altoMm ?? null,
                precioCentimos: i.precioCentimos,
                importeCentimos: i.importeCentimos,
              })),
            },
          },
        });

        // Vidrios a medida (pie²/m² con medidas): pasan AL ÁREA DE CORTES vía el mismo evento.
        const vidrios = venta.items
          .filter((i) => (i.unidadVenta === 'PIE2' || i.unidadVenta === 'M2') && i.anchoMm !== undefined && i.altoMm !== undefined)
          .map((i) => ({ codigo: i.codigoProducto, nombre: i.nombre, anchoMm: i.anchoMm ?? 0, altoMm: i.altoMm ?? 0, cantidad: i.cantidad }));

        // 5) Evento en el OUTBOX, misma transacción: caja y cortes lo procesan sin acoplarse a ventas.
        await tx.outbox.create({
          data: {
            tipo: 'venta.confirmada',
            payload: {
              numero,
              metodoPago: venta.metodoPago,
              totalCentimos: venta.totales.totalCentimos,
              cajaSesionId: sesion.id,
              clienteId: venta.clienteId ?? null,
              vidrios,
            },
          },
        });

        return { id: ventaCreada.id, numero, totalCentimos: venta.totales.totalCentimos };
      });

      return ok(resultado);
    } catch (error) {
      if (error instanceof ErrorNegocioException) {
        return fallo(error.detalle.codigo, error.detalle.mensaje);
      }
      throw error; // error técnico real (BD caída): que lo capture el filtro global
    }
  }

  /** Materializa el saldo desde el kárdex la primera vez que el producto entra al POS. */
  private async asegurarStockResumen(tx: Prisma.TransactionClient, productoId: string): Promise<void> {
    const existe = await tx.stockResumen.findUnique({ where: { productoId } });
    if (existe) {
      return;
    }
    const suma = await tx.movimientoKardex.aggregate({ where: { productoId }, _sum: { cantidad: true } });
    await tx.stockResumen.create({ data: { productoId, saldo: suma._sum.cantidad ?? 0 } });
  }
}
