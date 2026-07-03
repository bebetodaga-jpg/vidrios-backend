import { calcularResumenPagos, validarPago, validarPersonal } from './personal.calculos';

describe('validarPersonal', () => {
  it('acepta personal con nombre, DNI de 8 dígitos y especialidad válida', () => {
    expect(validarPersonal('Pedro Quispe', '45678901', 'CORTADOR').exito).toBe(true);
  });

  it('rechaza DNI que no tiene 8 dígitos', () => {
    const r = validarPersonal('Pedro Quispe', '1234', 'CORTADOR');
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('DNI_INVALIDO');
  });

  it('rechaza especialidad desconocida', () => {
    const r = validarPersonal('Pedro Quispe', '45678901', 'GASFITERO');
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('ESPECIALIDAD_INVALIDA');
  });
});

describe('validarPago (planilla)', () => {
  it('acepta un destajo con monto entero positivo y concepto', () => {
    expect(validarPago(15_000, 'DESTAJO', 'Destajo corte OB-0048').exito).toBe(true);
  });

  it('rechaza monto cero o decimal', () => {
    expect(validarPago(0, 'PAGO', 'Semana 3').exito).toBe(false);
    expect(validarPago(100.5, 'PAGO', 'Semana 3').exito).toBe(false);
  });

  it('rechaza tipo de pago desconocido y concepto vacío', () => {
    expect(validarPago(10_000, 'BONO', 'x').exito).toBe(false);
    expect(validarPago(10_000, 'ADELANTO', '  ').exito).toBe(false);
  });
});

describe('calcularResumenPagos', () => {
  it('desglosa por tipo y suma el total', () => {
    const r = calcularResumenPagos([
      { tipo: 'ADELANTO', montoCentimos: 20_000 },
      { tipo: 'DESTAJO', montoCentimos: 15_000 },
      { tipo: 'DESTAJO', montoCentimos: 10_000 },
      { tipo: 'PAGO', montoCentimos: 50_000 },
    ]);
    expect(r).toEqual({
      totalCentimos: 95_000,
      adelantosCentimos: 20_000,
      pagosCentimos: 50_000,
      destajosCentimos: 25_000,
      cantidadPagos: 4,
    });
  });

  it('con lista vacía todo es cero', () => {
    expect(calcularResumenPagos([]).totalCentimos).toBe(0);
  });
});
