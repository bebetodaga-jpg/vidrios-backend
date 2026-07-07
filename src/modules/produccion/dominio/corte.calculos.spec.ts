import { LaminaDisponible, PanoCorte, optimizar1D, optimizar2D, optimizarCorte } from './corte.calculos';

describe('optimizar1D (barrillas, FFD)', () => {
  it('4 rieles de 1500 mm sin kerf → 1 barrilla de 6000 exacta', () => {
    const r = optimizar1D(
      [1, 2, 3, 4].map((i) => ({ nombre: `Riel ${String(i)}`, largoMm: 1500 })),
      6000,
      0,
    );
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.totalBarras).toBe(1);
      expect(r.valor.barras[0].sobranteMm).toBe(0);
      expect(r.valor.desperdicioPct).toBe(0);
    }
  });

  it('con kerf de 5 mm las mismas 4 piezas ya no caben en una barrilla', () => {
    const r = optimizar1D(
      [1, 2, 3, 4].map((i) => ({ nombre: `Riel ${String(i)}`, largoMm: 1500 })),
      6000,
      5,
    );
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor.totalBarras).toBe(2);
  });

  it('rechaza una pieza más larga que la barrilla', () => {
    const r = optimizar1D([{ nombre: 'Jamba', largoMm: 7000 }]);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PIEZA_INVALIDA');
  });
});

describe('optimizar2D (planchas, guillotina por estantes)', () => {
  const panosCorrediza: PanoCorte[] = [
    { etiqueta: 'V-01 paño 1', anchoMm: 720, altoMm: 1140 },
    { etiqueta: 'V-01 paño 2', anchoMm: 720, altoMm: 1140 },
  ];

  it('2 paños de corrediza caben en 1 plancha y generan retazos útiles', () => {
    const r = optimizar2D(panosCorrediza, []);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      expect(r.valor.laminas[0].colocaciones).toHaveLength(2);
      expect(r.valor.laminas[0].sobrantes.length).toBeGreaterThan(0); // franjas ≥ 300 mm
      expect(r.valor.mermaRealPct).toBeLessThan(10); // el sobrante grande es retazo reutilizable, no merma
    }
  });

  it('usa primero el retazo disponible más pequeño que sirva (no abre plancha)', () => {
    const retazos: LaminaDisponible[] = [
      { id: 'R-GRANDE', origen: 'RETAZO', anchoMm: 2000, altoMm: 1500 },
      { id: 'R-CHICO', origen: 'RETAZO', anchoMm: 700, altoMm: 700 },
    ];
    const r = optimizar2D([{ etiqueta: 'Espejo baño', anchoMm: 600, altoMm: 600 }], retazos);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(0);
      expect(r.valor.retazosUsados).toEqual(['R-CHICO']);
    }
  });

  it('rota el paño si solo cabe girado', () => {
    const retazos: LaminaDisponible[] = [{ id: 'R-1', origen: 'RETAZO', anchoMm: 1200, altoMm: 600 }];
    const r = optimizar2D([{ etiqueta: 'Paño', anchoMm: 500, altoMm: 1100 }], retazos);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.retazosUsados).toEqual(['R-1']);
      expect(r.valor.laminas[0].colocaciones[0].rotado).toBe(true);
    }
  });

  it('rechaza un paño que no cabe ni rotado en la plancha estándar', () => {
    const r = optimizar2D([{ etiqueta: 'Vitral gigante', anchoMm: 4000, altoMm: 3000 }], []);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PANO_MUY_GRANDE');
  });

  it('reparte en varias planchas cuando no alcanza una', () => {
    // 8 paños de 1700×1100 en 3300×2140: caben 2 por plancha (2×1700=3400>3300 → 1 a lo ancho; 1100+1100≤2140 → 2 a lo alto).
    const muchos: PanoCorte[] = Array.from({ length: 8 }, (_, i) => ({ etiqueta: `P${String(i + 1)}`, anchoMm: 1700, altoMm: 1100 }));
    const r = optimizar2D(muchos, []);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBeGreaterThanOrEqual(2);
      const colocados = r.valor.laminas.reduce((s, l) => s + l.colocaciones.length, 0);
      expect(colocados).toBe(8);
    }
  });

  it('respeta una plancha de medida personalizada (corte manual)', () => {
    // En una plancha de 1000×1000 solo cabe un paño de 900×900; el segundo abre otra plancha.
    const panos: PanoCorte[] = [
      { etiqueta: 'A', anchoMm: 900, altoMm: 900 },
      { etiqueta: 'B', anchoMm: 900, altoMm: 900 },
    ];
    const r = optimizar2D(panos, [], { anchoMm: 1000, altoMm: 1000 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(2);
      r.valor.laminas.forEach((l) => {
        expect(l.anchoMm).toBe(1000);
        expect(l.altoMm).toBe(1000);
      });
    }
  });

  it('rechaza un paño más grande que la plancha personalizada indicada', () => {
    const r = optimizar2D([{ etiqueta: 'Grande', anchoMm: 1300, altoMm: 900 }], [], { anchoMm: 1200, altoMm: 1200 });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PANO_MUY_GRANDE');
  });

  it('3 piezas chicas en una plancha grande: casi todo el sobrante es retazo reutilizable, no merma', () => {
    // Caso real reportado: plancha 3300×2140, piezas pequeñas → desperdicio bruto alto pero merma real mínima.
    const panos: PanoCorte[] = [
      { etiqueta: 'P1', anchoMm: 580, altoMm: 1070 },
      { etiqueta: 'P2', anchoMm: 580, altoMm: 560 },
      { etiqueta: 'P3', anchoMm: 510, altoMm: 580 },
    ];
    const r = optimizar2D(panos, [], { anchoMm: 3300, altoMm: 2140 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      expect(r.valor.desperdicioPct).toBeGreaterThan(80); // sobrante bruto alto (piezas chicas en plancha grande)
      expect(r.valor.retazoUtilPct).toBeGreaterThan(70); // la mayor parte vuelve como retazo
      expect(r.valor.mermaRealPct).toBeLessThan(10); // lo que de verdad se bota es mínimo
      expect(r.valor.laminas[0].sobrantes.length).toBeGreaterThan(0);
    }
  });

  it('el empaque guillotina aprovecha mejor que rellenar a la ligera (≥ 4 cuadrados de 800 en una plancha estándar)', () => {
    const panos: PanoCorte[] = Array.from({ length: 4 }, (_, i) => ({ etiqueta: `C${String(i + 1)}`, anchoMm: 800, altoMm: 800 }));
    const r = optimizar2D(panos, []);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      expect(r.valor.laminas[0].colocaciones).toHaveLength(4);
    }
  });
});

describe('optimizarCorte (máximo razonamiento, decide solo el mejor aprovechamiento)', () => {
  const mayorRetazo = (p: { laminas: { sobrantes: { anchoMm: number; altoMm: number }[] }[] }): { anchoMm: number; altoMm: number } =>
    p.laminas.flatMap((l) => l.sobrantes).reduce((m, s) => (s.anchoMm * s.altoMm > m.anchoMm * m.altoMm ? s : m), { anchoMm: 0, altoMm: 0 });

  it('caso del maestro: 1200×850, 900×2140 y 1200×890 dejan UN cuadro grande de 2400×1250 (no dos retazos con uno inútil)', () => {
    // El acomodo malo dejaba 1200×2140 + 1200×400 (el 1200×400 es tira inservible). El bueno: 2400×1250.
    const panos: PanoCorte[] = [
      { etiqueta: '1', anchoMm: 1200, altoMm: 850 },
      { etiqueta: '2', anchoMm: 900, altoMm: 2140 },
      { etiqueta: '3', anchoMm: 1200, altoMm: 890 },
    ];
    const r = optimizarCorte(panos, [], { anchoMm: 3300, altoMm: 2140 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      const retazo = mayorRetazo(r.valor);
      expect(retazo.anchoMm).toBe(2400);
      expect(retazo.altoMm).toBe(1250);
      // No debe quedar una tira angosta inservible (lado corto ≤ 400 mm) como retazo grande aparte.
      const utiles = r.valor.laminas.flatMap((l) => l.sobrantes).filter((s) => Math.min(s.anchoMm, s.altoMm) > 400);
      expect(utiles).toHaveLength(1); // un solo retazo aprovechable
    }
  });

  it('5 paños que suman 3300 de ancho salen en UNA tira y dejan un retazo a todo lo ancho (3300)', () => {
    const panos: PanoCorte[] = [
      { etiqueta: 'A', anchoMm: 580, altoMm: 1070 },
      { etiqueta: 'B', anchoMm: 570, altoMm: 1070 },
      { etiqueta: 'C', anchoMm: 520, altoMm: 1060 },
      { etiqueta: 'D', anchoMm: 530, altoMm: 1040 },
      { etiqueta: 'E', anchoMm: 1100, altoMm: 1000 },
    ];
    const r = optimizarCorte(panos, [], { anchoMm: 3300, altoMm: 2140 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      const retazo = mayorRetazo(r.valor);
      expect(retazo.anchoMm).toBe(3300);
      expect(retazo.altoMm).toBeGreaterThanOrEqual(1040);
    }
  });

  it('consolida en UN cuadro grande en vez de dejar una tira angosta inservible aparte', () => {
    const panos: PanoCorte[] = [
      { etiqueta: '1', anchoMm: 1200, altoMm: 850 },
      { etiqueta: '2', anchoMm: 900, altoMm: 2140 },
      { etiqueta: '3', anchoMm: 1200, altoMm: 890 },
    ];
    const r = optimizarCorte(panos, [], { anchoMm: 3300, altoMm: 2140 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      const retazo = mayorRetazo(r.valor);
      expect(retazo.anchoMm * retazo.altoMm).toBeGreaterThan(2_900_000); // el cuadro grande consolidado (2400×1250 mm²)
    }
  });

  it('propaga el error si un paño no cabe ni rotado', () => {
    const r = optimizarCorte([{ etiqueta: 'Gigante', anchoMm: 4000, altoMm: 3000 }], [], { anchoMm: 2400, altoMm: 1800 });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PANO_MUY_GRANDE');
  });
});
