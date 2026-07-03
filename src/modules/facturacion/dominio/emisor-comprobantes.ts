import { TipoComprobante } from './comprobante.calculos';

/**
 * PUERTO hacia el PSE (NubeFact). Cambiar a Bizlinks/eFact = otro adaptador, sin tocar el negocio (ADR-006).
 *
 * Contrato de errores:
 *  - retorna { aceptado:false, motivoRechazo } → SUNAT rechazó (terminal, RECHAZADO).
 *  - LANZA ErrorPseNoDisponible → el PSE no respondió (transitorio → reintento por la cola = contingencia).
 */
export const EMISOR_COMPROBANTES = Symbol('EmisorComprobantes');

export interface DatosEmision {
  readonly tipo: TipoComprobante;
  readonly numero: string;
  readonly cliente: { tipoDoc: string; numeroDoc?: string; nombre: string };
  readonly gravadaCentimos: number;
  readonly igvCentimos: number;
  readonly totalCentimos: number;
}

export interface RespuestaEmision {
  readonly aceptado: boolean;
  readonly cdrHash?: string;
  readonly enlacePdf?: string;
  readonly motivoRechazo?: string;
}

export interface EmisorComprobantes {
  emitir(datos: DatosEmision): Promise<RespuestaEmision>;
}

/** El PSE no respondió: la cola reintenta; el comprobante queda PENDIENTE (contingencia). */
export class ErrorPseNoDisponible extends Error {
  constructor(mensaje = 'El proveedor de facturación (PSE) no responde.') {
    super(mensaje);
    this.name = 'ErrorPseNoDisponible';
  }
}
