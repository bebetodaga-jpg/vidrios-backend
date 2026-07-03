import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Dinero } from '@shared/dominio/dinero';
import { Resultado, fallo } from '@shared/dominio/resultado';
import { Familia, Producto, UnidadVenta } from '../dominio/producto';
import { PRODUCTO_REPOSITORIO, ProductoRepositorio } from '../dominio/producto.repositorio';

export interface ComandoCrearProducto {
  readonly codigo: string;
  readonly nombre: string;
  readonly familia: Familia;
  readonly subfamilia: string;
  readonly unidadVenta: UnidadVenta;
  readonly precioCentimos: number;
  readonly stockMinimo: number;
  readonly grosorMm?: number;
}

/**
 * Caso de uso: orquesta dominio + puertos. Sin reglas de negocio propias (estándar §1).
 * Solo el rol GERENTE llega aquí (guard en el controlador — regla del dueño).
 */
@Injectable()
export class CrearProductoCasoUso {
  constructor(@Inject(PRODUCTO_REPOSITORIO) private readonly productos: ProductoRepositorio) {}

  async ejecutar(comando: ComandoCrearProducto): Promise<Resultado<Producto>> {
    const existente = await this.productos.porCodigo(comando.codigo);
    if (existente) {
      return fallo('CODIGO_DUPLICADO', `Ya existe un producto con el código ${comando.codigo}.`);
    }

    const precio = Dinero.desdeCentimos(comando.precioCentimos);
    if (!precio.exito) {
      return precio;
    }

    const producto = Producto.crear({
      id: randomUUID(),
      codigo: comando.codigo,
      nombre: comando.nombre,
      familia: comando.familia,
      subfamilia: comando.subfamilia,
      unidadVenta: comando.unidadVenta,
      precio: precio.valor,
      stockMinimo: comando.stockMinimo,
      grosorMm: comando.grosorMm,
    });
    if (!producto.exito) {
      return producto;
    }

    await this.productos.guardar(producto.valor);
    return producto;
  }
}
