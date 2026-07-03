import { cronograma, validarPago } from './contrato.calculos';

describe('cronograma de pagos', () => {
  it('60% de adelanto sobre S/ 1000: adelanto 600, saldo 400', () => {
    const r = cronograma(100_000, 60);
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor).toEqual({ adelantoCentimos: 60_000, saldoCentimos: 40_000 });
  });

  it('el adelanto + saldo siempre suma el total (redondeo)', () => {
    const r = cronograma(166_722, 60);
    if (r.exito) expect(r.valor.adelantoCentimos + r.valor.saldoCentimos).toBe(166_722);
  });

  it('rechaza adelanto fuera de 0–100', () => {
    expect(cronograma(100_000, 120).exito).toBe(false);
  });
});

describe('validarPago (cobros contra el saldo)', () => {
  it('acepta un adelanto dentro del total', () => {
    expect(validarPago(60_000, 100_000, 0).exito).toBe(true);
  });

  it('acepta el saldo que completa el total', () => {
    expect(validarPago(40_000, 100_000, 60_000).exito).toBe(true);
  });

  it('rechaza un pago que excede el saldo', () => {
    const r = validarPago(50_000, 100_000, 60_000);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('SALDO_EXCEDIDO');
  });

  it('rechaza monto no positivo', () => {
    expect(validarPago(0, 100_000, 0).exito).toBe(false);
  });
});
