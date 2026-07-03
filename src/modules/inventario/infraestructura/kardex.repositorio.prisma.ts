import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { MovimientoDato, TipoMovimiento, cantidadConSigno } from '../dominio/kardex.calculos';
import { KardexRepositorio, SaldoProducto } from '../dominio/kardex.repositorio';

/**
 * Adaptador Prisma del kárdex. Resuelve código→producto aquí (detalle de persistencia);
 * cuando ventas/produccion necesiten stock, consumirán un puerto público de inventario,
 * no esta clase (regla de módulos).
 *
 * Convención de signos: en BD la cantidad va SIEMPRE con signo (entrada +, salida −,
 * ajuste ±). En el dominio, ENTRADA/SALIDA usan cantidad positiva y el tipo da el signo.
 */
@Injectable()
export class KardexRepositorioPrisma implements KardexRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(codigoProducto: string, movimiento: MovimientoDato): Promise<void> {
    const producto = await this.prisma.producto.findUniqueOrThrow({ where: { codigo: codigoProducto } });
    await this.prisma.movimientoKardex.create({
      data: {
        productoId: producto.id,
        tipo: movimiento.tipo,
        cantidad: cantidadConSigno(movimiento),
        costoCentimos: movimiento.costoCentimos,
        referencia: movimiento.referencia.trim(),
      },
    });
  }

  async movimientosDe(codigoProducto: string): Promise<MovimientoDato[] | null> {
    const producto = await this.prisma.producto.findUnique({ where: { codigo: codigoProducto } });
    if (!producto) {
      return null;
    }
    const filas = await this.prisma.movimientoKardex.findMany({
      where: { productoId: producto.id },
      orderBy: { creadoEn: 'asc' }, // usa el índice (productoId, creadoEn)
    });
    return filas.map((f) => ({
      tipo: f.tipo as TipoMovimiento,
      cantidad: f.tipo === 'AJUSTE' ? f.cantidad : Math.abs(f.cantidad),
      costoCentimos: f.costoCentimos,
      referencia: f.referencia,
      fecha: f.creadoEn,
    }));
  }

  async saldos(): Promise<SaldoProducto[]> {
    // El saldo es la suma con signo del kárdex (entradas +, salidas −, ajustes ±).
    const grupos = await this.prisma.movimientoKardex.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
    });
    const productos = await this.prisma.producto.findMany({ select: { id: true, codigo: true } });
    const codigoPorId = new Map(productos.map((p) => [p.id, p.codigo]));
    return grupos
      .map((g) => ({ codigo: codigoPorId.get(g.productoId) ?? '', saldo: g._sum.cantidad ?? 0 }))
      .filter((s) => s.codigo !== '');
  }
}
