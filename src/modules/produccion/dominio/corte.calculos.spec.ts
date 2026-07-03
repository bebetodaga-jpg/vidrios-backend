import { LaminaDisponible, PanoCorte, optimizar1D, optimizar2D, optimizarCorte } from './corte.calculos';

describe('optimizar1D (barrillas, FFD)', () => {
  it('4 rieles de 150 cm sin kerf → 1 barrilla de 600 exacta', () => {
    const r = optimizar1D(
      [1, 2, 3, 4].map((i) => ({ nombre: `Riel ${String(i)}`, largoCm: 150 })),
      600,
      0,
    );
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.totalBarras).toBe(1);
      expect(r.valor.barras[0].sobranteCm).toBe(0);
      expect(r.valor.desperdicioPct).toBe(0);
    }
  });

  it('con kerf de 0.5 las mismas 4 piezas ya no caben en una barrilla', () => {
    const r = optimizar1D(
      [1, 2, 3, 4].map((i) => ({ nombre: `Riel ${String(i)}`, largoCm: 150 })),
      600,
      0.5,
    );
    expect(r.exito).toBe(true);
    if (r.exito) expect(r.valor.totalBarras).toBe(2);
  });

  it('rechaza una pieza más larga que la barrilla', () => {
    const r = optimizar1D([{ nombre: 'Jamba', largoCm: 700 }]);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PIEZA_INVALIDA');
  });
});

describe('optimizar2D (planchas, guillotina por estantes)', () => {
  const panosCorrediza: PanoCorte[] = [
    { etiqueta: 'V-01 paño 1', anchoCm: 72, altoCm: 114 },
    { etiqueta: 'V-01 paño 2', anchoCm: 72, altoCm: 114 },
  ];

  it('2 paños de corrediza caben en 1 plancha y generan retazos útiles', () => {
    const r = optimizar2D(panosCorrediza, []);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      expect(r.valor.laminas[0].colocaciones).toHaveLength(2);
      expect(r.valor.laminas[0].sobrantes.length).toBeGreaterThan(0); // franjas ≥ 30 cm
      expect(r.valor.mermaRealPct).toBeLessThan(10); // el sobrante grande es retazo reutilizable, no merma
    }
  });

  it('usa primero el retazo disponible más pequeño que sirva (no abre plancha)', () => {
    const retazos: LaminaDisponible[] = [
      { id: 'R-GRANDE', origen: 'RETAZO', anchoCm: 200, altoCm: 150 },
      { id: 'R-CHICO', origen: 'RETAZO', anchoCm: 70, altoCm: 70 },
    ];
    const r = optimizar2D([{ etiqueta: 'Espejo baño', anchoCm: 60, altoCm: 60 }], retazos);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(0);
      expect(r.valor.retazosUsados).toEqual(['R-CHICO']);
    }
  });

  it('rota el paño si solo cabe girado', () => {
    const retazos: LaminaDisponible[] = [{ id: 'R-1', origen: 'RETAZO', anchoCm: 120, altoCm: 60 }];
    const r = optimizar2D([{ etiqueta: 'Paño', anchoCm: 50, altoCm: 110 }], retazos);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.retazosUsados).toEqual(['R-1']);
      expect(r.valor.laminas[0].colocaciones[0].rotado).toBe(true);
    }
  });

  it('rechaza un paño que no cabe ni rotado en la plancha estándar', () => {
    const r = optimizar2D([{ etiqueta: 'Vitral gigante', anchoCm: 400, altoCm: 300 }], []);
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PANO_MUY_GRANDE');
  });

  it('reparte en varias planchas cuando no alcanza una', () => {
    // 8 paños de 170×110 en 330×214: caben 2 por plancha (2×170=340>330 → 1 a lo ancho; 110+110≤214 → 2 a lo alto).
    const muchos: PanoCorte[] = Array.from({ length: 8 }, (_, i) => ({ etiqueta: `P${String(i + 1)}`, anchoCm: 170, altoCm: 110 }));
    const r = optimizar2D(muchos, []);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBeGreaterThanOrEqual(2);
      const colocados = r.valor.laminas.reduce((s, l) => s + l.colocaciones.length, 0);
      expect(colocados).toBe(8);
    }
  });

  it('respeta una plancha de medida personalizada (corte manual)', () => {
    // En una plancha de 100×100 solo cabe un paño de 90×90; el segundo abre otra plancha.
    const panos: PanoCorte[] = [
      { etiqueta: 'A', anchoCm: 90, altoCm: 90 },
      { etiqueta: 'B', anchoCm: 90, altoCm: 90 },
    ];
    const r = optimizar2D(panos, [], { anchoCm: 100, altoCm: 100 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(2);
      r.valor.laminas.forEach((l) => {
        expect(l.anchoCm).toBe(100);
        expect(l.altoCm).toBe(100);
      });
    }
  });

  it('rechaza un paño más grande que la plancha personalizada indicada', () => {
    const r = optimizar2D([{ etiqueta: 'Grande', anchoCm: 130, altoCm: 90 }], [], { anchoCm: 120, altoCm: 120 });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PANO_MUY_GRANDE');
  });

  it('3 piezas chicas en una plancha grande: casi todo el sobrante es retazo reutilizable, no merma', () => {
    // Caso real reportado: plancha 330×214, piezas pequeñas → desperdicio bruto alto pero merma real mínima.
    const panos: PanoCorte[] = [
      { etiqueta: 'P1', anchoCm: 58, altoCm: 107 },
      { etiqueta: 'P2', anchoCm: 58, altoCm: 56 },
      { etiqueta: 'P3', anchoCm: 51, altoCm: 58 },
    ];
    const r = optimizar2D(panos, [], { anchoCm: 330, altoCm: 214 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      expect(r.valor.desperdicioPct).toBeGreaterThan(80); // sobrante bruto alto (piezas chicas en plancha grande)
      expect(r.valor.retazoUtilPct).toBeGreaterThan(70); // la mayor parte vuelve como retazo
      expect(r.valor.mermaRealPct).toBeLessThan(10); // lo que de verdad se bota es mínimo
      expect(r.valor.laminas[0].sobrantes.length).toBeGreaterThan(0);
    }
  });

  it('el empaque guillotina aprovecha mejor que rellenar a la ligera (≥ 4 cuadrados de 80 en una plancha estándar)', () => {
    // 4 paños de 80×80 caben en 240×180 con desperdicio moderado: el guillotina los acomoda en 1 plancha.
    const panos: PanoCorte[] = Array.from({ length: 4 }, (_, i) => ({ etiqueta: `C${String(i + 1)}`, anchoCm: 80, altoCm: 80 }));
    const r = optimizar2D(panos, []);
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      expect(r.valor.laminas[0].colocaciones).toHaveLength(4);
    }
  });
});

describe('optimizarCorte (máximo razonamiento, decide solo el mejor aprovechamiento)', () => {
  const mayorRetazo = (p: { laminas: { sobrantes: { anchoCm: number; altoCm: number }[] }[] }): { anchoCm: number; altoCm: number } =>
    p.laminas.flatMap((l) => l.sobrantes).reduce((m, s) => (s.anchoCm * s.altoCm > m.anchoCm * m.altoCm ? s : m), { anchoCm: 0, altoCm: 0 });

  it('caso del maestro: 120×85, 90×214 y 120×89 dejan UN cuadro grande de 240×125 (no dos retazos con uno inútil)', () => {
    // El acomodo malo dejaba 120×214 + 120×40 (el 120×40 es tira inservible). El bueno: 240×125.
    const panos: PanoCorte[] = [
      { etiqueta: '1', anchoCm: 120, altoCm: 85 },
      { etiqueta: '2', anchoCm: 90, altoCm: 214 },
      { etiqueta: '3', anchoCm: 120, altoCm: 89 },
    ];
    const r = optimizarCorte(panos, [], { anchoCm: 330, altoCm: 214 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      const retazo = mayorRetazo(r.valor);
      expect(retazo.anchoCm).toBe(240);
      expect(retazo.altoCm).toBe(125);
      // No debe quedar una tira angosta inservible (lado corto ≤ 40) como retazo grande aparte.
      const utiles = r.valor.laminas.flatMap((l) => l.sobrantes).filter((s) => Math.min(s.anchoCm, s.altoCm) > 40);
      expect(utiles).toHaveLength(1); // un solo retazo aprovechable
    }
  });

  it('5 paños que suman 330 de ancho salen en UNA tira y dejan un retazo a todo lo ancho (330)', () => {
    const panos: PanoCorte[] = [
      { etiqueta: 'A', anchoCm: 58, altoCm: 107 },
      { etiqueta: 'B', anchoCm: 57, altoCm: 107 },
      { etiqueta: 'C', anchoCm: 52, altoCm: 106 },
      { etiqueta: 'D', anchoCm: 53, altoCm: 104 },
      { etiqueta: 'E', anchoCm: 110, altoCm: 100 },
    ];
    const r = optimizarCorte(panos, [], { anchoCm: 330, altoCm: 214 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      expect(r.valor.planchasNuevas).toBe(1);
      const retazo = mayorRetazo(r.valor);
      expect(retazo.anchoCm).toBe(330);
      expect(retazo.altoCm).toBeGreaterThanOrEqual(104);
    }
  });

  it('consolida en UN cuadro grande en vez de dejar una tira angosta inservible aparte', () => {
    const panos: PanoCorte[] = [
      { etiqueta: '1', anchoCm: 120, altoCm: 85 },
      { etiqueta: '2', anchoCm: 90, altoCm: 214 },
      { etiqueta: '3', anchoCm: 120, altoCm: 89 },
    ];
    const r = optimizarCorte(panos, [], { anchoCm: 330, altoCm: 214 });
    expect(r.exito).toBe(true);
    if (r.exito) {
      const retazo = mayorRetazo(r.valor);
      expect(retazo.anchoCm * retazo.altoCm).toBeGreaterThan(29000); // el cuadro grande consolidado (240×125)
    }
  });

  it('propaga el error si un paño no cabe ni rotado', () => {
    const r = optimizarCorte([{ etiqueta: 'Gigante', anchoCm: 400, altoCm: 300 }], [], { anchoCm: 240, altoCm: 180 });
    expect(r.exito).toBe(false);
    if (!r.exito) expect(r.error.codigo).toBe('PANO_MUY_GRANDE');
  });
});
