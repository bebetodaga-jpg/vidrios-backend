import { TipoMedida } from './medida.calculos';
import { EstadoObra } from './obra-estado.calculos';

export interface ObraResumen {
  readonly id: string;
  readonly codigo: string;
  readonly cliente: string;
  readonly direccion: string;
  readonly estado: string;
  readonly vanos: number;
  readonly creadoEn: Date;
}

export interface MedidaVista {
  readonly id: string;
  readonly tipo: string;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly autor: string;
  readonly creadoEn: Date;
}

export interface VanoVista {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly cantidad: number;
  readonly tieneDetalle: boolean;
  readonly fotoUrl: string | null;
  readonly medidaActual: { anchoMm: number; altoMm: number } | null;
  readonly medidas: MedidaVista[];
}

export interface AmbienteVista {
  readonly id: string;
  readonly nombre: string;
  readonly vanos: VanoVista[];
}

export interface ObraDetalle {
  readonly id: string;
  readonly codigo: string;
  readonly cliente: string;
  readonly direccion: string;
  readonly estado: string;
  readonly ambientes: AmbienteVista[];
}

export interface VanoSync {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly cantidad: number;
  readonly tieneDetalle: boolean;
  readonly fotoUrl?: string;
  readonly medidas: { id: string; tipo: TipoMedida; anchoMm: number; altoMm: number }[];
}

export const OBRAS_REPOSITORIO = Symbol('ObrasRepositorio');

export interface ObrasRepositorio {
  clienteExiste(clienteId: string): Promise<boolean>;
  crearObra(clienteId: string, direccion: string): Promise<{ id: string; codigo: string }>;
  listar(): Promise<ObraResumen[]>;
  detalle(obraId: string): Promise<ObraDetalle | null>;
  agregarAmbiente(obraId: string, nombre: string): Promise<{ id: string } | null>;
  agregarVano(ambienteId: string, vano: Omit<VanoSync, 'medidas'>): Promise<{ id: string } | null>;
  /** Cantidad de medidas del vano; null si el vano no existe. */
  contarMedidas(vanoId: string): Promise<number | null>;
  /** De una lista de ids de medida, cuáles YA existen (para distinguir re-sync de remetreo nuevo). */
  medidasExistentes(ids: string[]): Promise<Set<string>>;
  registrarMedida(vanoId: string, tipo: TipoMedida, anchoMm: number, altoMm: number, autorId: string): Promise<void>;
  /**
   * Sincronización offline IDEMPOTENTE: upsert de vanos y medidas por el id que generó el
   * dispositivo (UUID). Re-enviar el mismo lote no duplica nada.
   */
  sincronizar(ambienteId: string, vanos: VanoSync[], autorId: string): Promise<{ vanos: number; medidas: number } | null>;
  /** Estado actual de la obra (máquina de estados); null si no existe. */
  estadoObra(obraId: string): Promise<EstadoObra | null>;
  cambiarEstadoObra(obraId: string, nuevo: EstadoObra): Promise<void>;
}
