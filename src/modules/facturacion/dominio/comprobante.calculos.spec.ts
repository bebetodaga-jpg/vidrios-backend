import { TipoComprobante, desglosarIgv, validarCliente } from './comprobante.calculos';

describe('desglosarIgv (precio inc. IGV 18%)', () => {
  it('S/ 118.00 → gravada S/ 100.00 + IGV S/ 18.00', () => {
    expect(desglosarIgv(11_800)).toEqual({ gravadaCentimos: 10_000, igvCentimos: 1_800, totalCentimos: 11_800 });
  });

  it('el total siempre = gravada + igv (céntimo de redondeo al IGV)', () => {
    for (const total of [4_650, 11_520, 85_383, 1]) {
      const d = desglosarIgv(total);
      expect(d.gravadaCentimos + d.igvCentimos).toBe(total);
    }
  });
});

describe('validarCliente (reglas SUNAT)', () => {
  const ana = { tipoDoc: 'DNI' as const, numeroDoc: '41222333', nombre: 'GARCÍA FLORES, ANA' };
  const empresa = { tipoDoc: 'RUC' as const, numeroDoc: '20123456789', nombre: 'INMOBILIARIA ANDES SAC' };
  const publico = { tipoDoc: 'SIN_DOCUMENTO' as const, nombre: 'Público general' };

  it('factura sin RUC válido → rechazada', () => {
    const r = validarCliente(TipoComprobante.FACTURA, { ...empresa, numeroDoc: '123' }, 50_000);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('RUC_INVALIDO');
  });

  it('factura con RUC válido → ok', () => {
    expect(validarCliente(TipoComprobante.FACTURA, empresa, 50_000).exito).toBe(true);
  });

  it('boleta < S/700 a público general → ok', () => {
    expect(validarCliente(TipoComprobante.BOLETA, publico, 50_000).exito).toBe(true);
  });

  it('boleta ≥ S/700 sin DNI → rechazada (regla del límite)', () => {
    const r = validarCliente(TipoComprobante.BOLETA, publico, 85_383);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('DNI_REQUERIDO');
  });

  it('boleta ≥ S/700 con DNI → ok', () => {
    expect(validarCliente(TipoComprobante.BOLETA, ana, 85_383).exito).toBe(true);
  });

  it('boleta con DNI mal formado → rechazada', () => {
    const r = validarCliente(TipoComprobante.BOLETA, { tipoDoc: 'DNI', numeroDoc: '123', nombre: 'X' }, 10_000);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('DNI_INVALIDO');
  });
});
