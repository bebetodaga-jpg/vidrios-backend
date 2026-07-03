import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { ItemOrdenCompra, OrdenCompraRepositorio, OrdenCompraVista } from '../dominio/produccion.puertos';

@Injectable()
export class OrdenCompraRepositorioPrisma implements OrdenCompraRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(items: ItemOrdenCompra[]): Promise<{ id: string; numero: string }> {
    return this.prisma.$transaction(async (tx) => {
      const num = await tx.numeracion.upsert({
        where: { serie: 'OCOM' },
        create: { serie: 'OCOM', correlativo: 1 },
        update: { correlativo: { increment: 1 } },
      });
      const numero = `OC-${String(num.correlativo).padStart(4, '0')}`;
      const oc = await tx.ordenCompra.create({ data: { numero, items: items as unknown as Prisma.InputJsonValue } });
      return { id: oc.id, numero };
    });
  }

  async listar(): Promise<OrdenCompraVista[]> {
    const filas = await this.prisma.ordenCompra.findMany({ orderBy: { creadoEn: 'desc' }, take: 50 });
    return filas.map((o) => ({
      id: o.id,
      numero: o.numero,
      estado: o.estado,
      items: o.items as unknown as ItemOrdenCompra[],
      creadoEn: o.creadoEn,
    }));
  }

  async recibir(id: string, costos: { codigo: string; costoCentimos: number }[]): Promise<{ numero: string } | null> {
    const oc = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!oc || oc.estado === 'RECIBIDA') {
      return null;
    }
    const items = oc.items as unknown as ItemOrdenCompra[];
    const costoPor = new Map(costos.map((c) => [c.codigo, c.costoCentimos]));

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenCompra.update({ where: { id }, data: { estado: 'RECIBIDA', recibidaEn: new Date() } });
      // Evento por OUTBOX (misma transacción): inventario registrará las ENTRADAS al kárdex.
      await tx.outbox.create({
        data: {
          tipo: 'compra.recibida',
          payload: {
            numero: oc.numero,
            items: items.map((i) => ({ codigo: i.codigo, cantidad: i.cantidad, costoCentimos: costoPor.get(i.codigo) ?? 0 })),
          },
        },
      });
    });
    return { numero: oc.numero };
  }
}
