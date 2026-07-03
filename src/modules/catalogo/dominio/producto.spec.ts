import { Dinero } from '@shared/dominio/dinero';
import { Familia, Producto, UnidadVenta } from './producto';
import { calcularImporte } from './precio.calculos';

const precio = (centimos: number): Dinero => {
  const r = Dinero.desdeCentimos(centimos);
  if (!r.exito) throw new Error('precio de prueba inválido');
  return r.valor;
};

const base = {
  id: '1',
  codigo: '7750001',
  nombre: 'Vidrio crudo incoloro 6 mm',
  familia: Familia.VIDRIO,
  subfamilia: 'Crudo',
  unidadVenta: UnidadVenta.PIE2,
  precio: precio(450), // S/ 4.50 por pie²
  stockMinimo: 5,
  grosorMm: 6,
};

describe('Producto (invariantes del catálogo)', () => {
  it('crea un vidrio crudo por pie²', () => {
    const r = Producto.crear(base);
    expect(r.exito).toBe(true);
  });

  it('rechaza vender vidrio crudo por m² (se vende por pie²)', () => {
    const r = Producto.crear({ ...base, unidadVenta: UnidadVenta.M2 });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('UNIDAD_INCOHERENTE');
  });

  it('rechaza vender vidrio templado por pie² (se vende por m²)', () => {
    const r = Producto.crear({ ...base, subfamilia: 'Templado', unidadVenta: UnidadVenta.PIE2 });
    expect(r.exito).toBe(false);
  });

  it('rechaza vidrio sin grosor', () => {
    const r = Producto.crear({ ...base, grosorMm: undefined });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('GROSOR_REQUERIDO');
  });

  it('rechaza precio cero', () => {
    const r = Producto.crear({ ...base, precio: precio(0) });
    expect(r.exito).toBe(false);
  });
});

describe('calcularImporte (funciones puras de precio)', () => {
  const crudo = (() => {
    const r = Producto.crear(base);
    if (!r.exito) throw new Error('producto de prueba inválido');
    return r.valor;
  })();

  const templado = (() => {
    const r = Producto.crear({
      ...base,
      codigo: '7750003',
      nombre: 'Vidrio templado 8 mm',
      subfamilia: 'Templado',
      unidadVenta: UnidadVenta.M2,
      precio: precio(12_000), // S/ 120.00 por m²
      grosorMm: 8,
    });
    if (!r.exito) throw new Error('producto de prueba inválido');
    return r.valor;
  })();

  it('crudo 120×80 cm → 10.33 pie² → S/ 46.50 aprox.', () => {
    const r = calcularImporte(crudo, 1, { anchoCm: 120, altoCm: 80 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.area).toBeCloseTo(10.333, 2);
      expect(r.valor.importe.centimos).toBe(4650); // redondeado al céntimo
    }
  });

  it('templado 120×80 cm → 0.96 m² → S/ 115.20 exactos', () => {
    const r = calcularImporte(templado, 1, { anchoCm: 120, altoCm: 80 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.area).toBeCloseTo(0.96, 5);
      expect(r.valor.importe.centimos).toBe(11_520);
    }
  });

  it('exige medidas para vender vidrio', () => {
    const r = calcularImporte(crudo, 1);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('MEDIDA_REQUERIDA');
  });

  it('acepta cm con 1 decimal (se mide al milímetro)', () => {
    const r = calcularImporte(crudo, 1, { anchoCm: 155.3, altoCm: 185.3 });
    expect(r.exito).toBe(true);
  });

  it('rechaza medidas con más de 1 decimal o negativas', () => {
    expect(calcularImporte(crudo, 1, { anchoCm: 120.55, altoCm: 80 }).exito).toBe(false);
    expect(calcularImporte(crudo, 1, { anchoCm: 120, altoCm: -3 }).exito).toBe(false);
  });

  it('multiplica por cantidad sin perder céntimos', () => {
    const r = calcularImporte(templado, 3, { anchoCm: 100, altoCm: 100 });
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor.importe.centimos).toBe(36_000); // 3 × 1 m² × S/120
  });
});
