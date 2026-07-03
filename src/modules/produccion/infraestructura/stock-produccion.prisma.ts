import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { StockProduccion } from '../dominio/produccion.puertos';

/** Saldos de stock por código (suma del kárdex) para la cubicación. */
@Injectable()
export class StockProduccionPrisma implements StockProduccion {
  constructor(private readonly prisma: PrismaService) {}

  async saldos(): Promise<Map<string, number>> {
    const grupos = await this.prisma.movimientoKardex.groupBy({ by: ['productoId'], _sum: { cantidad: true } });
    const productos = await this.prisma.producto.findMany({ select: { id: true, codigo: true } });
    const codigoPorId = new Map(productos.map((p) => [p.id, p.codigo]));
    const saldos = new Map<string, number>();
    for (const g of grupos) {
      const codigo = codigoPorId.get(g.productoId);
      if (codigo) {
        saldos.set(codigo, g._sum.cantidad ?? 0);
      }
    }
    return saldos;
  }
}
