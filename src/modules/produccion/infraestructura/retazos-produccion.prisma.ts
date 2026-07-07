import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { LaminaDisponible } from '../dominio/corte.calculos';
import { RetazosProduccion } from '../dominio/produccion.puertos';

@Injectable()
export class RetazosProduccionPrisma implements RetazosProduccion {
  constructor(private readonly prisma: PrismaService) {}

  async disponiblesDe(vidrioCodigo: string): Promise<LaminaDisponible[]> {
    const filas = await this.prisma.retazo.findMany({
      where: { estado: 'DISPONIBLE', producto: { codigo: vidrioCodigo } },
    });
    return filas.map((r) => ({ id: r.id, origen: 'RETAZO' as const, anchoMm: r.anchoMm, altoMm: r.altoMm }));
  }

  async consumir(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.prisma.retazo.updateMany({ where: { id: { in: ids } }, data: { estado: 'CONSUMIDO' } });
  }

  async crear(vidrioCodigo: string, retazos: { anchoMm: number; altoMm: number }[], origen: string): Promise<string[]> {
    if (retazos.length === 0) {
      return [];
    }
    const producto = await this.prisma.producto.findUniqueOrThrow({ where: { codigo: vidrioCodigo } });
    const codigos: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const r of retazos) {
        const num = await tx.numeracion.upsert({
          where: { serie: 'RET' },
          create: { serie: 'RET', correlativo: 1 },
          update: { correlativo: { increment: 1 } },
        });
        const codigo = `RET-${String(num.correlativo).padStart(4, '0')}`;
        await tx.retazo.create({ data: { codigo, productoId: producto.id, anchoMm: r.anchoMm, altoMm: r.altoMm, origen } });
        codigos.push(codigo);
      }
    });
    return codigos;
  }
}
