import { ProductoVendible, calcularItem, calcularTotales, ItemCalculado } from './venta.calculos';

const crudo: ProductoVendible = { codigo: '7750001', nombre: 'Crudo 6 mm', unidadVenta: 'PIE2', precioCentimos: 450 };
const templado: ProductoVendible = { codigo: '7750003', nombre: 'Templado 8 mm', unidadVenta: 'M2', precioCentimos: 12_000 };
const garrucha: ProductoVendible = { codigo: '7752001', nombre: 'Garrucha', unidadVenta: 'UNIDAD', precioCentimos: 350 };

const item = (r: ReturnType<typeof calcularItem>): ItemCalculado => {
  if (!r.exito) throw new Error(r.error.mensaje);
  return r.valor;
};

describe('calcularItem (POS)', () => {
  it('crudo 1200×800 mm → 10.33 pie² → S/ 46.50; el vidrio a medida NO descuenta stock contable', () => {
    const i = item(calcularItem(crudo, { codigo: crudo.codigo, cantidad: 1, anchoMm: 1200, altoMm: 800 }));
    expect(i.importeCentimos).toBe(4_650);
    expect(i.descuentaStock).toBe(false);
  });

  it('templado 1200×800 mm → 0.96 m² → S/ 115.20', () => {
    const i = item(calcularItem(templado, { codigo: templado.codigo, cantidad: 1, anchoMm: 1200, altoMm: 800 }));
    expect(i.importeCentimos).toBe(11_520);
  });

  it('garrucha ×4 → S/ 14.00 y SÍ descuenta stock', () => {
    const i = item(calcularItem(garrucha, { codigo: garrucha.codigo, cantidad: 4 }));
    expect(i.importeCentimos).toBe(1_400);
    expect(i.descuentaStock).toBe(true);
  });

  it('exige medidas para vidrio', () => {
    const r = calcularItem(crudo, { codigo: crudo.codigo, cantidad: 1 });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('MEDIDA_REQUERIDA');
  });
});

describe('calcularTotales (descuento autorizado)', () => {
  const items = [item(calcularItem(garrucha, { codigo: garrucha.codigo, cantidad: 4 }))];

  it('sin descuento: total = subtotal', () => {
    const r = calcularTotales(items, 0, false);
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor).toEqual({ subtotalCentimos: 1_400, totalCentimos: 1_400 });
  });

  it('descuento sin gerente → rechazado (regla del dueño)', () => {
    const r = calcularTotales(items, 10, false);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('DESCUENTO_NO_AUTORIZADO');
  });

  it('descuento 10% autorizado por gerente → S/ 12.60 (sin tope de negocio)', () => {
    const r = calcularTotales(items, 10, true);
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor.totalCentimos).toBe(1_260);
  });

  it('rechaza venta vacía', () => {
    const r = calcularTotales([], 0, false);
    expect(r.exito).toBe(false);
  });
});
