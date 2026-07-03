import { DeclaracionCierre, MovimientoCajaDato } from './caja.calculos';

export interface SesionCaja {
  readonly id: string;
  readonly montoInicialCentimos: number;
  readonly abiertaEn: Date;
  readonly cerradaEn: Date | null;
  readonly declarado: DeclaracionCierre | null;
}

export interface CuentaPorCobrarDato {
  readonly id: string;
  readonly cliente: string;
  readonly numeroVenta: string;
  readonly saldoCentimos: number;
  readonly venceEn: Date;
}

export interface MovimientoCajaDetalle {
  readonly creadoEn: Date;
  readonly tipo: string;
  readonly metodo: string;
  readonly concepto: string;
  readonly montoCentimos: number;
}

export const CAJA_REPOSITORIO = Symbol('CajaRepositorio');

export interface CajaRepositorio {
  sesionAbierta(): Promise<SesionCaja | null>;
  abrir(usuarioId: string, montoInicialCentimos: number): Promise<SesionCaja>;
  registrarMovimiento(
    sesionId: string,
    movimiento: { tipo: 'INGRESO' | 'EGRESO' | 'VENTA' | 'COBRO_CREDITO'; metodo: string; concepto: string; montoCentimos: number },
  ): Promise<void>;
  movimientosDe(sesionId: string): Promise<MovimientoCajaDato[]>;
  /** Movimientos detallados de la sesión (caja del día). */
  movimientosDetalle(sesionId: string): Promise<MovimientoCajaDetalle[]>;
  cerrar(sesionId: string, declarado: DeclaracionCierre): Promise<void>;
  sesionPorId(sesionId: string): Promise<SesionCaja | null>;
  crearCuentaPorCobrar(ventaNumero: string, clienteId: string, montoCentimos: number, venceEn: Date): Promise<void>;
  cuentasPorCobrar(): Promise<CuentaPorCobrarDato[]>;
  /** Reduce el saldo de la cuenta; retorna el saldo restante o null si no existe. */
  aplicarCobro(cuentaId: string, montoCentimos: number): Promise<number | null>;
}
