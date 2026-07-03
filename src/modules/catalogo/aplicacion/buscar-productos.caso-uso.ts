import { Inject, Injectable } from '@nestjs/common';
import { Producto } from '../dominio/producto';
import { PRODUCTO_REPOSITORIO, ProductoRepositorio } from '../dominio/producto.repositorio';

/** Lectura para POS/catálogo (CQRS ligero: las consultas no pasan por la entidad para mutar). */
@Injectable()
export class BuscarProductosCasoUso {
  constructor(@Inject(PRODUCTO_REPOSITORIO) private readonly productos: ProductoRepositorio) {}

  async ejecutar(texto: string): Promise<Producto[]> {
    return this.productos.buscar(texto.trim());
  }
}
