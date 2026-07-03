/** Puerto hacia ventas: facturación NO importa el módulo ventas (regla de módulos). */
export const VENTAS_FACTURACION = Symbol('VentasFacturacion');

export interface VentaParaComprobante {
  readonly id: string;
  readonly numero: string;
  readonly totalCentimos: number;
  readonly anulada: boolean;
}

export interface VentasFacturacion {
  porId(ventaId: string): Promise<VentaParaComprobante | null>;
}

/** Puerto hacia la cola (BullMQ): emitir es asíncrono → la venta nunca se bloquea por el PSE. */
export const COLA_EMISION = Symbol('ColaEmision');

export interface ColaEmision {
  encolar(comprobanteId: string): Promise<void>;
}
