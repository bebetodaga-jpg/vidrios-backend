import { Despiece } from './modelos';
import { VidrioCotizar } from './cotizador.calculos';

export const CATALOGO_COTIZACIONES = Symbol('CatalogoCotizaciones');
export interface CatalogoCotizaciones {
  vidrio(codigo: string): Promise<VidrioCotizar | null>;
}

export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA';

export interface ItemPersistir {
  readonly vanoCodigo: string;
  readonly modelo: string;
  readonly vidrioCodigo: string;
  readonly vidrioNombre: string;
  readonly color: string;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
  readonly unitCentimos: number;
  readonly totalCentimos: number;
  readonly despiece: Despiece;
}

export interface CotizacionResumen {
  readonly id: string;
  readonly numero: string;
  readonly estado: EstadoCotizacion;
  readonly cliente: string | null;
  readonly totalCentimos: number;
  readonly items: number;
  readonly creadoEn: Date;
}

export interface CotizacionDetalle extends CotizacionResumen {
  readonly itemsDetalle: ItemPersistir[];
}

export const COTIZACION_REPOSITORIO = Symbol('CotizacionRepositorio');
export interface CotizacionRepositorio {
  crear(items: ItemPersistir[], totalCentimos: number, clienteId?: string, obraId?: string): Promise<{ id: string; numero: string }>;
  listar(): Promise<CotizacionResumen[]>;
  detalle(id: string): Promise<CotizacionDetalle | null>;
  /** Cambia el estado; retorna false si la transición es inválida o la cotización no existe. */
  cambiarEstado(id: string, nuevo: EstadoCotizacion): Promise<boolean>;
}
