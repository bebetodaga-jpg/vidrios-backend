import { MovimientoDato } from './kardex.calculos';

export const KARDEX_REPOSITORIO = Symbol('KardexRepositorio');

export interface SaldoProducto {
  readonly codigo: string;
  readonly saldo: number;
}

export interface KardexRepositorio {
  /** Inserta un movimiento (el kárdex es inmutable: nunca update/delete). */
  registrar(codigoProducto: string, movimiento: MovimientoDato): Promise<void>;
  /** Movimientos en orden cronológico; null si el producto no existe. */
  movimientosDe(codigoProducto: string): Promise<MovimientoDato[] | null>;
  /** Saldo actual por producto (suma del kárdex), para el semáforo de stock del catálogo. */
  saldos(): Promise<SaldoProducto[]>;
}
