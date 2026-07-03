import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Dinero } from '@shared/dominio/dinero';
import { Familia, Producto, UnidadVenta } from '../dominio/producto';
import { PRODUCTO_REPOSITORIO, ProductoRepositorio } from '../dominio/producto.repositorio';

/** Una fila del Excel del gerente (el FE parsea el archivo y envía JSON — flujo del prototipo S1). */
export interface FilaCarga {
  readonly fila: number; // número de fila en el Excel, para el reporte
  readonly codigo: string;
  readonly nombre: string;
  readonly familia: Familia;
  readonly subfamilia: string;
  readonly unidadVenta: UnidadVenta;
  readonly precioCentimos: number;
  readonly stockMinimo: number;
  readonly grosorMm?: number;
}

export interface ReporteCarga {
  readonly creados: number;
  readonly actualizados: number;
  readonly errores: { fila: number; codigo: string; mensaje: string }[];
}

/**
 * Carga masiva del catálogo (migración de las listas actuales de la tienda).
 * Idempotente: re-ejecutar el mismo archivo actualiza en vez de duplicar.
 * Las filas con error NO se importan y se reportan una a una (flujo validado en UX S1).
 */
@Injectable()
export class CargaMasivaCasoUso {
  constructor(@Inject(PRODUCTO_REPOSITORIO) private readonly productos: ProductoRepositorio) {}

  async ejecutar(filas: FilaCarga[]): Promise<ReporteCarga> {
    let creados = 0;
    let actualizados = 0;
    const errores: ReporteCarga['errores'] = [];

    for (const fila of filas) {
      // Dinero acepta 0 (saldos), pero un precio de venta debe ser positivo.
      if (!Number.isInteger(fila.precioCentimos) || fila.precioCentimos <= 0) {
        errores.push({ fila: fila.fila, codigo: fila.codigo, mensaje: 'Falta el precio o no es válido.' });
        continue;
      }
      const precio = Dinero.desdeCentimos(fila.precioCentimos);
      if (!precio.exito) {
        errores.push({ fila: fila.fila, codigo: fila.codigo, mensaje: precio.error.mensaje });
        continue;
      }

      const existente = await this.productos.porCodigo(fila.codigo);
      if (existente) {
        const cambio = existente.cambiarPrecio(precio.valor);
        if (!cambio.exito) {
          errores.push({ fila: fila.fila, codigo: fila.codigo, mensaje: cambio.error.mensaje });
          continue;
        }
        await this.productos.guardar(existente);
        actualizados++;
        continue;
      }

      const producto = Producto.crear({
        id: randomUUID(),
        codigo: fila.codigo,
        nombre: fila.nombre,
        familia: fila.familia,
        subfamilia: fila.subfamilia,
        unidadVenta: fila.unidadVenta,
        precio: precio.valor,
        stockMinimo: fila.stockMinimo,
        grosorMm: fila.grosorMm,
      });
      if (!producto.exito) {
        // El dominio explica el error en español listo para la celda roja del asistente.
        errores.push({ fila: fila.fila, codigo: fila.codigo, mensaje: producto.error.mensaje });
        continue;
      }

      await this.productos.guardar(producto.valor);
      creados++;
    }

    return { creados, actualizados, errores };
  }
}
