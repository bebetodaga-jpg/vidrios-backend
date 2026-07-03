import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { ProductoVendible } from '../dominio/venta.calculos';
import { CatalogoVentas } from '../dominio/ventas.puertos';

/**
 * Adaptador del puerto CatalogoVentas: lee la tabla de productos (cuyo dueño es el
 * módulo catálogo) solo en la proyección mínima que ventas necesita.
 */
@Injectable()
export class CatalogoVentasPrisma implements CatalogoVentas {
  constructor(private readonly prisma: PrismaService) {}

  async vendible(codigo: string): Promise<ProductoVendible | null> {
    const fila = await this.prisma.producto.findUnique({
      where: { codigo },
      select: { codigo: true, nombre: true, unidadVenta: true, precioCentimos: true, activo: true },
    });
    if (!fila || !fila.activo) {
      return null;
    }
    return {
      codigo: fila.codigo,
      nombre: fila.nombre,
      unidadVenta: fila.unidadVenta,
      precioCentimos: fila.precioCentimos,
    };
  }
}
