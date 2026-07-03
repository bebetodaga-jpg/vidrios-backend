import { DespieceDeItem, cubicar } from './cubicacion.calculos';

const itemCorrediza: DespieceDeItem = {
  cantidadItem: 2,
  vidrioCodigo: '7750001',
  vidrioNombre: 'Crudo 6 mm',
  perfiles: [
    { nombre: 'Riel superior', cantidad: 1, largoCm: 150 },
    { nombre: 'Jamba lateral', cantidad: 2, largoCm: 120 },
  ],
  panos: [{ cantidad: 2, anchoCm: 72, altoCm: 114 }],
  accesoriosExtra: [],
};

describe('cubicar (lista de materiales vs stock)', () => {
  it('consolida vidrio en m² y estima planchas; cruza contra stock', () => {
    // 2 ítems × 2 paños × 0.8208 m² = 3.2832 m² → 1 plancha de 4.32 m²; stock 0 → falta 1
    const c = cubicar([itemCorrediza], new Map());
    expect(c.vidrios[0]).toMatchObject({ codigo: '7750001', m2: 3.28, planchasEstimadas: 1, stockPlanchas: 0, faltantePlanchas: 1 });
  });

  it('con stock suficiente no hay faltante', () => {
    const c = cubicar([itemCorrediza], new Map([['7750001', 5]]));
    expect(c.vidrios[0].faltantePlanchas).toBe(0);
  });

  it('consolida perfiles por nombre en metros lineales y barrillas de 6 m', () => {
    // Riel: 1×150×2 = 300 cm = 3 m → 1 barrilla; Jamba: 2×120×2 = 480 cm = 4.8 m → 1 barrilla
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
      panos: [{ cantidad: 1, anchoCm: 100, altoCm: 100 }],
      accesoriosExtra: [{ nombre: 'Araña spider', cantidad: 4 }],
    };
    const c = cubicar([spider], new Map());
    expect(c.accesorios[0]).toEqual({ nombre: 'Araña spider', cantidad: 12 });
  });
});
