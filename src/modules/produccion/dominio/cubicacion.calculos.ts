import { PLANCHA_ESTANDAR } from './corte.calculos';

/**
 * Cubicación de obra (Sprint 9): consolida los despieces de la cotización en una lista
 * total de materiales y la cruza contra el stock (funciones puras).
 */
export interface DespieceDeItem {
  readonly cantidadItem: number; // unidades del ítem cotizado
  readonly vidrioCodigo: string;
  readonly vidrioNombre: string;
  readonly perfiles: { nombre: string; cantidad: number; largoCm: number }[];
  readonly panos: { cantidad: number; anchoCm: number; altoCm: number }[];
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

const M2_POR_PLANCHA = (PLANCHA_ESTANDAR.anchoCm * PLANCHA_ESTANDAR.altoCm) / 10_000; // 4.32 m²

export function cubicar(items: DespieceDeItem[], stockPorCodigo: ReadonlyMap<string, number>): Cubicacion {
  const vidrioAcum = new Map<string, { nombre: string; m2: number }>();
  const perfilAcum = new Map<string, number>(); // nombre → cm lineales
  const accesorioAcum = new Map<string, number>();

  for (const item of items) {
    const m2Item = item.panos.reduce((s, p) => s + (p.cantidad * p.anchoCm * p.altoCm) / 10_000, 0) * item.cantidadItem;
    const previo = vidrioAcum.get(item.vidrioCodigo) ?? { nombre: item.vidrioNombre, m2: 0 };
    vidrioAcum.set(item.vidrioCodigo, { nombre: previo.nombre, m2: previo.m2 + m2Item });

    for (const perfil of item.perfiles) {
      const cm = perfil.cantidad * perfil.largoCm * item.cantidadItem;
      perfilAcum.set(perfil.nombre, (perfilAcum.get(perfil.nombre) ?? 0) + cm);
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

  const perfiles: PerfilCubicado[] = [...perfilAcum.entries()].map(([nombre, cm]) => ({
    nombre,
    metrosLineales: Math.round(cm) / 100,
    barrillasEstimadas: Math.ceil(cm / 100 / 6),
  }));

  return {
    vidrios,
    perfiles,
    accesorios: [...accesorioAcum.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })),
  };
}
