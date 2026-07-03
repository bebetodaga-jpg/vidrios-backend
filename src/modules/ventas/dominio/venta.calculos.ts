import { aM2, aPies2, areaCm2, validarMedida } from '@shared/dominio/medidas';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';

/** Vista del producto que ventas necesita (la entrega el puerto CatalogoVentas, no el módulo catálogo). */
export interface ProductoVendible {
  readonly codigo: string;
  readonly nombre: string;
  readonly unidadVenta: 'PIE2' | 'M2' | 'BARRILLA_600' | 'BARRILLA_640' | 'UNIDAD';
  readonly precioCentimos: number;
}

export interface ItemPedido {
  readonly codigo: string;
  readonly cantidad: number;
  readonly anchoCm?: number;
  readonly altoCm?: number;
}

export interface ItemCalculado {
  readonly codigoProducto: string;
  readonly nombre: string;
  readonly unidadVenta: ProductoVendible['unidadVenta'];
  readonly cantidad: number;
  readonly anchoCm?: number;
  readonly altoCm?: number;
  readonly precioCentimos: number;
  readonly importeCentimos: number;
  /** Solo unidades/barrillas descuentan stock contable; el vidrio a medida sale de planchas (S8). */
  readonly descuentaStock: boolean;
}

export function calcularItem(producto: ProductoVendible, pedido: ItemPedido): Resultado<ItemCalculado> {
  if (!Number.isInteger(pedido.cantidad) || pedido.cantidad <= 0) {
    return fallo('CANTIDAD_INVALIDA', `Cantidad inválida para ${producto.nombre}.`);
  }

  const esPorArea = producto.unidadVenta === 'PIE2' || producto.unidadVenta === 'M2';
  let importe: number;

  if (esPorArea) {
    if (pedido.anchoCm === undefined || pedido.altoCm === undefined) {
      return fallo('MEDIDA_REQUERIDA', `${producto.nombre} se vende a medida: indique ancho y alto en cm.`);
    }
    const medida = validarMedida(pedido.anchoCm, pedido.altoCm);
    if (!medida.exito) {
      return medida;
    }
    const cm2 = areaCm2(medida.valor);
    const area = producto.unidadVenta === 'PIE2' ? aPies2(cm2) : aM2(cm2);
    importe = Math.round(producto.precioCentimos * area * pedido.cantidad);
  } else {
    importe = producto.precioCentimos * pedido.cantidad;
  }

  return ok({
    codigoProducto: producto.codigo,
    nombre: producto.nombre,
    unidadVenta: producto.unidadVenta,
    cantidad: pedido.cantidad,
    anchoCm: pedido.anchoCm,
    altoCm: pedido.altoCm,
    precioCentimos: producto.precioCentimos,
    importeCentimos: importe,
    descuentaStock: !esPorArea,
  });
}

export interface TotalesVenta {
  readonly subtotalCentimos: number;
  readonly totalCentimos: number;
}

/** Descuento sin tope de negocio (regla del dueño), pero SIEMPRE autorizado por el GERENTE. */
export function calcularTotales(
  items: readonly ItemCalculado[],
  descuentoPct: number,
  esAutorizadoPorGerente: boolean,
): Resultado<TotalesVenta> {
  if (items.length === 0) {
    return fallo('VENTA_VACIA', 'La venta no tiene ítems.');
  }
  if (!Number.isInteger(descuentoPct) || descuentoPct < 0 || descuentoPct > 100) {
    return fallo('DESCUENTO_INVALIDO', 'El descuento debe ser un porcentaje entero entre 0 y 100.');
  }
  if (descuentoPct > 0 && !esAutorizadoPorGerente) {
    return fallo('DESCUENTO_NO_AUTORIZADO', 'Todo descuento requiere autorización del gerente.');
  }
  const subtotal = items.reduce((s, i) => s + i.importeCentimos, 0);
  const total = Math.round(subtotal * (1 - descuentoPct / 100));
  return ok({ subtotalCentimos: subtotal, totalCentimos: total });
}
