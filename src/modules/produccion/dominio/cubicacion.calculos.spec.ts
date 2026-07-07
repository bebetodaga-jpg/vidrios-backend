import { DespieceDeItem, cubicar } from './cubicacion.calculos';

const itemCorrediza: DespieceDeItem = {
  cantidadItem: 2,
  vidrioCodigo: '7750001',
  vidrioNombre: 'Crudo 6 mm',
  perfiles: [
    { nombre: 'Riel superior', cantidad: 1, largoMm: 1500 },
    { nombre: 'Jamba lateral', cantidad: 2, largoMm: 1200 },
  ],
  panos: [{ cantidad: 2, anchoMm: 720, altoMm: 1140 }],
  accesoriosExtra: [],
};

describe('cubicar (lista de materiales vs stock)', () => {
  it('consolida vidrio en m² y estima planchas; cruza contra stock', () => {
    // 2 ítems × 2 paños × 0.8208 m² = 3.2832 m² → 1 plancha de 7.06 m² (3300×2140 mm); stock 0 → falta 1
    const c = cubicar([itemCorrediza], new Map());
    expect(c.vidrios[0]).toMatchObject({ codigo: '7750001', m2: 3.28, planchasEstimadas: 1, stockPlanchas: 0, faltantePlanchas: 1 });
  });

  it('con stock suficiente no hay faltante', () => {
    const c = cubicar([itemCorrediza], new Map([['7750001', 5]]));
    expect(c.vidrios[0].faltantePlanchas).toBe(0);
  });

  it('consolida perfiles por nombre en metros lineales y barrillas de 6 m', () => {
    // Riel: 1×1500×2 = 3000 mm = 3 m → 1 barrilla; Jamba: 2×1200×2 = 4800 mm = 4.8 m → 1 barrilla
    const c = cubicar([itemCorrediza], new Map());
    const riel = c.perfiles.find((p) => p.nombre === 'Riel superior');
    const jamba = c.perfiles.find((p) => p.nombre === 'Jamba lateral');
    expect(riel).toMatchObject({ metrosLineales: 3, barrillasEstimadas: 1 });
    expect(jamba).toMatchObject({ metrosLineales: 4.8, barrillasEstimadas: 1 });
  });

  it('suma accesorios extra multiplicados por la cantidad del ítem', () => {
    const spider: DespieceDeItem = {
      cantidadItem: 3,
      vidrioCodigo: '7750004',
      vidrioNombre: 'Templado 10',
      perfiles: [],
      panos: [{ cantidad: 1, anchoMm: 1000, altoMm: 1000 }],
      accesoriosExtra: [{ nombre: 'Araña spider', cantidad: 4 }],
    };
    const c = cubicar([spider], new Map());
    expect(c.accesorios[0]).toEqual({ nombre: 'Araña spider', cantidad: 12 });
  });
});
