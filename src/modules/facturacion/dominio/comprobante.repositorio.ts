import { TipoComprobante } from './comprobante.calculos';

export type EstadoComprobante = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ANULADO';

export interface Comprobante {
  readonly id: string;
  readonly tipo: TipoComprobante;
  readonly numero: string;
  readonly estado: EstadoComprobante;
  readonly clienteNombre: string;
  readonly clienteNumeroDoc: string | null;
  readonly gravadaCentimos: number;
  readonly igvCentimos: number;
  readonly totalCentimos: number;
  readonly cdrHash: string | null;
  readonly enlacePdf: string | null;
  readonly motivoRechazo: string | null;
  readonly creadoEn: Date;
}

export interface NuevoComprobante {
  readonly tipo: TipoComprobante;
  readonly serie: string;
  readonly ventaId: string | null;
  readonly cliente: { tipoDoc: string; numeroDoc?: string; nombre: string };
  readonly gravadaCentimos: number;
  readonly igvCentimos: number;
  readonly totalCentimos: number;
  readonly comprobanteRefId?: string;
}

export interface ResultadoSunat {
  readonly aceptado: boolean;
  readonly cdrHash?: string;
  readonly enlacePdf?: string;
  readonly motivoRechazo?: string;
}

export const COMPROBANTE_REPOSITORIO = Symbol('ComprobanteRepositorio');

export interface ComprobanteRepositorio {
  /** Crea el comprobante en PENDIENTE asignando correlativo de la serie dentro de una transacción. */
  crearPendiente(nuevo: NuevoComprobante): Promise<Comprobante>;
  porId(id: string): Promise<Comprobante | null>;
  comprobanteDeVenta(ventaId: string): Promise<Comprobante | null>;
  /** Aplica la respuesta de SUNAT: ACEPTADO (cdr+pdf) o RECHAZADO (motivo); incrementa intentos. */
  registrarRespuestaSunat(id: string, resultado: ResultadoSunat): Promise<void>;
  marcarAnulado(id: string): Promise<void>;
  listar(): Promise<Comprobante[]>;
}
