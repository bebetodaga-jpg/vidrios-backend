export const COTIZACION_CONTRATOS = Symbol('CotizacionParaContratos');
export interface CotizacionParaContratos {
  cotizacion(id: string): Promise<{ id: string; numero: string; estado: string; totalCentimos: number; clienteId: string | null; obraId: string | null } | null>;
}

export interface NuevoContrato {
  readonly cotizacionId: string;
  readonly clienteId: string | null;
  readonly obraId: string | null;
  readonly totalCentimos: number;
  readonly adelantoCentimos: number;
  readonly saldoCentimos: number;
  readonly firmaDataUrl?: string;
}

export interface ContratoResumen {
  readonly id: string;
  readonly numero: string;
  readonly estado: string;
  readonly cliente: string | null;
  readonly totalCentimos: number;
  readonly adelantoCentimos: number;
  readonly pagadoCentimos: number;
  readonly saldoPendienteCentimos: number;
  readonly tieneFirma: boolean;
  readonly creadoEn: Date;
}

export interface ContratoDetalle extends ContratoResumen {
  readonly cotizacionNumero: string;
  readonly saldoCentimos: number;
  readonly firmaDataUrl: string | null;
}

export const CONTRATO_REPOSITORIO = Symbol('ContratoRepositorio');
export interface ContratoRepositorio {
  yaTieneContrato(cotizacionId: string): Promise<boolean>;
  crear(nuevo: NuevoContrato): Promise<{ id: string; numero: string }>;
  detalle(id: string): Promise<ContratoDetalle | null>;
  listar(): Promise<ContratoResumen[]>;
  /**
   * Aplica un cobro: incrementa lo pagado y EMITE el evento `pago.contrato.registrado`
   * (vía outbox, misma transacción) para que caja registre el ingreso.
   */
  registrarPago(id: string, montoCentimos: number, metodo: string): Promise<{ pagadoCentimos: number; saldoPendienteCentimos: number }>;
  guardarFirma(id: string, dataUrl: string): Promise<boolean>;
}
