import { avanzarEstadoObra } from './obra-estado.calculos';

describe('máquina de estados de la obra', () => {
  it('avanza una etapa a la vez', () => {
    expect(avanzarEstadoObra('MEDICION', 'REMETREO').exito).toBe(true);
    expect(avanzarEstadoObra('REMETREO', 'CORTE').exito).toBe(true);
    expect(avanzarEstadoObra('INSTALACION', 'ENTREGADA').exito).toBe(true);
  });

  it('NO se corta sin remetreo (no salta etapas)', () => {
    const r = avanzarEstadoObra('MEDICION', 'CORTE');
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('TRANSICION_INVALIDA');
  });

  it('no retrocede', () => {
    expect(avanzarEstadoObra('CORTE', 'REMETREO').exito).toBe(false);
  });

  it('no avanza desde ENTREGADA', () => {
    expect(avanzarEstadoObra('ENTREGADA', 'ENTREGADA').exito).toBe(false);
  });
});
