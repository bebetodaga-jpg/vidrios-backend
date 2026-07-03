import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { VentaParaComprobante, VentasFacturacion } from '../dominio/facturacion.puertos';

/** Adaptador del puerto VentasFacturacion: lee la venta en la proyección mínima necesaria. */
@Injectable()
export class VentasFacturacionPrisma implements VentasFacturacion {
  constructor(private readonly prisma: PrismaService) {}

  async porId(ventaId: string): Promise<VentaParaComprobante | null> {
    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      select: { id: true, numero: true, totalCentimos: true, estado: true },
    });
    if (!venta) {
      return null;
    }
    return {
      id: venta.id,
      numero: venta.numero,
      totalCentimos: venta.totalCentimos,
      anulada: venta.estado === 'ANULADA',
    };
  }
}
