import {
  TipoMovimiento,
  construirKardex,
  saldoActual,
  validarMovimiento,
  MovimientoDato,
} from './kardex.calculos';

const mov = (tipo: TipoMovimiento, cantidad: number, costoCentimos = 0, referencia = 'Doc de prueba'): MovimientoDato => ({
  tipo,
  cantidad,
  costoCentimos,
  referencia,
  fecha: new Date('2026-06-10'),
});

describe('construirKardex (promedio ponderado)', () => {
  it('valoriza una entrada simple', () => {
    const filas = construirKardex([mov(TipoMovimiento.AJUSTE, 10, 4_000, 'Inventario inicial')]);
    expect(filas[0]).toMatchObject({ saldo: 10, costoPromedioCentimos: 4_000, saldoValorizadoCentimos: 40_000 });
  });

  it('promedia dos ingresos a costos distintos: 10 a S/40 + 5 a S/46 → promedio S/42', () => {
    const filas = construirKardex([
      mov(TipoMovimiento.AJUSTE, 10, 4_000, 'Inventario inicial'),
      mov(TipoMovimiento.ENTRADA, 5, 4_600, 'Compra OC-0012'),
    ]);
    expect(filas[1].saldo).toBe(15);
    expect(filas[1].costoPromedioCentimos).toBe(4_200);
    expect(filas[1].saldoValorizadoCentimos).toBe(63_000);
  });

  it('la salida descuenta al promedio vigente sin alterarlo', () => {
    const filas = construirKardex([
      mov(TipoMovimiento.AJUSTE, 10, 4_000, 'Inventario inicial'),
      mov(TipoMovimiento.ENTRADA, 5, 4_600, 'Compra OC-0012'),
      mov(TipoMovimiento.SALIDA, 3, 0, 'Venta NV-000231'),
    ]);
    expect(filas[2]).toMatchObject({ saldo: 12, costoPromedioCentimos: 4_200, saldoValorizadoCentimos: 50_400 });
  });

  it('saldoActual suma con signo', () => {
    expect(
      saldoActual([
        mov(TipoMovimiento.AJUSTE, 10, 4_000),
        mov(TipoMovimiento.SALIDA, 3),
        mov(TipoMovimiento.AJUSTE, -2, 0, 'Merma por rotura'),
      ]),
    ).toBe(5);
  });
});

describe('validarMovimiento (reglas del kárdex)', () => {
  it('rechaza sacar más stock del que hay', () => {
    const r = validarMovimiento(mov(TipoMovimiento.SALIDA, 5), 2);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('STOCK_INSUFICIENTE');
  });

  it('exige costo en las entradas', () => {
    const r = validarMovimiento(mov(TipoMovimiento.ENTRADA, 5, 0), 0);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('COSTO_REQUERIDO');
  });

  it('permite ajuste negativo (merma) si hay saldo', () => {
    const r = validarMovimiento(mov(TipoMovimiento.AJUSTE, -2, 0, 'Rotura en taller'), 5);
    expect(r.exito).toBe(true);
  });

  it('exige referencia documental', () => {
    const r = validarMovimiento(mov(TipoMovimiento.ENTRADA, 5, 4_000, ''), 0);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('REFERENCIA_REQUERIDA');
  });
});
