/**
 * Cierre CIEGO de caja (funciones puras). Reglas del dueño (junio 2026):
 * tolerancia ±S/ 5.00; la cajera declara sin ver lo esperado; el reporte
 * de diferencias es exclusivo del GERENTE.
 */
export const TOLERANCIA_CENTIMOS = 500; // ±S/ 5.00

export type MetodoCaja = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';

export interface MovimientoCajaDato {
  readonly metodo: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'CREDITO';
  readonly montoCentimos: number; // con signo: egresos negativos
}

export interface EsperadoPorMetodo {
  readonly EFECTIVO: number;
  readonly TARJETA: number;
  readonly YAPE_PLIN: number;
}

/** Esperado por método: la apertura solo afecta al efectivo. El CRÉDITO no toca caja. */
export function esperadoPorMetodo(
  montoInicialCentimos: number,
  movimientos: readonly MovimientoCajaDato[],
): EsperadoPorMetodo {
  const suma = (metodo: MetodoCaja): number =>
    movimientos.filter((m) => m.metodo === metodo).reduce((s, m) => s + m.montoCentimos, 0);
  return {
    EFECTIVO: montoInicialCentimos + suma('EFECTIVO'),
    TARJETA: suma('TARJETA'),
    YAPE_PLIN: suma('YAPE_PLIN'),
  };
}

export type EstadoDiferencia = 'CUADRA' | 'DIFERENCIA_MENOR' | 'REVISAR';

export interface FilaCierre {
  readonly metodo: MetodoCaja;
  readonly esperadoCentimos: number;
  readonly declaradoCentimos: number;
  readonly diferenciaCentimos: number; // declarado − esperado (faltante negativo)
  readonly estado: EstadoDiferencia;
}

export interface DeclaracionCierre {
  readonly efectivoCentimos: number;
  readonly tarjetaCentimos: number;
  readonly yapeCentimos: number;
}

export function evaluarCierre(esperado: EsperadoPorMetodo, declarado: DeclaracionCierre): FilaCierre[] {
  const fila = (metodo: MetodoCaja, esp: number, dec: number): FilaCierre => {
    const diferencia = dec - esp;
    const estado: EstadoDiferencia =
      diferencia === 0 ? 'CUADRA' : Math.abs(diferencia) <= TOLERANCIA_CENTIMOS ? 'DIFERENCIA_MENOR' : 'REVISAR';
    return { metodo, esperadoCentimos: esp, declaradoCentimos: dec, diferenciaCentimos: diferencia, estado };
  };
  return [
    fila('EFECTIVO', esperado.EFECTIVO, declarado.efectivoCentimos),
    fila('TARJETA', esperado.TARJETA, declarado.tarjetaCentimos),
    fila('YAPE_PLIN', esperado.YAPE_PLIN, declarado.yapeCentimos),
  ];
}

/** Estado de una cuenta por cobrar (créditos a 15 días — regla del dueño). */
export type EstadoCredito = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';

export function estadoCredito(venceEn: Date, hoy: Date, diasAviso = 3): EstadoCredito {
  const msPorDia = 86_400_000;
  const diasRestantes = Math.floor((venceEn.getTime() - hoy.getTime()) / msPorDia);
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= diasAviso) return 'POR_VENCER';
  return 'VIGENTE';
}
