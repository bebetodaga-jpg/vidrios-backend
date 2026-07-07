import { PLANCHA_ESTANDAR } from './corte.calculos';

/**
 * Cubicación de obra (Sprint 9): consolida los despieces de la cotización en una lista
 * total de materiales y la cruza contra el stock (funciones puras).
 */
export interface DespieceDeItem {
  readonly cantidadItem: number; // unidades del ítem cotizado
  readonly vidrioCodigo: string;
  readonly vidrioNombre: string;
  readonly perfiles: { nombre: string; cantidad: number; largoMm: number }[];
  readonly panos: { cantidad: number; anchoMm: number; altoMm: number }[];
  readonly accesoriosExtra: { nombre: string; cantidad: number }[];
}

export interface VidrioCubicado {
  readonly codigo: string;
  readonly nombre: string;
  readonly m2: number;
  readonly planchasEstimadas: number;
  readonly stockPlanchas: number;
  readonly faltantePlanchas: number;
}

export interface PerfilCubicado {
  readonly nombre: string;
  readonly metrosLineales: number;
  readonly barrillasEstimadas: number; // de 6.00 m
}

export interface Cubicacion {
  readonly vidrios: VidrioCubicado[];
  readonly perfiles: PerfilCubicado[];
  readonly accesorios: { nombre: string; cantidad: number }[];
}

const M2_POR_PLANCHA = (PLANCHA_ESTANDAR.anchoMm * PLANCHA_ESTANDAR.altoMm) / 1_000_000; // 7.06 m² (3300×2140 mm)

export function cubicar(items: DespieceDeItem[], stockPorCodigo: ReadonlyMap<string, number>): Cubicacion {
  const vidrioAcum = new Map<string, { nombre: string; m2: number }>();
  const perfilAcum = new Map<string, number>(); // nombre → mm lineales
  const accesorioAcum = new Map<string, number>();

  for (const item of items) {
    const m2Item = item.panos.reduce((s, p) => s + (p.cantidad * p.anchoMm * p.altoMm) / 1_000_000, 0) * item.cantidadItem;
    const previo = vidrioAcum.get(item.vidrioCodigo) ?? { nombre: item.vidrioNombre, m2: 0 };
    vidrioAcum.set(item.vidrioCodigo, { nombre: previo.nombre, m2: previo.m2 + m2Item });

    for (const perfil of item.perfiles) {
      const mm = perfil.cantidad * perfil.largoMm * item.cantidadItem;
      perfilAcum.set(perfil.nombre, (perfilAcum.get(perfil.nombre) ?? 0) + mm);
    }
    for (const acc of item.accesoriosExtra) {
      accesorioAcum.set(acc.nombre, (accesorioAcum.get(acc.nombre) ?? 0) + acc.cantidad * item.cantidadItem);
    }
  }

  const vidrios: VidrioCubicado[] = [...vidrioAcum.entries()].map(([codigo, v]) => {
    const planchas = Math.ceil(v.m2 / M2_POR_PLANCHA);
    const stock = stockPorCodigo.get(codigo) ?? 0;
    return {
      codigo,
      nombre: v.nombre,
      m2: Math.round(v.m2 * 100) / 100,
      planchasEstimadas: planchas,
      stockPlanchas: stock,
      faltantePlanchas: Math.max(0, planchas - stock),
    };
  });

  const perfiles: PerfilCubicado[] = [...perfilAcum.entries()].map(([nombre, mm]) => ({
    nombre,
    metrosLineales: Math.round(mm / 10) / 100,
    barrillasEstimadas: Math.ceil(mm / 1000 / 6),
  }));

  return {
    vidrios,
    perfiles,
    accesorios: [...accesorioAcum.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })),
  };
}
