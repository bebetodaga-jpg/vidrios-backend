/**
 * Despiece de la ventana modelo SERIE 25 (aluminio corredizo).
 *
 * Réplica de las hojas de cálculo del maestro (SERIE25_V5.xlsx): dada una ventana de ANCHO × ALTO
 * (mm) y una CANTIDAD, y según en cuántas hojas se divide, devuelve la lista de cortes de cada
 * perfil (largo en mm + cantidad), los paños de vidrio, y cuántas varillas comprar.
 *
 * Todas las medidas de perfil/vidrio en MILÍMETROS (pueden salir con decimales, igual que el Excel).
 * La varilla de aluminio estándar es de 6 m (6000 mm) — inferido de las fórmulas del libro.
 */

export type ConfigSerie25 = 'DOS_HOJAS' | 'TRES_HOJAS' | 'TRES_HOJAS_FIJO_EXTERIOR' | 'CUATRO_HOJAS' | 'SEIS_HOJAS';

/** Un tipo de corte de perfil: N piezas de `largoMm` del perfil `perfil`. */
export interface CorteSerie25 {
  readonly perfil: string;
  readonly largoMm: number;
  readonly cantidad: number;
}

/** Un paño de vidrio del despiece. */
export interface VidrioSerie25 {
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
}

/** Consumo de varillas por perfil: metros usados, sobrante y varillas de 6 m a comprar. */
export interface VarillaSerie25 {
  readonly perfil: string;
  readonly metros: number;
  readonly sobranteM: number;
  readonly varillas: number;
}

export interface DespieceSerie25 {
  readonly config: ConfigSerie25;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
  readonly cortes: CorteSerie25[];
  readonly vidrios: VidrioSerie25[];
  readonly varillas: VarillaSerie25[];
  readonly areaM2: number;
}

export const LARGO_VARILLA_MM = 6000; // varilla estándar de aluminio (6 m)

/** Nombres de las configuraciones para mostrar en pantalla. */
export const NOMBRES_CONFIG: Record<ConfigSerie25, string> = {
  DOS_HOJAS: '2 hojas',
  TRES_HOJAS: '3 hojas',
  TRES_HOJAS_FIJO_EXTERIOR: '3 hojas (fijo exterior)',
  CUATRO_HOJAS: '4 hojas',
  SEIS_HOJAS: '6 hojas',
};

interface DefPieza {
  readonly perfil: string;
  readonly largo: (anchoMm: number, altoMm: number) => number;
  readonly cantidad: (cant: number) => number;
}
interface DefVidrio {
  readonly ancho: (anchoMm: number, altoMm: number) => number;
  readonly alto: (anchoMm: number, altoMm: number) => number;
  readonly cantidad: (cant: number) => number;
}
interface DefConfig {
  readonly perfiles: DefPieza[];
  readonly vidrios: DefVidrio[];
}

/**
 * Fórmulas por configuración (a = ANCHO mm, c = ALTO mm, n = CANT.). Varias piezas pueden mapear al
 * MISMO perfil con largos distintos (p. ej. hojas centrales vs. laterales): se suman al comprar varillas.
 */
const ESPECIFICACIONES: Record<ConfigSerie25, DefConfig> = {
  // ===== 2 hojas corrediza =====
  DOS_HOJAS: {
    perfiles: [
      { perfil: 'RIEL SUPERIOR', largo: (a) => a - 16, cantidad: (n) => n },
      { perfil: 'RIEL INFERIOR', largo: (a) => a - 16, cantidad: (n) => n },
      { perfil: 'JAMBA', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 2 + 1, cantidad: (n) => n * 2 },
      { perfil: 'CABEZAL', largo: (a) => a / 2 + 3, cantidad: (n) => n * 2 },
      { perfil: 'PARANTE', largo: (_a, c) => c - 33, cantidad: (n) => n * 2 },
      { perfil: 'TRASLAPO', largo: (_a, c) => c - 33, cantidad: (n) => n * 2 },
    ],
    vidrios: [{ ancho: (a) => a / 2 - 60, alto: (_a, c) => c - 123, cantidad: (n) => n * 2 }],
  },

  // ===== 3 hojas corrediza =====
  TRES_HOJAS: {
    perfiles: [
      { perfil: 'RIEL SUPERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'RIEL INFERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'JAMBA', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 3 + 13, cantidad: (n) => n * 3 },
      { perfil: 'CABEZAL', largo: (a) => a / 3 + 15, cantidad: (n) => n * 3 },
      { perfil: 'PARANTE', largo: (_a, c) => c - 33, cantidad: (n) => n * 2 },
      { perfil: 'TRASLAPO', largo: (_a, c) => c - 33, cantidad: (n) => n * 4 },
    ],
    vidrios: [
      { ancho: (a) => a / 3 - 41, alto: (_a, c) => c - 125, cantidad: (n) => n }, // hoja central
      { ancho: (a) => a / 3 - 51, alto: (_a, c) => c - 125, cantidad: (n) => n * 2 }, // hojas laterales
    ],
  },

  // ===== 3 hojas con fijo exterior (2 corredizas + 1 fija) =====
  TRES_HOJAS_FIJO_EXTERIOR: {
    perfiles: [
      { perfil: 'RIEL SUPERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'RIEL INFERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'JAMBA', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 3 + 9, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 3 + 31, cantidad: (n) => n }, // hoja fija
      { perfil: 'CABEZAL', largo: (a) => a / 3 + 11, cantidad: (n) => n * 2 },
      { perfil: 'CABEZAL', largo: (a) => a / 3 + 31, cantidad: (n) => n }, // hoja fija
      { perfil: 'PARANTE', largo: (_a, c) => c - 33, cantidad: (n) => n },
      { perfil: 'PARANTE', largo: (_a, c) => c, cantidad: (n) => n }, // hoja fija
      { perfil: 'TRASLAPO', largo: (_a, c) => c - 33, cantidad: (n) => n * 3 },
      { perfil: 'TRASLAPO', largo: (_a, c) => c, cantidad: (n) => n }, // traslape del fijo
    ],
    vidrios: [
      { ancho: (a) => a / 3 - 50, alto: (_a, c) => c - 121, cantidad: (n) => n * 2 }, // corredizas
      { ancho: (a) => a / 3 - 32, alto: (_a, c) => c - 89, cantidad: (n) => n }, // fija
    ],
  },

  // ===== 4 hojas corrediza =====
  CUATRO_HOJAS: {
    perfiles: [
      { perfil: 'RIEL SUPERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'RIEL INFERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'JAMBA', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 4 + 7, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 4 + 10, cantidad: (n) => n * 2 },
      { perfil: 'CABEZAL', largo: (a) => a / 4 + 9, cantidad: (n) => n * 2 },
      { perfil: 'CABEZAL', largo: (a) => a / 4 + 10, cantidad: (n) => n * 2 },
      { perfil: 'PARANTE', largo: (_a, c) => c - 33, cantidad: (n) => n * 4 },
      { perfil: 'ADAPTADOR', largo: (_a, c) => c - 33, cantidad: (n) => n },
      { perfil: 'TRASLAPO', largo: (_a, c) => c - 33, cantidad: (n) => n * 4 },
    ],
    vidrios: [{ ancho: (a) => a / 4 - 59, alto: (_a, c) => c - 122, cantidad: (n) => n * 4 }],
  },

  // ===== 6 hojas corrediza =====
  SEIS_HOJAS: {
    perfiles: [
      { perfil: 'RIEL SUPERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'RIEL INFERIOR', largo: (a) => a - 17, cantidad: (n) => n },
      { perfil: 'JAMBA', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'ZOCALO', largo: (a) => a / 6 + 12, cantidad: (n) => n * 4 },
      { perfil: 'ZOCALO', largo: (a) => a / 6 + 31, cantidad: (n) => n * 2 },
      { perfil: 'CABEZAL', largo: (a) => a / 6 + 14, cantidad: (n) => n * 4 },
      { perfil: 'CABEZAL', largo: (a) => a / 6 + 31, cantidad: (n) => n * 2 },
      { perfil: 'PARANTE', largo: (_a, c) => c - 33, cantidad: (n) => n * 2 },
      { perfil: 'PARANTE', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'TRASLAPO', largo: (_a, c) => c - 33, cantidad: (n) => n * 6 },
      { perfil: 'TRASLAPO', largo: (_a, c) => c, cantidad: (n) => n * 2 },
      { perfil: 'ADAPTADOR', largo: (_a, c) => c - 33, cantidad: (n) => n },
    ],
    vidrios: [
      { ancho: (a) => a / 6 - 58, alto: (_a, c) => c - 125, cantidad: (n) => n * 4 },
      { ancho: (a) => a / 6 - 38, alto: (_a, c) => c - 92, cantidad: (n) => n * 2 },
    ],
  },
};

/** Redondea a 4 decimales (evita ruido de coma flotante en metros). */
function redondear(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}

/**
 * Despiece completo de una ventana SERIE 25. `anchoMm`/`altoMm` en mm, `cant` la cantidad de ventanas.
 * Réplica exacta de las fórmulas del maestro; las varillas se calculan sobre barra de 6 m.
 */
export function despiezarSerie25(config: ConfigSerie25, anchoMm: number, altoMm: number, cant: number): DespieceSerie25 {
  const spec = ESPECIFICACIONES[config];
  const a = Math.max(0, anchoMm);
  const c = Math.max(0, altoMm);
  const n = Math.max(0, Math.trunc(cant));

  const cortes: CorteSerie25[] = spec.perfiles
    .map((p) => ({ perfil: p.perfil, largoMm: redondear(p.largo(a, c)), cantidad: p.cantidad(n) }))
    .filter((corte) => corte.cantidad > 0 && corte.largoMm > 0);

  const vidrios: VidrioSerie25[] = spec.vidrios
    .map((v) => ({ anchoMm: redondear(v.ancho(a, c)), altoMm: redondear(v.alto(a, c)), cantidad: v.cantidad(n) }))
    .filter((vidrio) => vidrio.cantidad > 0 && vidrio.anchoMm > 0 && vidrio.altoMm > 0);

  // Varillas por perfil: sumamos todos los cortes del mismo perfil y repartimos en barras de 6 m.
  const metrosPorPerfil = new Map<string, number>();
  for (const corte of cortes) {
    const previo = metrosPorPerfil.get(corte.perfil) ?? 0;
    metrosPorPerfil.set(corte.perfil, previo + (corte.largoMm * corte.cantidad) / 1000);
  }
  const varillas: VarillaSerie25[] = [...metrosPorPerfil.entries()].map(([perfil, metros]) => {
    const barras = Math.ceil(metros / (LARGO_VARILLA_MM / 1000));
    return { perfil, metros: redondear(metros), varillas: barras, sobranteM: redondear((LARGO_VARILLA_MM / 1000) * barras - metros) };
  });

  return { config, anchoMm: a, altoMm: c, cantidad: n, cortes, vidrios, varillas, areaM2: redondear((n * (a * c)) / 1000000) };
}
