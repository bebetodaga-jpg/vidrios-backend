import { autorizarMedida, exigeFoto, tipoSiguienteMedida } from './medida.calculos';

describe('versionado de medidas', () => {
  it('la primera medición es INICIAL; las siguientes REMETREO', () => {
    expect(tipoSiguienteMedida(0)).toBe('INICIAL');
    expect(tipoSiguienteMedida(1)).toBe('REMETREO');
    expect(tipoSiguienteMedida(3)).toBe('REMETREO');
  });

  it('cualquiera puede registrar la medida inicial', () => {
    expect(autorizarMedida('INICIAL', 'AYUDANTE').exito).toBe(true);
    expect(autorizarMedida('INICIAL', 'VENDEDORA').exito).toBe(true);
  });

  it('solo gerente y maestro pueden remetrear', () => {
    expect(autorizarMedida('REMETREO', 'GERENTE').exito).toBe(true);
    expect(autorizarMedida('REMETREO', 'MAESTRO').exito).toBe(true);
    const r = autorizarMedida('REMETREO', 'AYUDANTE');
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('REMETREO_NO_AUTORIZADO');
  });

  it('exige foto cuando el vano tiene detalle', () => {
    expect(exigeFoto(false, false).exito).toBe(true);
    expect(exigeFoto(true, true).exito).toBe(true);
    const r = exigeFoto(true, false);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('FOTO_REQUERIDA');
  });
});
