export interface DiaVentas {
  readonly fecha: string;
  readonly ventasCentimos: number;
  readonly tickets: number;
}

export interface EstadoPorCobrar {
  readonly totalCentimos: number;
  readonly cuentas: number;
  readonly vencidasCentimos: number;
  readonly vencidas: number;
}

export interface RankingProducto {
  readonly nombre: string;
  readonly importeCentimos: number;
  readonly unidades: number;
}

export interface RankingVendedor {
  readonly nombre: string;
  readonly importeCentimos: number;
  readonly tickets: number;
}

export interface ObraConCostos {
  readonly obraCodigo: string;
  readonly cliente: string;
  readonly contratadoCentimos: number;
  readonly costosPersonalCentimos: number;
}

export interface AlertaStock {
  readonly codigo: string;
  readonly nombre: string;
  readonly saldo: number;
  readonly minimo: number;
}

export interface AlertaPagoVencido {
  readonly cliente: string;
  readonly numeroVenta: string;
  readonly saldoCentimos: number;
  readonly venceEn: Date;
}

export interface AlertaObraAtrasada {
  readonly codigo: string;
  readonly cliente: string;
  readonly estado: string;
  readonly dias: number;
}

export const REPORTES_REPOSITORIO = Symbol('ReportesRepositorio');
export interface ReportesRepositorio {
  /** Acumula una venta confirmada en el resumen del día (CQRS ligero, vía evento). */
  acumularVenta(fecha: string, totalCentimos: number): Promise<void>;
  hayResumen(): Promise<boolean>;
  /** Reconstruye el resumen desde la tabla Venta (primera vez / recuperación). */
  reconstruirResumen(): Promise<void>;
  resumenDias(fechas: string[]): Promise<DiaVentas[]>;
  ventasDelMes(prefijoMes: string): Promise<{ ventasCentimos: number; tickets: number }>;

  porCobrar(ahora: Date): Promise<EstadoPorCobrar>;
  desperdiciosPct(): Promise<number[]>;
  rankingProductos(limite: number): Promise<RankingProducto[]>;
  rankingVendedores(limite: number): Promise<RankingVendedor[]>;
  obrasConCostos(): Promise<ObraConCostos[]>;

  alertasStockMinimo(): Promise<AlertaStock[]>;
  pagosVencidos(ahora: Date): Promise<AlertaPagoVencido[]>;
  obrasAtrasadas(ahora: Date, diasUmbral: number): Promise<AlertaObraAtrasada[]>;
}
