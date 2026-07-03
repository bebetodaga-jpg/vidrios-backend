import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import {
  ContratoDetalle,
  ContratoRepositorio,
  ContratoResumen,
  NuevoContrato,
} from '../dominio/contratos.puertos';

const SERIE = 'CT';

@Injectable()
export class ContratoRepositorioPrisma implements ContratoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async yaTieneContrato(cotizacionId: string): Promise<boolean> {
    return (await this.prisma.contrato.count({ where: { cotizacionId } })) > 0;
  }

  async crear(nuevo: NuevoContrato): Promise<{ id: string; numero: string }> {
    return this.prisma.$transaction(async (tx) => {
      const num = await tx.numeracion.upsert({
        where: { serie: SERIE },
        create: { serie: SERIE, correlativo: 1 },
        update: { correlativo: { increment: 1 } },
      });
      const numero = `CT-${String(new Date().getFullYear())}-${String(num.correlativo).padStart(4, '0')}`;
      const c = await tx.contrato.create({
        data: {
          numero,
          cotizacionId: nuevo.cotizacionId,
          clienteId: nuevo.clienteId,
          obraId: nuevo.obraId,
          totalCentimos: nuevo.totalCentimos,
          adelantoCentimos: nuevo.adelantoCentimos,
          saldoCentimos: nuevo.saldoCentimos,
          firmaDataUrl: nuevo.firmaDataUrl ?? null,
        },
      });
      return { id: c.id, numero };
    });
  }

  async detalle(id: string): Promise<ContratoDetalle | null> {
    const c = await this.prisma.contrato.findUnique({ where: { id }, include: { cliente: true, cotizacion: true } });
    if (!c) {
      return null;
    }
    return {
      id: c.id,
      numero: c.numero,
      estado: c.estado,
      cliente: c.cliente?.nombre ?? null,
      cotizacionNumero: c.cotizacion.numero,
      totalCentimos: c.totalCentimos,
      adelantoCentimos: c.adelantoCentimos,
      saldoCentimos: c.saldoCentimos,
      pagadoCentimos: c.pagadoCentimos,
      saldoPendienteCentimos: c.totalCentimos - c.pagadoCentimos,
      tieneFirma: c.firmaDataUrl !== null,
      firmaDataUrl: c.firmaDataUrl,
      creadoEn: c.creadoEn,
    };
  }

  async listar(): Promise<ContratoResumen[]> {
    const filas = await this.prisma.contrato.findMany({ include: { cliente: true }, orderBy: { creadoEn: 'desc' }, take: 100 });
    return filas.map((c) => ({
      id: c.id,
      numero: c.numero,
      estado: c.estado,
      cliente: c.cliente?.nombre ?? null,
      totalCentimos: c.totalCentimos,
      adelantoCentimos: c.adelantoCentimos,
      pagadoCentimos: c.pagadoCentimos,
      saldoPendienteCentimos: c.totalCentimos - c.pagadoCentimos,
      tieneFirma: c.firmaDataUrl !== null,
      creadoEn: c.creadoEn,
    }));
  }

  async registrarPago(id: string, montoCentimos: number, metodo: string): Promise<{ pagadoCentimos: number; saldoPendienteCentimos: number }> {
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.contrato.update({ where: { id }, data: { pagadoCentimos: { increment: montoCentimos } } });
      // Evento en el outbox (misma transacción): caja registrará el ingreso sin acoplarse a contratos.
      await tx.outbox.create({
        data: {
          tipo: 'pago.contrato.registrado',
          payload: { contratoNumero: c.numero, montoCentimos, metodo },
        },
      });
      return { pagadoCentimos: c.pagadoCentimos, saldoPendienteCentimos: c.totalCentimos - c.pagadoCentimos };
    });
  }

  async guardarFirma(id: string, dataUrl: string): Promise<boolean> {
    const existe = await this.prisma.contrato.count({ where: { id } });
    if (existe === 0) {
      return false;
    }
    await this.prisma.contrato.update({ where: { id }, data: { firmaDataUrl: dataUrl } });
    return true;
  }
}
