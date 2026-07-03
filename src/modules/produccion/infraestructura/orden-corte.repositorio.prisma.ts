import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { OrdenCorteRepositorio, OrdenCorteVista, ResultadoCorte } from '../dominio/produccion.puertos';

@Injectable()
export class OrdenCorteRepositorioPrisma implements OrdenCorteRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crearPendiente(cotizacionId: string): Promise<{ id: string; numero: string }> {
    return this.prisma.$transaction(async (tx) => {
      const num = await tx.numeracion.upsert({
        where: { serie: 'ODC' },
        create: { serie: 'ODC', correlativo: 1 },
        update: { correlativo: { increment: 1 } },
      });
      const numero = `ODC-${String(num.correlativo).padStart(4, '0')}`;
      const orden = await tx.ordenCorte.create({ data: { numero, cotizacionId } });
      return { id: orden.id, numero };
    });
  }

  async marcarLista(id: string, resultado: ResultadoCorte): Promise<void> {
    await this.prisma.ordenCorte.update({
      where: { id },
      data: { estado: 'LISTA', resultado: resultado as unknown as Prisma.InputJsonValue, error: null },
    });
  }

  async marcarError(id: string, mensaje: string): Promise<void> {
    await this.prisma.ordenCorte.update({ where: { id }, data: { estado: 'ERROR', error: mensaje } });
  }

  async detalle(id: string): Promise<OrdenCorteVista | null> {
    const o = await this.prisma.ordenCorte.findUnique({ where: { id }, include: { cotizacion: true } });
    return o ? this.aVista(o) : null;
  }

  async listar(): Promise<OrdenCorteVista[]> {
    const filas = await this.prisma.ordenCorte.findMany({ include: { cotizacion: true }, orderBy: { creadoEn: 'desc' }, take: 50 });
    return filas.map((o) => this.aVista(o));
  }

  async cotizacionDe(id: string): Promise<string | null> {
    const o = await this.prisma.ordenCorte.findUnique({ where: { id }, select: { cotizacionId: true } });
    return o?.cotizacionId ?? null;
  }

  private aVista(o: {
    id: string;
    numero: string;
    estado: string;
    resultado: Prisma.JsonValue;
    error: string | null;
    creadoEn: Date;
    cotizacion: { numero: string };
  }): OrdenCorteVista {
    return {
      id: o.id,
      numero: o.numero,
      cotizacionNumero: o.cotizacion.numero,
      estado: o.estado as OrdenCorteVista['estado'],
      resultado: o.resultado ? (o.resultado as unknown as ResultadoCorte) : null,
      error: o.error,
      creadoEn: o.creadoEn,
    };
  }
}
