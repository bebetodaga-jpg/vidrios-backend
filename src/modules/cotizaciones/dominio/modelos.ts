/**
 * Modelos paramétricos de carpintería (Sprint 6 ★). Cada modelo define su DESPIECE
 * (perfiles + paños) en función de las medidas del vano, con los DESCUENTOS DE FABRICACIÓN
 * ya incorporados en las fórmulas de los paños.
 *
 * ⚠ Los precios de barrilla/mano de obra y las fórmulas son de EJEMPLO: el gerente los valida
 * contra 10 cotizaciones históricas (criterio de aceptación del TDR para este sprint).
 *
 * SERIE 25 (ventana de aluminio) usa el motor `serie25.calculos` con las fórmulas exactas del
 * fabricante (verificadas contra SERIE25_V5.xlsx); cada nº de hojas es un modelo seleccionable.
 */
import { ConfigSerie25, despiezarSerie25 } from './serie25.calculos';

export interface PerfilDespiece {
  readonly nombre: string;
  readonly cantidad: number;
  readonly largoCm: number;
}
export interface PanoDespiece {
  readonly cantidad: number;
  readonly anchoCm: number;
  readonly altoCm: number;
}
export interface AccesorioExtra {
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioCentimos: number;
}
export interface Despiece {
  readonly perfiles: PerfilDespiece[];
  readonly panos: PanoDespiece[];
  readonly accesoriosExtra: AccesorioExtra[];
}

export interface DefinicionModelo {
  readonly clave: string;
  readonly nombre: string;
  readonly barrillaCentimos: number; // precio promedio de barrilla 6 m de la serie (a validar)
  readonly manoObraCentimos: number;
  readonly soloTemplado: boolean;
  readonly solo10mm: boolean;
  readonly descuentoFabricacion: string;
  readonly despiece: (anchoCm: number, altoCm: number) => Despiece;
}

const sinExtra = (perfiles: PerfilDespiece[], panos: PanoDespiece[]): Despiece => ({ perfiles, panos, accesoriosExtra: [] });

export const MODELOS: Record<string, DefinicionModelo> = {
  corrediza: {
    clave: 'corrediza',
    nombre: 'Ventana corrediza (serie)',
    barrillaCentimos: 3200,
    manoObraCentimos: 4500,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'Paño = (ancho ÷ hojas) − 3 cm · alto − 6 cm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Riel superior', cantidad: 1, largoCm: a },
          { nombre: 'Riel inferior', cantidad: 1, largoCm: a },
          { nombre: 'Jamba lateral', cantidad: 2, largoCm: h },
          { nombre: 'Zócalo de hoja', cantidad: 4, largoCm: a / 2 },
          { nombre: 'Parante de hoja', cantidad: 4, largoCm: h },
        ],
        [{ cantidad: 2, anchoCm: a / 2 - 3, altoCm: h - 6 }],
      ),
  },
  mampara: {
    clave: 'mampara',
    nombre: 'Mampara (serie)',
    barrillaCentimos: 4800,
    manoObraCentimos: 9000,
    soloTemplado: true,
    solo10mm: false,
    descuentoFabricacion: 'Paño = (ancho ÷ 2) − 1 cm · alto − 2 cm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Perfil U superior', cantidad: 1, largoCm: a },
          { nombre: 'Perfil U lateral', cantidad: 2, largoCm: h },
          { nombre: 'Zócalo', cantidad: 2, largoCm: a / 2 },
        ],
        [{ cantidad: 2, anchoCm: a / 2 - 1, altoCm: h - 2 }],
      ),
  },
  vitroven: {
    clave: 'vitroven',
    nombre: 'Vitrovén',
    barrillaCentimos: 2800,
    manoObraCentimos: 3500,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'Paleta = ancho − 2 cm · 1 paleta cada 15 cm de alto',
    despiece: (a, h) => {
      const paletas = Math.ceil(h / 15);
      return sinExtra(
        [
          { nombre: 'Marco lateral portapaleta', cantidad: 2, largoCm: h },
          { nombre: 'Marco horizontal', cantidad: 2, largoCm: a },
        ],
        [{ cantidad: paletas, anchoCm: a - 2, altoCm: 15 }],
      );
    },
  },
  guillotina: {
    clave: 'guillotina',
    nombre: 'Guillotina',
    barrillaCentimos: 3000,
    manoObraCentimos: 5500,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: '2 paños: ancho − 4 cm · (alto ÷ 2) − 5 cm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Marco perimetral horizontal', cantidad: 2, largoCm: a },
          { nombre: 'Marco perimetral vertical', cantidad: 2, largoCm: h },
          { nombre: 'Travesaño de encuentro', cantidad: 1, largoCm: a },
        ],
        [{ cantidad: 2, anchoCm: a - 4, altoCm: h / 2 - 5 }],
      ),
  },
  pivotante: {
    clave: 'pivotante',
    nombre: 'Pivotante',
    barrillaCentimos: 4400,
    manoObraCentimos: 11000,
    soloTemplado: true,
    solo10mm: false,
    descuentoFabricacion: 'Paño = ancho − 12 cm · alto − 18 cm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Marco cabezal', cantidad: 1, largoCm: a },
          { nombre: 'Marco lateral', cantidad: 2, largoCm: h },
          { nombre: 'Hoja: travesaño', cantidad: 2, largoCm: a },
          { nombre: 'Hoja: parante', cantidad: 2, largoCm: h },
        ],
        [{ cantidad: 1, anchoCm: a - 12, altoCm: h - 18 }],
      ),
  },
  spider: {
    clave: 'spider',
    nombre: 'Spider (templado 10 mm)',
    barrillaCentimos: 0,
    manoObraCentimos: 16000,
    soloTemplado: true,
    solo10mm: true,
    descuentoFabricacion: 'Paño = medida exacta − 0.5 cm (sin marco; 4 arañas inox)',
    despiece: (a, h) => ({
      perfiles: [],
      panos: [{ cantidad: 1, anchoCm: a - 0.5, altoCm: h - 0.5 }],
      accesoriosExtra: [{ nombre: 'Araña spider inox 2 brazos', cantidad: 4, precioCentimos: 4500 }],
    }),
  },
  fijo: {
    clave: 'fijo',
    nombre: 'Paño fijo',
    barrillaCentimos: 2800,
    manoObraCentimos: 3000,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'Paño = ancho − 4 cm · alto − 4 cm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Marco perimetral horizontal', cantidad: 2, largoCm: a },
          { nombre: 'Marco perimetral vertical', cantidad: 2, largoCm: h },
        ],
        [{ cantidad: 1, anchoCm: a - 4, altoCm: h - 4 }],
      ),
  },
  otro: {
    clave: 'otro',
    nombre: 'Otro (a medida)',
    barrillaCentimos: 3200,
    manoObraCentimos: 6000,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'Definido por el gerente al cotizar',
    despiece: (a, h) => sinExtra([{ nombre: 'Perfilería estimada', cantidad: 4, largoCm: (a + h) / 2 }], [{ cantidad: 1, anchoCm: a - 4, altoCm: h - 4 }]),
  },
};

/** Búsqueda segura de un modelo por clave (retorna undefined si no existe). */
export function buscarModelo(clave: string): DefinicionModelo | undefined {
  return Object.prototype.hasOwnProperty.call(MODELOS, clave) ? MODELOS[clave] : undefined;
}

export const COLORES_ALUMINIO = [
  { clave: 'natural', nombre: 'Natural (mate)', factor: 1.0 },
  { clave: 'negro', nombre: 'Negro', factor: 1.1 },
  { clave: 'bronce', nombre: 'Bronce', factor: 1.08 },
  { clave: 'blanco', nombre: 'Blanco', factor: 1.12 },
] as const;
