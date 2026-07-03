import { CorteSerie25, VidrioSerie25, despiezarSerie25 } from './serie25.calculos';

/** Busca el/los cortes de un perfil con un largo dado (redondeado). */
const corteDe = (cortes: CorteSerie25[], perfil: string, largoMm: number): CorteSerie25 | undefined =>
  cortes.find((c) => c.perfil === perfil && Math.abs(c.largoMm - largoMm) < 0.01);
const vidrioDe = (vidrios: VidrioSerie25[], anchoMm: number): VidrioSerie25 | undefined =>
  vidrios.find((v) => Math.abs(v.anchoMm - anchoMm) < 0.01);

describe('despiezarSerie25 (réplica de SERIE25_V5.xlsx)', () => {
  it('2 hojas: 992×1235 reproduce riel, zócalo, cabezal, parante, traslapo y vidrio', () => {
    const d = despiezarSerie25('DOS_HOJAS', 992, 1235, 1);
    expect(d.areaM2).toBeCloseTo(1.22512, 4);
    expect(corteDe(d.cortes, 'RIEL SUPERIOR', 976)?.cantidad).toBe(1);
    expect(corteDe(d.cortes, 'RIEL INFERIOR', 976)?.cantidad).toBe(1);
    expect(corteDe(d.cortes, 'JAMBA', 1235)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'ZOCALO', 497)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'CABEZAL', 499)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'PARANTE', 1202)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'TRASLAPO', 1202)?.cantidad).toBe(2);
    const vidrio = vidrioDe(d.vidrios, 436);
    expect(vidrio?.altoMm).toBe(1112);
    expect(vidrio?.cantidad).toBe(2);
  });

  it('3 hojas: 3000×1500 reproduce los dos anchos de vidrio y los perfiles', () => {
    const d = despiezarSerie25('TRES_HOJAS', 3000, 1500, 1);
    expect(corteDe(d.cortes, 'RIEL SUPERIOR', 2983)?.cantidad).toBe(1);
    expect(corteDe(d.cortes, 'ZOCALO', 1013)?.cantidad).toBe(3);
    expect(corteDe(d.cortes, 'CABEZAL', 1015)?.cantidad).toBe(3);
    expect(corteDe(d.cortes, 'PARANTE', 1467)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'TRASLAPO', 1467)?.cantidad).toBe(4);
    expect(vidrioDe(d.vidrios, 959)?.cantidad).toBe(1); // hoja central
    expect(vidrioDe(d.vidrios, 949)?.cantidad).toBe(2); // hojas laterales
    expect(vidrioDe(d.vidrios, 959)?.altoMm).toBe(1375);
  });

  it('4 hojas: 2000×2000 suma los zócalos/cabezales de largos distintos en varillas', () => {
    const d = despiezarSerie25('CUATRO_HOJAS', 2000, 2000, 1);
    expect(corteDe(d.cortes, 'ZOCALO', 507)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'ZOCALO', 510)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'CABEZAL', 509)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'PARANTE', 1967)?.cantidad).toBe(4);
    expect(corteDe(d.cortes, 'ADAPTADOR', 1967)?.cantidad).toBe(1);
    expect(corteDe(d.cortes, 'TRASLAPO', 1967)?.cantidad).toBe(4);
    const vidrio = vidrioDe(d.vidrios, 441);
    expect(vidrio?.altoMm).toBe(1878);
    expect(vidrio?.cantidad).toBe(4);
    // Varilla PARANTE: 4×1967 = 7.868 m → 2 varillas de 6 m, sobran 4.132.
    const parante = d.varillas.find((v) => v.perfil === 'PARANTE');
    expect(parante?.metros).toBeCloseTo(7.868, 3);
    expect(parante?.varillas).toBe(2);
    expect(parante?.sobranteM).toBeCloseTo(4.132, 3);
  });

  it('6 hojas: 1081×1000 reproduce zócalos de 4+2 piezas y los dos vidrios', () => {
    const d = despiezarSerie25('SEIS_HOJAS', 1081, 1000, 1);
    expect(corteDe(d.cortes, 'ZOCALO', 192.1667)?.cantidad).toBe(4);
    expect(corteDe(d.cortes, 'ZOCALO', 211.1667)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'TRASLAPO', 967)?.cantidad).toBe(6);
    expect(corteDe(d.cortes, 'ADAPTADOR', 967)?.cantidad).toBe(1);
    expect(vidrioDe(d.vidrios, 122.1667)?.cantidad).toBe(4);
    expect(vidrioDe(d.vidrios, 122.1667)?.altoMm).toBe(875);
    expect(vidrioDe(d.vidrios, 142.1667)?.cantidad).toBe(2);
    expect(vidrioDe(d.vidrios, 142.1667)?.altoMm).toBe(908);
  });

  it('3 hojas fijo exterior: 2000×1531 mezcla corredizo + fijo (zócalo 2+1, vidrio corredizo×2 y fijo×1)', () => {
    const d = despiezarSerie25('TRES_HOJAS_FIJO_EXTERIOR', 2000, 1531, 1);
    expect(corteDe(d.cortes, 'ZOCALO', 675.6667)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'ZOCALO', 697.6667)?.cantidad).toBe(1);
    expect(corteDe(d.cortes, 'CABEZAL', 677.6667)?.cantidad).toBe(2);
    expect(corteDe(d.cortes, 'PARANTE', 1498)?.cantidad).toBe(1);
    expect(corteDe(d.cortes, 'TRASLAPO', 1498)?.cantidad).toBe(3);
    expect(vidrioDe(d.vidrios, 616.6667)?.cantidad).toBe(2); // corredizas
    expect(vidrioDe(d.vidrios, 634.6667)?.cantidad).toBe(1); // fija
    // Zócalo total = 2×675.6667 + 1×697.6667 = 2.049 m → 1 varilla de 6 m.
    const zocalo = d.varillas.find((v) => v.perfil === 'ZOCALO');
    expect(zocalo?.metros).toBeCloseTo(2.049, 3);
    expect(zocalo?.varillas).toBe(1);
  });

  it('multiplica por la cantidad de ventanas', () => {
    const una = despiezarSerie25('DOS_HOJAS', 1000, 1000, 1);
    const cinco = despiezarSerie25('DOS_HOJAS', 1000, 1000, 5);
    expect(cinco.cortes[0].cantidad).toBe(una.cortes[0].cantidad * 5);
    expect(cinco.areaM2).toBeCloseTo(una.areaM2 * 5, 4);
  });
});
