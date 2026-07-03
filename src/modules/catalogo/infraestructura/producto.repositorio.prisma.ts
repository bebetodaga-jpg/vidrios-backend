import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { Dinero } from '@shared/dominio/dinero';
import { Familia, Producto, UnidadVenta } from '../dominio/producto';
import { ProductoRepositorio } from '../dominio/producto.repositorio';

/**
 * ADAPTADOR del puerto ProductoRepositorio sobre Prisma.
 * Toda la traducción fila ↔ entidad vive aquí: el dominio nunca ve Prisma (ADR-003).
 */
@Injectable()
export class ProductoRepositorioPrisma implements ProductoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async guardar(producto: Producto): Promise<void> {
    const subfamilia = await this.prisma.subfamilia.upsert({
      where: { familia_nombre: { familia: producto.familia, nombre: producto.subfamilia } },
      create: { familia: producto.familia, nombre: producto.subfamilia },
      update: {},
    });

    await this.prisma.producto.upsert({
      where: { codigo: producto.codigo },
      create: {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        subfamiliaId: subfamilia.id,
        unidadVenta: producto.unidadVenta,
        precioCentimos: producto.precio.centimos,
        stockMinimo: producto.stockMinimo,
        grosorMm: producto.grosorMm ?? null,
      },
      update: {
        nombre: producto.nombre,
        precioCentimos: producto.precio.centimos,
        stockMinimo: producto.stockMinimo,
      },
    });
  }

  async porCodigo(codigo: string): Promise<Producto | null> {
    const fila = await this.prisma.producto.findUnique({ where: { codigo }, include: { subfamilia: true } });
    return fila ? this.aDominio(fila) : null;
  }

  async buscar(texto: string): Promise<Producto[]> {
    const filas = await this.prisma.producto.findMany({
      where: {
        activo: true,
        OR: [{ nombre: { contains: texto, mode: 'insensitive' } }, { codigo: { contains: texto } }],
      },
      include: { subfamilia: true },
      orderBy: { nombre: 'asc' },
      take: 50,
    });
    return filas.map((fila) => this.aDominio(fila));
  }

  private aDominio(fila: {
    id: string;
    codigo: string;
    nombre: string;
    unidadVenta: string;
    precioCentimos: number;
    stockMinimo: number;
    grosorMm: number | null;
    subfamilia: { familia: string; nombre: string };
  }): Producto {
    const precio = Dinero.desdeCentimos(fila.precioCentimos);
    const producto = Producto.crear({
      id: fila.id,
      codigo: fila.codigo,
      nombre: fila.nombre,
      familia: fila.subfamilia.familia as Familia,
      subfamilia: fila.subfamilia.nombre,
      unidadVenta: fila.unidadVenta as UnidadVenta,
      precio: precio.exito ? precio.valor : (() => { throw new Error(`Precio corrupto en BD: producto ${fila.codigo}`); })(),
      stockMinimo: fila.stockMinimo,
      grosorMm: fila.grosorMm ?? undefined,
    });
    if (!producto.exito) {
      // Si la BD contiene un producto que viola invariantes, es un bug de migración: excepción real.
      throw new Error(`Producto corrupto en BD (${fila.codigo}): ${producto.error.mensaje}`);
    }
    return producto.valor;
  }
}
