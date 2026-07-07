import { LaminaDisponible, PanoCorte, Plan1D, Plan2D } from './corte.calculos';
import { DespieceDeItem } from './cubicacion.calculos';

/**
 * Motor de optimización EXTERNO (OR-Tools, ADR-007). Resuelve el acomodo óptimo de UNA plancha.
 * Devuelve null si no aplica (las piezas no caben en una plancha, o el servicio no responde):
 * en ese caso el caso de uso recurre a la heurística TS.
 */
export const OPTIMIZADOR_EXTERNO = Symbol('OptimizadorExterno');
export interface OptimizadorExterno {
  optimizar(plancha: { anchoMm: number; altoMm: number }, panos: PanoCorte[], retazos: LaminaDisponible[]): Promise<Plan2D | null>;
}

/** Despieces de una cotización ACEPTADA (lo que se manda a corte/cubicación). */
export const COTIZACION_PRODUCCION = Symbol('CotizacionProduccion');
export interface CotizacionProduccion {
  despieces(cotizacionId: string): Promise<{ numero: string; estado: string; items: DespieceDeItem[] } | null>;
}

/** Retazos de vidrio del inventario para el optimizador (prioridad antes de plancha nueva). */
export const RETAZOS_PRODUCCION = Symbol('RetazosProduccion');
export interface RetazosProduccion {
  disponiblesDe(vidrioCodigo: string): Promise<LaminaDisponible[]>;
  consumir(ids: string[]): Promise<void>;
  crear(vidrioCodigo: string, retazos: { anchoMm: number; altoMm: number }[], origen: string): Promise<string[]>;
}

/** Saldos de stock por código (para la cubicación). */
export const STOCK_PRODUCCION = Symbol('StockProduccion');
export interface StockProduccion {
  saldos(): Promise<Map<string, number>>;
}

export interface PlanVidrio {
  readonly vidrioCodigo: string;
  readonly vidrioNombre: string;
  readonly plan: Plan2D;
  readonly retazosCreados: string[];
}

export interface ResultadoCorte {
  readonly vidrios: PlanVidrio[];
  readonly perfiles: Plan1D;
}

export interface OrdenCorteVista {
  readonly id: string;
  readonly numero: string;
  readonly cotizacionNumero: string;
  readonly estado: 'PENDIENTE' | 'LISTA' | 'ERROR';
  readonly resultado: ResultadoCorte | null;
  readonly error: string | null;
  readonly creadoEn: Date;
}

export const ORDEN_CORTE_REPOSITORIO = Symbol('OrdenCorteRepositorio');
export interface OrdenCorteRepositorio {
  crearPendiente(cotizacionId: string): Promise<{ id: string; numero: string }>;
  marcarLista(id: string, resultado: ResultadoCorte): Promise<void>;
  marcarError(id: string, mensaje: string): Promise<void>;
  detalle(id: string): Promise<OrdenCorteVista | null>;
  listar(): Promise<OrdenCorteVista[]>;
  cotizacionDe(id: string): Promise<string | null>;
}

export interface ItemOrdenCompra {
  readonly codigo: string;
  readonly nombre: string;
  readonly cantidad: number;
}

export interface OrdenCompraVista {
  readonly id: string;
  readonly numero: string;
  readonly estado: 'PENDIENTE' | 'RECIBIDA';
  readonly items: ItemOrdenCompra[];
  readonly creadoEn: Date;
}

export const ORDEN_COMPRA_REPOSITORIO = Symbol('OrdenCompraRepositorio');
export interface OrdenCompraRepositorio {
  crear(items: ItemOrdenCompra[]): Promise<{ id: string; numero: string }>;
  listar(): Promise<OrdenCompraVista[]>;
  /**
   * Marca RECIBIDA y emite `compra.recibida` por OUTBOX (misma transacción) con los costos,
   * para que inventario registre las ENTRADAS al kárdex. Retorna null si no existe o ya recibida.
   */
  recibir(id: string, costos: { codigo: string; costoCentimos: number }[]): Promise<{ numero: string } | null>;
}

/** Cola de optimización: el cálculo corre FUERA de la petición web (TDR §3.1). */
export const COLA_OPTIMIZACION = Symbol('ColaOptimizacion');
export interface ColaOptimizacion {
  encolar(ordenCorteId: string): Promise<void>;
}

/** Vidrio a medida que llega de una venta del POS y pasa al área de cortes. */
export interface VidrioVendido {
  readonly codigo: string;
  readonly nombre: string;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
}

export interface CorteVentaVista {
  readonly id: string;
  readonly ventaNumero: string;
  readonly productoCodigo: string;
  readonly productoNombre: string;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
  readonly estado: 'PENDIENTE' | 'CORTADO';
  readonly creadoEn: Date;
}

/** Cola de cortes que vienen de ventas (vidrio a medida del mostrador). */
export const CORTE_VENTA_REPOSITORIO = Symbol('CorteVentaRepositorio');
export interface CorteVentaRepositorio {
  /** Idempotente: si ya existen cortes de esa venta, no los duplica (el outbox puede reintentar). */
  crearDesdeVenta(ventaNumero: string, vidrios: VidrioVendido[]): Promise<void>;
  listarPendientes(): Promise<CorteVentaVista[]>;
  marcarCortado(id: string): Promise<boolean>;
}
