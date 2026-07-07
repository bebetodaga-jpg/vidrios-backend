import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { CorteVentaRepositorio, CorteVentaVista, VidrioVendido } from '../dominio/produccion.puertos';

/** Adaptador del puerto CorteVentaRepositorio: persiste los paños de vidrio que vienen del POS. */
@Injectable()
export class CorteVentaPrisma implements CorteVentaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crearDesdeVenta(ventaNumero: string, vidrios: VidrioVendido[]): Promise<void> {
    if (vidrios.length === 0) {
      return;
    }
    // Idempotencia: si el outbox reintrega el evento, no duplicamos los cortes de esta venta.
    const yaExisten = await this.prisma.corteVenta.count({ where: { ventaNumero } });
    if (yaExisten > 0) {
      return;
    }
    await this.prisma.corteVenta.createMany({
      data: vidrios.map((v) => ({
        ventaNumero,
        productoCodigo: v.codigo,
        productoNombre: v.nombre,
        anchoMm: v.anchoMm,
        altoMm: v.altoMm,
        cantidad: v.cantidad,
      })),
    });
  }

  async listarPendientes(): Promise<CorteVentaVista[]> {
    const filas = await this.prisma.corteVenta.findMany({
      where: { estado: 'PENDIENTE' },
      orderBy: { creadoEn: 'asc' },
    });
    return filas.map((f) => ({
      id: f.id,
      ventaNumero: f.ventaNumero,
      productoCodigo: f.productoCodigo,
      productoNombre: f.productoNombre,
      anchoMm: f.anchoMm,
      altoMm: f.altoMm,
      cantidad: f.cantidad,
      estado: f.estado,
      creadoEn: f.creadoEn,
    }));
  }

  async marcarCortado(id: string): Promise<boolean> {
    const r = await this.prisma.corteVenta.updateMany({ where: { id, estado: 'PENDIENTE' }, data: { estado: 'CORTADO' } });
    return r.count > 0;
  }
}
