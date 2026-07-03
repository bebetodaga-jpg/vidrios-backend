import { esperadoPorMetodo, estadoCredito, evaluarCierre } from './caja.calculos';

describe('esperadoPorMetodo (caja del día)', () => {
  it('reproduce el día simulado del prototipo S3: efectivo 1620.50, tarjeta 560, yape 380', () => {
    const esperado = esperadoPorMetodo(30_000, [
      { metodo: 'EFECTIVO', montoCentimos: 18_550 }, // venta
      { metodo: 'TARJETA', montoCentimos: 56_000 },
      { metodo: 'EFECTIVO', montoCentimos: 64_200 },
      { metodo: 'EFECTIVO', montoCentimos: -12_000 }, // egreso silicona
      { metodo: 'YAPE_PLIN', montoCentimos: 38_000 },
      { metodo: 'EFECTIVO', montoCentimos: 20_000 }, // cobro crédito
      { metodo: 'EFECTIVO', montoCentimos: 41_300 },
    ]);
    expect(esperado).toEqual({ EFECTIVO: 162_050, TARJETA: 56_000, YAPE_PLIN: 38_000 });
  });
});

describe('evaluarCierre (cierre ciego, tolerancia ±S/5)', () => {
  const esperado = { EFECTIVO: 162_050, TARJETA: 56_000, YAPE_PLIN: 38_000 };

  it('cuadra exacto', () => {
    const filas = evaluarCierre(esperado, { efectivoCentimos: 162_050, tarjetaCentimos: 56_000, yapeCentimos: 38_000 });
    expect(filas.every((f) => f.estado === 'CUADRA')).toBe(true);
  });

  it('faltante de S/ 3 → DIFERENCIA_MENOR (dentro de la tolerancia del dueño)', () => {
    const filas = evaluarCierre(esperado, { efectivoCentimos: 161_750, tarjetaCentimos: 56_000, yapeCentimos: 38_000 });
    expect(filas[0]).toMatchObject({ diferenciaCentimos: -300, estado: 'DIFERENCIA_MENOR' });
  });

  it('faltante de S/ 20 → REVISAR', () => {
    const filas = evaluarCierre(esperado, { efectivoCentimos: 160_050, tarjetaCentimos: 56_000, yapeCentimos: 38_000 });
    expect(filas[0].estado).toBe('REVISAR');
  });

  it('sobrante también se reporta (declarado > esperado)', () => {
    const filas = evaluarCierre(esperado, { efectivoCentimos: 163_050, tarjetaCentimos: 56_000, yapeCentimos: 38_000 });
    expect(filas[0]).toMatchObject({ diferenciaCentimos: 1_000, estado: 'REVISAR' });
  });
});

describe('estadoCredito (15 días, aviso 3 días)', () => {
  const hoy = new Date('2026-06-10');
  it('vigente / por vencer / vencido', () => {
    expect(estadoCredito(new Date('2026-06-20'), hoy)).toBe('VIGENTE');
    expect(estadoCredito(new Date('2026-06-12'), hoy)).toBe('POR_VENCER');
    expect(estadoCredito(new Date('2026-06-08'), hoy)).toBe('VENCIDO');
  });
});
