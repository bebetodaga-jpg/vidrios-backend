import { Resultado } from '@shared/dominio/resultado';
import { ItemCalculado, ProductoVendible, TotalesVenta } from './venta.calculos';

/** Puerto hacia catálogo: ventas NO importa el módulo catálogo (regla de módulos). */
export const CATALOGO_VENTAS = Symbol('CatalogoVentas');
export interface CatalogoVentas {
  vendible(codigo: string): Promise<ProductoVendible | null>;
}

export interface VentaConfirmar {
  readonly items: readonly ItemCalculado[];
  readonly totales: TotalesVenta;
  readonly metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'CREDITO';
  readonly descuentoPct: number;
  readonly vendedorId: string;
  readonly clienteId?: string;
}

export interface VentaConfirmada {
  readonly id: string;
  readonly numero: string;
  readonly totalCentimos: number;
}

export const VENTA_REPOSITORIO = Symbol('VentaRepositorio');
export interface VentaRepositorio {
  /**
   * Transacción única: numeración + descuento atómico de stock + venta + evento outbox.
   * Si el stock no alcanza (dos cajas a la vez), TODO se revierte.
   */
  confirmar(venta: VentaConfirmar): Promise<Resultado<VentaConfirmada>>;
}
