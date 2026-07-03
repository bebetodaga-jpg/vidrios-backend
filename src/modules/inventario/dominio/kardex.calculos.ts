import { Resultado, fallo, ok } from '@shared/dominio/resultado';

/**
 * Kárdex valorizado por PROMEDIO PONDERADO (funciones puras — estándar §1).
 * Entradas y ajustes positivos recalculan el costo promedio; las salidas
 * valorizan al promedio vigente (no al costo del último ingreso).
 */
export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE = 'AJUSTE',
}

export interface MovimientoDato {
  readonly tipo: TipoMovimiento;
  /** Siempre positiva; el signo lo da el tipo (AJUSTE admite negativo para mermas). */
  readonly cantidad: number;
  /** Costo unitario en céntimos: requerido en ENTRADA/AJUSTE positivo; ignorado en SALIDA. */
  readonly costoCentimos: number;
  readonly referencia: string;
  readonly fecha: Date;
}

export interface FilaKardex extends MovimientoDato {
  readonly saldo: number;
  readonly costoPromedioCentimos: number;
  readonly saldoValorizadoCentimos: number;
}

export function cantidadConSigno(mov: Pick<MovimientoDato, 'tipo' | 'cantidad'>): number {
  return mov.tipo === TipoMovimiento.SALIDA ? -mov.cantidad : mov.cantidad;
}

export function validarMovimiento(mov: MovimientoDato, saldoActual: number): Resultado<MovimientoDato> {
  if (!Number.isInteger(mov.cantidad) || mov.cantidad === 0) {
    return fallo('CANTIDAD_INVALIDA', 'La cantidad debe ser un entero distinto de cero.');
  }
  if (mov.tipo !== TipoMovimiento.AJUSTE && mov.cantidad < 0) {
    return fallo('CANTIDAD_INVALIDA', 'Entradas y salidas se registran con cantidad positiva.');
  }
  if (mov.tipo !== TipoMovimiento.SALIDA && mov.cantidad > 0 && (!Number.isInteger(mov.costoCentimos) || mov.costoCentimos <= 0)) {
    return fallo('COSTO_REQUERIDO', 'Las entradas requieren costo unitario en céntimos.');
  }
  if (mov.referencia.trim().length < 3) {
    return fallo('REFERENCIA_REQUERIDA', 'Todo movimiento debe indicar su documento de referencia.');
  }
  const nuevoSaldo = saldoActual + cantidadConSigno(mov);
  if (nuevoSaldo < 0) {
    return fallo(
      'STOCK_INSUFICIENTE',
      `Stock insuficiente: hay ${String(saldoActual)} y se intenta sacar ${String(mov.cantidad)}.`,
    );
  }
  return ok(mov);
}

/** Reconstruye el kárdex completo (saldo corrido + costo promedio + valorizado) desde los movimientos. */
export function construirKardex(movimientos: readonly MovimientoDato[]): FilaKardex[] {
  let saldo = 0;
  let costoPromedio = 0;

  return movimientos.map((mov) => {
    const delta = cantidadConSigno(mov);
    if (delta > 0) {
      // Ingreso: promedio ponderado entre lo que había y lo que entra.
      const valorizadoPrevio = saldo * costoPromedio;
      saldo += delta;
      costoPromedio = saldo === 0 ? 0 : Math.round((valorizadoPrevio + delta * mov.costoCentimos) / saldo);
    } else {
      // Salida (o merma): sale al costo promedio vigente; el promedio no cambia.
      saldo += delta;
      if (saldo === 0) costoPromedio = 0;
    }
    return {
      ...mov,
      saldo,
      costoPromedioCentimos: costoPromedio,
      saldoValorizadoCentimos: saldo * costoPromedio,
    };
  });
}

export function saldoActual(movimientos: readonly MovimientoDato[]): number {
  return movimientos.reduce((s, mov) => s + cantidadConSigno(mov), 0);
}
