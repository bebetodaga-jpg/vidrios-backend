import { VidrioCotizar, calcularItem } from './cotizador.calculos';

const crudo6: VidrioCotizar = { codigo: '7750001', nombre: 'Crudo 6 mm', precioCentimos: 450, unidad: 'PIE2', grosorMm: 6, templado: false };
const templado10: VidrioCotizar = { codigo: '7750004', nombre: 'Templado 10 mm', precioCentimos: 15_500, unidad: 'M2', grosorMm: 10, templado: true };
const crudo8: VidrioCotizar = { codigo: '7750002', nombre: 'Crudo 8 mm', precioCentimos: 600, unidad: 'PIE2', grosorMm: 8, templado: false };

describe('calcularItem (cotizador ★)', () => {
  it('corrediza 1500×1200 mm con crudo 6 mm natural: despiece y precio deterministas', () => {
    const r = calcularItem('corrediza', crudo6, 'natural', 1500, 1200, 1);
    expect(r.exito).toBe(true);
    if (r.exito) {
      // Aluminio: 1500+1500+2400+3000+4800 = 13200 mm = 13.2 m
      expect(r.valor.metrosLinealesAluminio).toBeCloseTo(13.2, 2);
      // Paños: 2 × (720 × 1140) = 1.6416 m²
      expect(r.valor.m2Vidrio).toBeCloseTo(1.64, 2);
      // Descuento de fabricación aplicado en el paño: 1500/2−30 = 720, 1200−60 = 1140
      expect(r.valor.despiece.panos[0]).toMatchObject({ cantidad: 2, anchoMm: 720, altoMm: 1140 });
      expect(r.valor.unitCentimos).toBeGreaterThan(0);
      expect(r.valor.totalCentimos).toBe(r.valor.unitCentimos);
    }
  });

  it('multiplica por cantidad', () => {
    const r = calcularItem('corrediza', crudo6, 'natural', 1500, 1200, 3);
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor.totalCentimos).toBe(r.valor.unitCentimos * 3);
  });

  it('mampara exige vidrio templado (rechaza crudo)', () => {
    const r = calcularItem('mampara', crudo6, 'natural', 2400, 2100, 1);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('EXIGE_TEMPLADO');
  });

  it('spider exige templado de 10 mm (rechaza 8 mm crudo)', () => {
    const r = calcularItem('spider', crudo8, 'natural', 2000, 2000, 1);
    expect(r.exito).toBe(false);
  });

  it('spider con templado 10 mm: incluye 4 arañas como accesorio extra', () => {
    const r = calcularItem('spider', templado10, 'natural', 2000, 2000, 1);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.despiece.accesoriosExtra[0]).toMatchObject({ cantidad: 4 });
      expect(r.valor.despiece.perfiles).toHaveLength(0);
    }
  });

  it('el color negro encarece el aluminio (+10%) frente al natural', () => {
    const nat = calcularItem('corrediza', crudo6, 'natural', 1500, 1200, 1);
    const neg = calcularItem('corrediza', crudo6, 'negro', 1500, 1200, 1);
    expect(nat.exito && neg.exito).toBe(true);
    if (nat.exito && neg.exito) expect(neg.valor.unitCentimos).toBeGreaterThan(nat.valor.unitCentimos);
  });

  it('vitrovén calcula 1 paleta cada 150 mm de alto', () => {
    const r = calcularItem('vitroven', crudo6, 'natural', 1000, 900, 1); // 900/150 = 6 paletas
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor.despiece.panos[0].cantidad).toBe(6);
  });

  it('rechaza modelo inexistente', () => {
    const r = calcularItem('inexistente', crudo6, 'natural', 1000, 1000, 1);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('MODELO_NO_EXISTE');
  });
});
