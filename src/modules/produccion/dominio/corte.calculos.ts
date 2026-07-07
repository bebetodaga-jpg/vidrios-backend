import { Resultado, fallo, ok } from '@shared/dominio/resultado';

/**
 * Optimizador de corte (Sprint 8 ★ — núcleo diferencial). FUNCIONES PURAS, deterministas
 * y testeadas (estándar §1: el dinero y el desperdicio viven aquí).
 *
 * ADR-007: esta heurística TS (FFD 1D + guillotina por rectángulos libres 2D) es el adaptador
 * de desarrollo tras el puerto OptimizadorCortes; el worker Python + OR-Tools de producción
 * se conecta tras el MISMO puerto cuando el proveedor lo despliegue, sin tocar el negocio.
 */

// ===== 1D: barrillas de aluminio =====

export const LARGO_BARRILLA_MM = 6000; // 6.00 m (estándar); la serie 6.40 se pasa por parámetro
export const KERF_MM = 5; // pérdida por corte de la SIERRA de aluminio (grosor de disco, en mm)

export interface PiezaLineal {
  readonly nombre: string;
  readonly largoMm: number;
}

export interface BarraPlan {
  readonly piezas: PiezaLineal[];
  readonly usadoMm: number;
  readonly sobranteMm: number;
}

export interface Plan1D {
  readonly barras: BarraPlan[];
  readonly totalBarras: number;
  readonly desperdicioPct: number;
}

/** First-Fit Decreasing: ordena las piezas de mayor a menor y las acomoda en la primera barra donde quepan. */
export function optimizar1D(piezas: PiezaLineal[], largoBarraMm = LARGO_BARRILLA_MM, kerfMm = KERF_MM): Resultado<Plan1D> {
  const invalida = piezas.find((p) => p.largoMm <= 0 || p.largoMm > largoBarraMm);
  if (invalida) {
    return fallo('PIEZA_INVALIDA', `La pieza "${invalida.nombre}" (${String(invalida.largoMm)} mm) no cabe en una barrilla de ${String(largoBarraMm)} mm.`);
  }
  const ordenadas = [...piezas].sort((a, b) => b.largoMm - a.largoMm);
  const barras: { piezas: PiezaLineal[]; usadoMm: number }[] = [];

  for (const pieza of ordenadas) {
    const destino = barras.find((b) => b.usadoMm + pieza.largoMm + (b.piezas.length > 0 ? kerfMm : 0) <= largoBarraMm);
    if (destino) {
      destino.usadoMm += pieza.largoMm + (destino.piezas.length > 0 ? kerfMm : 0);
      destino.piezas.push(pieza);
    } else {
      barras.push({ piezas: [pieza], usadoMm: pieza.largoMm });
    }
  }

  const planBarras: BarraPlan[] = barras.map((b) => ({
    piezas: b.piezas,
    usadoMm: Math.round(b.usadoMm * 10) / 10,
    sobranteMm: Math.round((largoBarraMm - b.usadoMm) * 10) / 10,
  }));
  const totalDisponible = barras.length * largoBarraMm;
  const totalUsado = piezas.reduce((s, p) => s + p.largoMm, 0);
  return ok({
    barras: planBarras,
    totalBarras: barras.length,
    desperdicioPct: totalDisponible === 0 ? 0 : Math.round(((totalDisponible - totalUsado) / totalDisponible) * 1000) / 10,
  });
}

// ===== 2D: planchas de vidrio (guillotina por rectángulos libres) =====

/** Plancha estándar de vidrio en el mercado peruano: 3.30 × 2.14 m. */
export const PLANCHA_ESTANDAR = { anchoMm: 3300, altoMm: 2140 } as const;
/** Un sobrante se conserva como retazo si ambos lados son ≥ a este mínimo (mm). */
export const MIN_RETAZO_MM = 300;
/**
 * El vidrio se corta rayando y partiendo: el cortador NO tiene grosor, no se pierde material
 * entre cortes. Por eso el kerf del 2D es 0 (a diferencia de la sierra de aluminio del 1D).
 */
export const KERF_VIDRIO_MM = 0;

export interface PanoCorte {
  readonly etiqueta: string; // "V-01 paño 1/2"
  readonly anchoMm: number;
  readonly altoMm: number;
}

export interface LaminaDisponible {
  readonly id: string; // id del retazo o "PLANCHA"
  readonly origen: 'PLANCHA' | 'RETAZO';
  readonly anchoMm: number;
  readonly altoMm: number;
}

export interface Colocacion {
  readonly etiqueta: string;
  readonly x: number;
  readonly y: number;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly rotado: boolean;
}

/** Sobrante de una lámina que se conserva como retazo (≥ mínimo), con su posición para dibujarlo. */
export interface Sobrante {
  readonly x: number;
  readonly y: number;
  readonly anchoMm: number;
  readonly altoMm: number;
}

export interface PlanLamina {
  readonly laminaId: string;
  readonly origen: 'PLANCHA' | 'RETAZO';
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly colocaciones: Colocacion[];
  readonly sobrantes: Sobrante[]; // retazos nuevos ≥ mínimo, ubicados dentro de la lámina
  readonly usoPct: number;
}

export interface Plan2D {
  readonly laminas: PlanLamina[];
  readonly planchasNuevas: number;
  readonly retazosUsados: string[];
  /** Sobrante total sobre la lámina (incluye retazos reutilizables): métrica bruta. */
  readonly desperdicioPct: number;
  /** Del sobrante, la parte que se conserva como retazo reutilizable (≥ mínimo). NO es pérdida. */
  readonly retazoUtilPct: number;
  /** Merma real: lo que de verdad se bota (recortes menores al mínimo + pérdida de cuchilla). */
  readonly mermaRealPct: number;
}

/** Rectángulo libre (aún sin cortar) dentro de una lámina. */
interface Libre {
  readonly x: number;
  readonly y: number;
  readonly anchoMm: number;
  readonly altoMm: number;
}

interface ResultadoEmpaque {
  readonly colocaciones: Colocacion[];
  readonly restantes: PanoCorte[];
  readonly sobrantes: Sobrante[];
  readonly usoPct: number;
}

/** Niveles de optimización: a mayor nivel, más estrategias se prueban (más “razonamiento”). */
export type NivelOptimizacion = 'NORMAL' | 'AVANZADO' | 'PRO';

/** Dirección del corte guillotina: AUTO decide sola; HORIZONTAL/VERTICAL la fuerzan. */
type DireccionCorte = 'AUTO' | 'HORIZONTAL' | 'VERTICAL';

/**
 * Regla de PUNTUACIÓN del encaje: dada la pieza candidata en un rectángulo libre, devuelve un
 * puntaje (menor = mejor). Ninguna regla gana siempre; probar varias y quedarse con la mejor es
 * lo que acerca la heurística al óptimo ("A Thousand Ways to Pack the Bin", Jylänki 2010).
 */
type ReglaPuntuar = (holguraAncho: number, holguraAlto: number, libre: Libre, anchoColoc: number, altoColoc: number) => number;

/** Best Short Side Fit: minimiza el lado más ajustado → retazos más cuadrados. (Comportamiento histórico.) */
const puntuarBSSF: ReglaPuntuar = (ha, hb) => Math.min(ha, hb);
/** Best Long Side Fit: minimiza el lado más holgado → tiende a dejar una franja larga limpia. */
const puntuarBLSF: ReglaPuntuar = (ha, hb) => Math.max(ha, hb);
/** Best Area Fit: minimiza el área que queda libre en ese rectángulo → mete la pieza donde "sobra menos". */
const puntuarBAF: ReglaPuntuar = (_ha, _hb, libre, w, h) => libre.anchoMm * libre.altoMm - w * h;

/** Regla para decidir, en modo AUTO, por qué eje se parte el rectángulo libre tras colocar la pieza. */
type ReglaSplitAuto = 'MAYOR_SOBRANTE' | 'MENOR_SOBRANTE' | 'LADO_CORTO' | 'LADO_LARGO';

/** true = corte vertical (la franja derecha conserva toda la altura del libre). */
function decidirCorteVertical(regla: ReglaSplitAuto, sobraDerecha: number, sobraArriba: number, libre: Libre): boolean {
  switch (regla) {
    case 'MAYOR_SOBRANTE':
      return sobraDerecha >= sobraArriba; // AUTO original: parte por donde quede más espacio
    case 'MENOR_SOBRANTE':
      return sobraDerecha < sobraArriba;
    case 'LADO_CORTO':
      return libre.anchoMm <= libre.altoMm;
    case 'LADO_LARGO':
      return libre.anchoMm > libre.altoMm;
  }
}

/** Una forma concreta de intentar el acomodo: orden de entrada, cómo se corta y cómo se puntúa el encaje. */
interface Estrategia {
  readonly ordenar: (panos: PanoCorte[]) => PanoCorte[];
  readonly dividir: DireccionCorte;
  readonly puntuar?: ReglaPuntuar; // por defecto BSSF (encaje por lado corto)
  readonly reglaSplitAuto?: ReglaSplitAuto; // por defecto MAYOR_SOBRANTE (solo aplica si dividir = AUTO)
}

const porAreaDesc = (p: PanoCorte[]): PanoCorte[] => [...p].sort((a, b) => b.anchoMm * b.altoMm - a.anchoMm * a.altoMm);
const porAltoDesc = (p: PanoCorte[]): PanoCorte[] => [...p].sort((a, b) => b.altoMm - a.altoMm);
const porAnchoDesc = (p: PanoCorte[]): PanoCorte[] => [...p].sort((a, b) => b.anchoMm - a.anchoMm);
const porLadoMayorDesc = (p: PanoCorte[]): PanoCorte[] => [...p].sort((a, b) => Math.max(b.anchoMm, b.altoMm) - Math.max(a.anchoMm, a.altoMm));

const ESTRATEGIA_DEFECTO: Estrategia = { ordenar: porAreaDesc, dividir: 'AUTO' };

/**
 * Empaque GUILLOTINA por rectángulos libres. La regla de puntuación (`puntuar`) y la de
 * partición (`reglaSplitAuto`) son intercambiables: el optimizador prueba varias combinaciones
 * y se queda con la mejor (de ahí la mayor precisión). Cada corte es recto de borde a borde
 * — realizable en la mesa de vidrio — sin romper la validez guillotina.
 * Kerf por defecto 0: el cortador de vidrio no tiene grosor.
 */
function empacarGuillotina(
  lamina: LaminaDisponible,
  pendientes: PanoCorte[],
  kerfMm = KERF_VIDRIO_MM,
  dividir: DireccionCorte = 'AUTO',
  puntuar: ReglaPuntuar = puntuarBSSF,
  reglaSplitAuto: ReglaSplitAuto = 'MAYOR_SOBRANTE',
): ResultadoEmpaque {
  const colocaciones: Colocacion[] = [];
  const restantes: PanoCorte[] = [];
  let libres: Libre[] = [{ x: 0, y: 0, anchoMm: lamina.anchoMm, altoMm: lamina.altoMm }];

  for (const pano of pendientes) {
    // Rotación LIBRE: no importa cuál lado sea "ancho" o "alto"; se prueban ambas
    // orientaciones y se elige la que cubique mejor (menor sobrante en el lado ajustado).
    const orientaciones = [
      { anchoMm: pano.anchoMm, altoMm: pano.altoMm, rotado: false },
      { anchoMm: pano.altoMm, altoMm: pano.anchoMm, rotado: true },
    ];

    let mejor: { indice: number; anchoMm: number; altoMm: number; rotado: boolean; puntuacion: number } | null = null;
    for (let i = 0; i < libres.length; i++) {
      const libre = libres[i];
      for (const o of orientaciones) {
        if (o.anchoMm > libre.anchoMm || o.altoMm > libre.altoMm) {
          continue;
        }
        // Puntúa el encaje según la regla activa (BSSF por defecto): menor puntaje = mejor acomodo.
        const puntuacion = puntuar(libre.anchoMm - o.anchoMm, libre.altoMm - o.altoMm, libre, o.anchoMm, o.altoMm);
        if (!mejor || puntuacion < mejor.puntuacion) {
          mejor = { indice: i, anchoMm: o.anchoMm, altoMm: o.altoMm, rotado: o.rotado, puntuacion };
        }
      }
    }

    if (!mejor) {
      restantes.push(pano);
      continue;
    }

    const libre = libres[mejor.indice];
    colocaciones.push({ etiqueta: pano.etiqueta, x: libre.x, y: libre.y, anchoMm: mejor.anchoMm, altoMm: mejor.altoMm, rotado: mejor.rotado });

    // Sustituye la libre por sus dos sobrantes guillotina (descontando el kerf, 0 en vidrio).
    libres = libres.filter((_, i) => i !== mejor.indice);
    const sobraDerecha = libre.anchoMm - mejor.anchoMm - kerfMm;
    const sobraArriba = libre.altoMm - mejor.altoMm - kerfMm;
    // AUTO: la regla de partición decide el eje. VERTICAL/HORIZONTAL lo fuerzan.
    const esCorteVertical = dividir === 'AUTO' ? decidirCorteVertical(reglaSplitAuto, sobraDerecha, sobraArriba, libre) : dividir === 'VERTICAL';
    if (esCorteVertical) {
      // La franja derecha conserva toda la altura de la libre.
      if (sobraDerecha > 0) libres.push({ x: libre.x + mejor.anchoMm + kerfMm, y: libre.y, anchoMm: sobraDerecha, altoMm: libre.altoMm });
      if (sobraArriba > 0) libres.push({ x: libre.x, y: libre.y + mejor.altoMm + kerfMm, anchoMm: mejor.anchoMm, altoMm: sobraArriba });
    } else {
      // La franja superior conserva todo el ancho de la libre.
      if (sobraArriba > 0) libres.push({ x: libre.x, y: libre.y + mejor.altoMm + kerfMm, anchoMm: libre.anchoMm, altoMm: sobraArriba });
      if (sobraDerecha > 0) libres.push({ x: libre.x + mejor.anchoMm + kerfMm, y: libre.y, anchoMm: sobraDerecha, altoMm: mejor.altoMm });
    }
  }

  // Las libres remanentes con ambos lados ≥ mínimo se conservan como retazos nuevos (con su posición).
  const sobrantes: Sobrante[] = libres
    .filter((l) => l.anchoMm >= MIN_RETAZO_MM && l.altoMm >= MIN_RETAZO_MM)
    .map((l) => ({ x: Math.round(l.x), y: Math.round(l.y), anchoMm: Math.floor(l.anchoMm), altoMm: Math.floor(l.altoMm) }));

  const areaUsada = colocaciones.reduce((s, c) => s + c.anchoMm * c.altoMm, 0);
  const usoPct = Math.round((areaUsada / (lamina.anchoMm * lamina.altoMm)) * 1000) / 10;
  return { colocaciones, restantes, sobrantes, usoPct };
}

// ===== Empaque EN TIRAS (shelf) — deja un retazo grande y limpio =====

/** Forma del corte en tiras: bandas horizontales (a lo ancho) o columnas verticales (a lo alto). */
export type Forma = 'HORIZONTAL' | 'VERTICAL';

/** Cómo orientar cada pieza antes de armar las tiras (se prueban todas y gana la del mejor retazo). */
type PoliticaOrientacion = 'ORIGINAL' | 'ROTADO' | 'APILADO_MIN' | 'APILADO_MAX';

/** Orienta una pieza según la política. El "apilado" es el lado que define el grosor de la tira. */
function orientarPieza(p: PanoCorte, forma: Forma, politica: PoliticaOrientacion): { etiqueta: string; pw: number; ph: number; rotado: boolean } {
  const sinGirar = { etiqueta: p.etiqueta, pw: p.anchoMm, ph: p.altoMm, rotado: false };
  const girada = { etiqueta: p.etiqueta, pw: p.altoMm, ph: p.anchoMm, rotado: true };
  if (politica === 'ORIGINAL') return sinGirar;
  if (politica === 'ROTADO') return girada;
  // El lado "apilado" es ph en bandas horizontales y pw en columnas verticales.
  const apiladoDe = (o: { pw: number; ph: number }): number => (forma === 'HORIZONTAL' ? o.ph : o.pw);
  const objetivo = politica === 'APILADO_MIN' ? Math.min(p.anchoMm, p.altoMm) : Math.max(p.anchoMm, p.altoMm);
  return apiladoDe(sinGirar) === objetivo ? sinGirar : girada;
}

/**
 * Empaque EN TIRAS (First-Fit Decreasing Height): apila las piezas en bandas/columnas y deja
 * TODO el sobrante restante como una sola franja limpia a lo ancho/alto de la plancha — el
 * retazo más grande posible. Es lo que pidió el taller: cubicar en tiras sin fragmentar.
 */
function empacarTiras(lamina: LaminaDisponible, pendientes: PanoCorte[], forma: Forma, politica: PoliticaOrientacion): ResultadoEmpaque {
  const esH = forma === 'HORIZONTAL';
  const aLoLargo = esH ? lamina.anchoMm : lamina.altoMm; // largo de cada tira
  const apilable = esH ? lamina.altoMm : lamina.anchoMm; // cuántas tiras caben apiladas

  const piezas = pendientes
    .map((p) => {
      const o = orientarPieza(p, forma, politica);
      return { original: p, ...o, largo: esH ? o.pw : o.ph, grosor: esH ? o.ph : o.pw };
    })
    .sort((a, b) => b.grosor - a.grosor); // tiras más "gruesas" primero (FFDH)

  const tiras: { inicio: number; grosor: number; usadoLargo: number }[] = [];
  let apiladoTotal = 0;
  const colocaciones: Colocacion[] = [];
  const restantes: PanoCorte[] = [];

  for (const pz of piezas) {
    if (pz.largo > aLoLargo || pz.grosor > apilable) {
      restantes.push(pz.original);
      continue;
    }
    let tira = tiras.find((t) => pz.grosor <= t.grosor && t.usadoLargo + pz.largo <= aLoLargo);
    if (!tira) {
      if (apiladoTotal + pz.grosor > apilable) {
        restantes.push(pz.original);
        continue;
      }
      tira = { inicio: apiladoTotal, grosor: pz.grosor, usadoLargo: 0 };
      tiras.push(tira);
      apiladoTotal += pz.grosor;
    }
    const posLargo = tira.usadoLargo;
    const posApilado = tira.inicio;
    tira.usadoLargo += pz.largo;
    colocaciones.push({
      etiqueta: pz.original.etiqueta,
      x: esH ? posLargo : posApilado,
      y: esH ? posApilado : posLargo,
      anchoMm: pz.pw,
      altoMm: pz.ph,
      rotado: pz.rotado,
    });
  }

  const sobrantes: Sobrante[] = [];
  // Sobrante al final de cada tira (lo que quedó sin usar a lo largo).
  for (const t of tiras) {
    const libre = aLoLargo - t.usadoLargo;
    if (libre >= MIN_RETAZO_MM && t.grosor >= MIN_RETAZO_MM) {
      sobrantes.push({
        x: Math.round(esH ? t.usadoLargo : t.inicio),
        y: Math.round(esH ? t.inicio : t.usadoLargo),
        anchoMm: Math.floor(esH ? libre : t.grosor),
        altoMm: Math.floor(esH ? t.grosor : libre),
      });
    }
  }
  // LA franja grande: toda la plancha a lo largo × lo que sobró de apilado. El retazo limpio.
  const bandaLibre = apilable - apiladoTotal;
  if (bandaLibre >= MIN_RETAZO_MM && aLoLargo >= MIN_RETAZO_MM) {
    sobrantes.push({
      x: Math.round(esH ? 0 : apiladoTotal),
      y: Math.round(esH ? apiladoTotal : 0),
      anchoMm: Math.floor(esH ? aLoLargo : bandaLibre),
      altoMm: Math.floor(esH ? bandaLibre : aLoLargo),
    });
  }

  const areaUsada = colocaciones.reduce((s, c) => s + c.anchoMm * c.altoMm, 0);
  const usoPct = Math.round((areaUsada / (lamina.anchoMm * lamina.altoMm)) * 1000) / 10;
  return { colocaciones, restantes, sobrantes, usoPct };
}

// ===== Planificación sobre retazos + planchas (común a guillotina y tiras) =====

/** Recorre retazos (el más chico que sirva) y luego planchas nuevas, usando el empacador dado. */
function planificarLaminas(
  panos: PanoCorte[],
  retazos: LaminaDisponible[],
  planchaBase: { anchoMm: number; altoMm: number },
  empacar: (lamina: LaminaDisponible, pendientes: PanoCorte[]) => ResultadoEmpaque,
): Resultado<Plan2D> {
  const imposible = panos.find(
    (p) =>
      !(p.anchoMm <= planchaBase.anchoMm && p.altoMm <= planchaBase.altoMm) &&
      !(p.altoMm <= planchaBase.anchoMm && p.anchoMm <= planchaBase.altoMm),
  );
  if (imposible) {
    return fallo('PANO_MUY_GRANDE', `El paño "${imposible.etiqueta}" no cabe en una plancha de ${String(planchaBase.anchoMm)}×${String(planchaBase.altoMm)} mm.`);
  }

  let pendientes = panos;
  const laminas: PlanLamina[] = [];
  const retazosUsados: string[] = [];

  const retazosOrdenados = [...retazos].sort((a, b) => a.anchoMm * a.altoMm - b.anchoMm * b.altoMm);
  for (const retazo of retazosOrdenados) {
    if (pendientes.length === 0) break;
    const r = empacar(retazo, pendientes);
    if (r.colocaciones.length > 0) {
      laminas.push({ laminaId: retazo.id, origen: 'RETAZO', anchoMm: retazo.anchoMm, altoMm: retazo.altoMm, colocaciones: r.colocaciones, sobrantes: r.sobrantes, usoPct: r.usoPct });
      retazosUsados.push(retazo.id);
      pendientes = r.restantes;
    }
  }

  let planchasNuevas = 0;
  while (pendientes.length > 0) {
    const plancha: LaminaDisponible = { id: `PLANCHA-${String(planchasNuevas + 1)}`, origen: 'PLANCHA', ...planchaBase };
    const r = empacar(plancha, pendientes);
    if (r.colocaciones.length === 0) {
      return fallo('NO_EMPACABLE', 'No se pudo acomodar el corte (revise las medidas de los paños).');
    }
    laminas.push({ laminaId: plancha.id, origen: 'PLANCHA', anchoMm: plancha.anchoMm, altoMm: plancha.altoMm, colocaciones: r.colocaciones, sobrantes: r.sobrantes, usoPct: r.usoPct });
    planchasNuevas++;
    pendientes = r.restantes;
  }

  const areaPanos = panos.reduce((s, p) => s + p.anchoMm * p.altoMm, 0);
  const areaLaminas = laminas.reduce((s, l) => s + l.anchoMm * l.altoMm, 0);
  const areaRetazos = laminas.reduce((s, l) => s + l.sobrantes.reduce((a, r) => a + r.anchoMm * r.altoMm, 0), 0);
  const pct = (n: number): number => (areaLaminas === 0 ? 0 : Math.round((n / areaLaminas) * 1000) / 10);
  return ok({
    laminas,
    planchasNuevas,
    retazosUsados,
    desperdicioPct: pct(areaLaminas - areaPanos),
    retazoUtilPct: pct(areaRetazos),
    mermaRealPct: pct(Math.max(0, areaLaminas - areaPanos - areaRetazos)),
  });
}

/**
 * Optimiza con empaque GUILLOTINA por rectángulos libres (compacto). `planchaBase` permite una
 * medida de plancha libre; `estrategia` fija el orden, la dirección de corte y la puntuación.
 */
export function optimizar2D(
  panos: PanoCorte[],
  retazos: LaminaDisponible[],
  planchaBase: { anchoMm: number; altoMm: number } = PLANCHA_ESTANDAR,
  estrategia: Estrategia = ESTRATEGIA_DEFECTO,
): Resultado<Plan2D> {
  const ordenados = estrategia.ordenar(panos);
  return planificarLaminas(ordenados, retazos, planchaBase, (lamina, pendientes) =>
    empacarGuillotina(lamina, pendientes, KERF_VIDRIO_MM, estrategia.dividir, estrategia.puntuar, estrategia.reglaSplitAuto),
  );
}

/** Optimiza con empaque EN TIRAS (deja el retazo más grande) en la forma y orientación dadas. */
function optimizar2DTiras(
  panos: PanoCorte[],
  retazos: LaminaDisponible[],
  planchaBase: { anchoMm: number; altoMm: number },
  forma: Forma,
  politica: PoliticaOrientacion,
): Resultado<Plan2D> {
  return planificarLaminas(panos, retazos, planchaBase, (lamina, pendientes) => empacarTiras(lamina, pendientes, forma, politica));
}

// ===== Optimizador por niveles (Normal / Avanzado / Pro) =====

/** Todas las permutaciones de índices 0..n-1 (solo para pocas piezas). */
function permutar(items: number[]): number[][] {
  if (items.length <= 1) {
    return [items];
  }
  const salida: number[][] = [];
  for (let i = 0; i < items.length; i++) {
    const resto = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutar(resto)) {
      salida.push([items[i], ...p]);
    }
  }
  return salida;
}

/** Órdenes a explorar: hasta 7 piezas se prueban TODAS las permutaciones; con más, barajados acotados. */
function ordenesAExplorar(cantidad: number): number[][] {
  const indices = Array.from({ length: cantidad }, (_, i) => i);
  if (cantidad <= 7) {
    return permutar(indices);
  }
  // Generador determinista (LCG) para barajar sin depender de Math.random.
  let semilla = 1;
  const aleatorio = (): number => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };
  const muestras: number[][] = [];
  for (let s = 0; s < 400; s++) {
    const copia = [...indices];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    muestras.push(copia);
  }
  return muestras;
}

function estrategiasPorNivel(nivel: NivelOptimizacion, cantidad: number): Estrategia[] {
  if (nivel === 'NORMAL') {
    return [ESTRATEGIA_DEFECTO];
  }
  const ordenes = [porAreaDesc, porAltoDesc, porAnchoDesc, porLadoMayorDesc];
  // Varía también la REGLA DE PUNTUACIÓN y la de PARTICIÓN, no solo el orden: ahí está la precisión.
  const puntuaciones: ReglaPuntuar[] = [puntuarBSSF, puntuarBAF, puntuarBLSF];
  const cortes: Pick<Estrategia, 'dividir' | 'reglaSplitAuto'>[] = [
    { dividir: 'AUTO', reglaSplitAuto: 'MAYOR_SOBRANTE' },
    { dividir: 'AUTO', reglaSplitAuto: 'MENOR_SOBRANTE' },
    { dividir: 'AUTO', reglaSplitAuto: 'LADO_LARGO' },
    { dividir: 'VERTICAL' },
    { dividir: 'HORIZONTAL' },
  ];
  const base: Estrategia[] = ordenes.flatMap((ordenar) =>
    puntuaciones.flatMap((puntuar) => cortes.map((corte) => ({ ordenar, puntuar, ...corte }))),
  );
  if (nivel === 'AVANZADO') {
    return base;
  }
  // PRO: además explora permutaciones del orden de entrada, cada una con varias reglas de puntuación.
  const porPermutacion: Estrategia[] = ordenesAExplorar(cantidad).flatMap((orden) =>
    puntuaciones.map((puntuar) => ({
      ordenar: (panos: PanoCorte[]): PanoCorte[] => orden.map((i) => panos[i]),
      dividir: 'AUTO',
      puntuar,
    })),
  );
  return [...base, ...porPermutacion];
}

/** El retazo individual más grande del plan (preferir un retazo limpio antes que muchos chicos). */
function mayorRetazo(plan: Plan2D): { area: number; anchoMm: number; altoMm: number } {
  let mejor = { area: 0, anchoMm: 0, altoMm: 0 };
  for (const l of plan.laminas) {
    for (const s of l.sobrantes) {
      const area = s.anchoMm * s.altoMm;
      if (area > mejor.area) mejor = { area, anchoMm: s.anchoMm, altoMm: s.altoMm };
    }
  }
  return mejor;
}

/**
 * Lado corto mínimo para que un retazo cuente como APROVECHABLE. Por debajo es una tira angosta
 * que en la práctica de la vidriería es desperdicio (no rinde para sacar otras medidas).
 * Regla del taller (maestro 15 años): un 120×40 no sirve. Ajustable si cambia el criterio.
 */
export const RETAZO_UTIL_MIN_MM = 400;

/** Metros² de retazo realmente aprovechable: suma de retazos cuyo lado corto supera el mínimo útil. */
function retazoUtilMm2(plan: Plan2D): number {
  let total = 0;
  for (const l of plan.laminas) {
    for (const s of l.sobrantes) {
      if (Math.min(s.anchoMm, s.altoMm) > RETAZO_UTIL_MIN_MM) total += s.anchoMm * s.altoMm;
    }
  }
  return total;
}

/**
 * Criterio del taller (en orden): (1) menos planchas; (2) el RETAZO INDIVIDUAL MÁS GRANDE —el
 * cuadro grande del que se sacan otras medidas, en vez de varios chicos o tiras angostas; (3) a
 * igual cuadro, MÁS metros² de retazo aprovechable (las tiras angostas no cuentan); (4) menos merma.
 */
function esMejorPlan(candidato: Plan2D, actual: Plan2D): boolean {
  if (candidato.planchasNuevas !== actual.planchasNuevas) {
    return candidato.planchasNuevas < actual.planchasNuevas;
  }
  const rc = mayorRetazo(candidato).area;
  const ra = mayorRetazo(actual).area;
  if (Math.abs(rc - ra) > Math.max(rc, ra, 1) * 0.005) {
    return rc > ra; // el cuadro grande consolidado
  }
  const uc = retazoUtilMm2(candidato);
  const ua = retazoUtilMm2(actual);
  if (Math.abs(uc - ua) > Math.max(uc, ua, 1) * 0.005) {
    return uc > ua; // a igual cuadro grande, más metros aprovechables en total
  }
  return candidato.mermaRealPct < actual.mermaRealPct;
}

const POLITICAS_ORIENTACION: PoliticaOrientacion[] = ['ORIGINAL', 'ROTADO', 'APILADO_MIN', 'APILADO_MAX'];

/**
 * Optimizador de corte 2D con MÁXIMO RAZONAMIENTO (siempre, decide solo). Prueba en paralelo:
 *  - empaque guillotina compacto (todas las estrategias de orden/puntuación/partición), y
 *  - empaque EN TIRAS en AMBAS direcciones de la plancha (horizontal y vertical) con varias
 *    orientaciones de pieza,
 * y se queda con el plan que deja MÁS metros² de retazo aprovechable (consolidado en un cuadro
 * grande). No hay que elegir orientación: se evalúan todas y gana la de mejor aprovechamiento.
 */
export function optimizarCorte(
  panos: PanoCorte[],
  retazos: LaminaDisponible[],
  planchaBase: { anchoMm: number; altoMm: number } = PLANCHA_ESTANDAR,
): Resultado<Plan2D> {
  // Si un paño no cabe ni rotado, falla con cualquier estrategia: lo reportamos de una vez.
  const imposible = panos.find(
    (p) =>
      !(p.anchoMm <= planchaBase.anchoMm && p.altoMm <= planchaBase.altoMm) &&
      !(p.altoMm <= planchaBase.anchoMm && p.anchoMm <= planchaBase.altoMm),
  );
  if (imposible) {
    return fallo('PANO_MUY_GRANDE', `El paño "${imposible.etiqueta}" no cabe en una plancha de ${String(planchaBase.anchoMm)}×${String(planchaBase.altoMm)} mm.`);
  }

  const candidatos: Plan2D[] = [];
  // 1) Guillotina compacto: todas las estrategias (orden + puntuación + partición).
  for (const estrategia of estrategiasPorNivel('PRO', panos.length)) {
    const r = optimizar2D(panos, retazos, planchaBase, estrategia);
    if (r.exito) candidatos.push(r.valor);
  }
  // 2) Tiras en ambas direcciones, con varias orientaciones de pieza.
  for (const formaTira of ['HORIZONTAL', 'VERTICAL'] as Forma[]) {
    for (const politica of POLITICAS_ORIENTACION) {
      const r = optimizar2DTiras(panos, retazos, planchaBase, formaTira, politica);
      if (r.exito) candidatos.push(r.valor);
    }
  }

  if (candidatos.length === 0) return fallo('SIN_PANOS', 'Agregue al menos un paño a cortar.');

  let mejor = candidatos[0];
  for (const c of candidatos) {
    if (esMejorPlan(c, mejor)) mejor = c;
  }
  return ok(mejor);
}
