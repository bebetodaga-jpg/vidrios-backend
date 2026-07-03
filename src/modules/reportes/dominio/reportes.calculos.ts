// Cálculos puros del panel gerencial (S11). Sin framework ni I/O.

/** Fecha local de la tienda en formato YYYY-MM-DD (el resumen diario se acumula por este día). */
export function fechaLocal(momento: Date): string {
  const anio = momento.getFullYear();
  const mes = String(momento.getMonth() + 1).padStart(2, '0');
  const dia = String(momento.getDate()).padStart(2, '0');
  return `${String(anio)}-${mes}-${dia}`;
}

/** Los últimos n días (incluido hoy), ascendente — eje del gráfico de ventas. */
export function ultimosDias(n: number, hoy: Date): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    dias.push(fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)));
  }
  return dias;
}

export interface Margen {
  readonly margenCentimos: number;
  readonly margenPct: number;
}

/** Margen = contratado − costos registrados; el % se redondea a 1 decimal. */
export function calcularMargen(contratadoCentimos: number, costosCentimos: number): Margen {
  const margenCentimos = contratadoCentimos - costosCentimos;
  const margenPct = contratadoCentimos > 0 ? Math.round((margenCentimos / contratadoCentimos) * 1000) / 10 : 0;
  return { margenCentimos, margenPct };
}

/** Promedio de % de desperdicio de las órdenes de corte, a 1 decimal (sin órdenes → 0). */
export function promedioDesperdicio(pcts: number[]): number {
  if (pcts.length === 0) {
    return 0;
  }
  return Math.round((pcts.reduce((s, p) => s + p, 0) / pcts.length) * 10) / 10;
}
