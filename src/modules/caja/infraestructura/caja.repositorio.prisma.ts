import { Injectable } from '@nestjs/common';
import { MetodoPago } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { DeclaracionCierre, MovimientoCajaDato } from '../dominio/caja.calculos';
import { CajaRepositorio, CuentaPorCobrarDato, MovimientoCajaDetalle, SesionCaja } from '../dominio/caja.repositorio';

@Injectable()
export class CajaRepositorioPrisma implements CajaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async sesionAbierta(): Promise<SesionCaja | null> {
    const fila = await this.prisma.cajaSesion.findFirst({ where: { cerradaEn: null } });
    return fila ? this.aSesion(fila) : null;
  }

  async sesionPorId(sesionId: string): Promise<SesionCaja | null> {
    const fila = await this.prisma.cajaSesion.findUnique({ where: { id: sesionId } });
    return fila ? this.aSesion(fila) : null;
  }

  async abrir(usuarioId: string, montoInicialCentimos: number): Promise<SesionCaja> {
    const fila = await this.prisma.cajaSesion.create({
      data: { abiertaPorId: usuarioId, montoInicialCentimos },
    });
    return this.aSesion(fila);
  }

  async registrarMovimiento(
    sesionId: string,
    movimiento: { tipo: 'INGRESO' | 'EGRESO' | 'VENTA' | 'COBRO_CREDITO'; metodo: string; concepto: string; montoCentimos: number },
  ): Promise<void> {
    await this.prisma.movimientoCaja.create({
      data: {
        cajaSesionId: sesionId,
        tipo: movimiento.tipo,
        metodo: movimiento.metodo as MetodoPago,
        concepto: movimiento.concepto,
        montoCentimos: movimiento.montoCentimos,
      },
    });
  }

  async movimientosDe(sesionId: string): Promise<MovimientoCajaDato[]> {
    const filas = await this.prisma.movimientoCaja.findMany({ where: { cajaSesionId: sesionId } });
    return filas.map((f) => ({ metodo: f.metodo, montoCentimos: f.montoCentimos }));
  }

  async movimientosDetalle(sesionId: string): Promise<MovimientoCajaDetalle[]> {
    const filas = await this.prisma.movimientoCaja.findMany({
      where: { cajaSesionId: sesionId },
      orderBy: { creadoEn: 'asc' },
    });
    return filas.map((f) => ({
      creadoEn: f.creadoEn,
      tipo: f.tipo,
      metodo: f.metodo,
      concepto: f.concepto,
      montoCentimos: f.montoCentimos,
    }));
  }

  async cerrar(sesionId: string, declarado: DeclaracionCierre): Promise<void> {
    await this.prisma.cajaSesion.update({
      where: { id: sesionId },
      data: {
        cerradaEn: new Date(),
        declEfectivoCentimos: declarado.efectivoCentimos,
        declTarjetaCentimos: declarado.tarjetaCentimos,
        declYapeCentimos: declarado.yapeCentimos,
      },
    });
  }

  async crearCuentaPorCobrar(ventaNumero: string, clienteId: string, montoCentimos: number, venceEn: Date): Promise<void> {
    const venta = await this.prisma.venta.findUniqueOrThrow({ where: { numero: ventaNumero } });
    await this.prisma.cuentaPorCobrar.create({
      data: { ventaId: venta.id, clienteId, saldoCentimos: montoCentimos, venceEn },
    });
  }

  async cuentasPorCobrar(): Promise<CuentaPorCobrarDato[]> {
    const filas = await this.prisma.cuentaPorCobrar.findMany({
      where: { saldoCentimos: { gt: 0 } },
      include: { cliente: true, venta: true },
      orderBy: { venceEn: 'asc' },
    });
    return filas.map((f) => ({
      id: f.id,
      cliente: f.cliente.nombre,
      numeroVenta: f.venta.numero,
      saldoCentimos: f.saldoCentimos,
      venceEn: f.venceEn,
    }));
  }

  async aplicarCobro(cuentaId: string, montoCentimos: number): Promise<number | null> {
    // Atómico: solo descuenta si el saldo alcanza (mismo patrón que el stock del POS).
    const actualizadas = await this.prisma.cuentaPorCobrar.updateMany({
      where: { id: cuentaId, saldoCentimos: { gte: montoCentimos } },
      data: { saldoCentimos: { decrement: montoCentimos } },
    });
    if (actualizadas.count === 0) {
      return null;
    }
    const cuenta = await this.prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cuentaId } });
    return cuenta.saldoCentimos;
  }

  private aSesion(fila: {
    id: string;
    montoInicialCentimos: number;
    abiertaEn: Date;
    cerradaEn: Date | null;
    declEfectivoCentimos: number | null;
    declTarjetaCentimos: number | null;
    declYapeCentimos: number | null;
  }): SesionCaja {
    const tieneDeclaracion =
      fila.declEfectivoCentimos !== null && fila.declTarjetaCentimos !== null && fila.declYapeCentimos !== null;
    return {
      id: fila.id,
      montoInicialCentimos: fila.montoInicialCentimos,
      abiertaEn: fila.abiertaEn,
      cerradaEn: fila.cerradaEn,
      declarado: tieneDeclaracion
        ? {
            efectivoCentimos: fila.declEfectivoCentimos ?? 0,
            tarjetaCentimos: fila.declTarjetaCentimos ?? 0,
            yapeCentimos: fila.declYapeCentimos ?? 0,
          }
        : null,
    };
  }
}
