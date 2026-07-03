import { calcularMargen, fechaLocal, promedioDesperdicio, ultimosDias } from './reportes.calculos';

describe('fechaLocal y ultimosDias', () => {
  it('formatea la fecha local YYYY-MM-DD con ceros', () => {
    expect(fechaLocal(new Date(2026, 5, 3))).toBe('2026-06-03');
  });

  it('los últimos 3 días terminan hoy y vienen ascendentes (cruza el mes)', () => {
    expect(ultimosDias(3, new Date(2026, 6, 1))).toEqual(['2026-06-29', '2026-06-30', '2026-07-01']);
  });
});

describe('calcularMargen (contratado vs. costos registrados)', () => {
  it('S/ 1000 contratado con S/ 350 de costos → margen S/ 650 (65%)', () => {
    expect(calcularMargen(100_000, 35_000)).toEqual({ margenCentimos: 65_000, margenPct: 65 });
  });

  it('redondea el % a 1 decimal y soporta margen negativo', () => {
    expect(calcularMargen(30_000, 31_000).margenPct).toBe(-3.3);
  });

  it('sin monto contratado el % es 0 (no divide por cero)', () => {
    expect(calcularMargen(0, 5_000).margenPct).toBe(0);
  });
});

describe('promedioDesperdicio', () => {
  it('promedia a 1 decimal', () => {
    expect(promedioDesperdicio([10, 15, 12.5])).toBe(12.5);
  });

  it('sin órdenes de corte devuelve 0', () => {
    expect(promedioDesperdicio([])).toBe(0);
  });
});
