import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { Despiece } from '../dominio/modelos';
import {
  CotizacionDetalle,
  CotizacionRepositorio,
  CotizacionResumen,
  EstadoCotizacion,
  ItemPersistir,
} from '../dominio/cotizaciones.puertos';

const SERIE = 'COT';

@Injectable()
export class CotizacionRepositorioPrisma implements CotizacionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(items: ItemPersistir[], totalCentimos: number, clienteId?: string, obraId?: string): Promise<{ id: string; numero: string }> {
    return this.prisma.$transaction(async (tx) => {
      const num = await tx.numeracion.upsert({
        where: { serie: SERIE },
        create: { serie: SERIE, correlativo: 1 },
        update: { correlativo: { increment: 1 } },
      });
      const anio = new Date().getFullYear();
      const numero = `COT-${String(anio)}-${String(num.correlativo).padStart(4, '0')}`;
      const cot = await tx.cotizacion.create({
        data: {
          numero,
          clienteId: clienteId ?? null,
          obraId: obraId ?? null,
          totalCentimos,
          items: {
            create: items.map((i) => ({
              vanoCodigo: i.vanoCodigo,
              modelo: i.modelo,
              vidrioCodigo: i.vidrioCodigo,
              vidrioNombre: i.vidrioNombre,
              color: i.color,
              anchoCm: i.anchoCm,
              altoCm: i.altoCm,
              cantidad: i.cantidad,
              unitCentimos: i.unitCentimos,
              totalCentimos: i.totalCentimos,
              despiece: i.despiece as unknown as Prisma.InputJsonValue,
            })),
          },
        },
      });
      return { id: cot.id, numero };
    });
  }

  async listar(): Promise<CotizacionResumen[]> {
    const filas = await this.prisma.cotizacion.findMany({
      include: { cliente: true, _count: { select: { items: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    });
    return filas.map((c) => ({
      id: c.id,
      numero: c.numero,
      estado: c.estado,
      cliente: c.cliente?.nombre ?? null,
      totalCentimos: c.totalCentimos,
      items: c._count.items,
      creadoEn: c.creadoEn,
    }));
  }

  async detalle(id: string): Promise<CotizacionDetalle | null> {
    const c = await this.prisma.cotizacion.findUnique({ where: { id }, include: { cliente: true, items: true } });
    if (!c) {
      return null;
    }
    return {
      id: c.id,
      numero: c.numero,
      estado: c.estado,
      cliente: c.cliente?.nombre ?? null,
      totalCentimos: c.totalCentimos,
      items: c.items.length,
      creadoEn: c.creadoEn,
      itemsDetalle: c.items.map((i) => ({
        vanoCodigo: i.vanoCodigo,
        modelo: i.modelo,
        vidrioCodigo: i.vidrioCodigo,
        vidrioNombre: i.vidrioNombre,
        color: i.color,
        anchoCm: i.anchoCm,
        altoCm: i.altoCm,
        cantidad: i.cantidad,
        unitCentimos: i.unitCentimos,
        totalCentimos: i.totalCentimos,
        despiece: i.despiece as unknown as Despiece,
      })),
    };
  }

  async cambiarEstado(id: string, nuevo: EstadoCotizacion): Promise<boolean> {
    await this.prisma.cotizacion.update({ where: { id }, data: { estado: nuevo } });
    return true;
  }
}
