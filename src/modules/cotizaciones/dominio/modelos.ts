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
  readonly largoMm: number;
}
export interface PanoDespiece {
  readonly cantidad: number;
  readonly anchoMm: number;
  readonly altoMm: number;
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
  readonly despiece: (anchoMm: number, altoMm: number) => Despiece;
}

const sinExtra = (perfiles: PerfilDespiece[], panos: PanoDespiece[]): Despiece => ({ perfiles, panos, accesoriosExtra: [] });

/**
 * Construye un modelo de la SERIE 25 a partir de una configuración de hojas. Todo el sistema
 * trabaja en mm, igual que las fórmulas del fabricante: se despieza directo con el motor
 * verificado (cantidad 1: el precio se multiplica por la cantidad más arriba).
 */
function modeloSerie25(config: ConfigSerie25, clave: string, nombre: string, barrillaCentimos: number, manoObraCentimos: number): DefinicionModelo {
  return {
    clave,
    nombre,
    barrillaCentimos,
    manoObraCentimos,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'SERIE 25 — fórmulas del fabricante (varilla 6 m)',
    despiece: (a, h): Despiece => {
      const d = despiezarSerie25(config, a, h, 1);
      return {
        perfiles: d.cortes.map((c) => ({ nombre: c.perfil, cantidad: c.cantidad, largoMm: c.largoMm })),
        panos: d.vidrios.map((v) => ({ cantidad: v.cantidad, anchoMm: v.anchoMm, altoMm: v.altoMm })),
        accesoriosExtra: [],
      };
    },
  };
}

export const MODELOS: Record<string, DefinicionModelo> = {
  corrediza: {
    clave: 'corrediza',
    nombre: 'Ventana corrediza (serie)',
    barrillaCentimos: 3200,
    manoObraCentimos: 4500,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'Paño = (ancho ÷ hojas) − 30 mm · alto − 60 mm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Riel superior', cantidad: 1, largoMm: a },
          { nombre: 'Riel inferior', cantidad: 1, largoMm: a },
          { nombre: 'Jamba lateral', cantidad: 2, largoMm: h },
          { nombre: 'Zócalo de hoja', cantidad: 4, largoMm: a / 2 },
          { nombre: 'Parante de hoja', cantidad: 4, largoMm: h },
        ],
        [{ cantidad: 2, anchoMm: a / 2 - 30, altoMm: h - 60 }],
      ),
  },
  mampara: {
    clave: 'mampara',
    nombre: 'Mampara (serie)',
    barrillaCentimos: 4800,
    manoObraCentimos: 9000,
    soloTemplado: true,
    solo10mm: false,
    descuentoFabricacion: 'Paño = (ancho ÷ 2) − 10 mm · alto − 20 mm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Perfil U superior', cantidad: 1, largoMm: a },
          { nombre: 'Perfil U lateral', cantidad: 2, largoMm: h },
          { nombre: 'Zócalo', cantidad: 2, largoMm: a / 2 },
        ],
        [{ cantidad: 2, anchoMm: a / 2 - 10, altoMm: h - 20 }],
      ),
  },
  vitroven: {
    clave: 'vitroven',
    nombre: 'Vitrovén',
    barrillaCentimos: 2800,
    manoObraCentimos: 3500,
    soloTemplado: false,
    solo10mm: false,
    descuentoFabricacion: 'Paleta = ancho − 20 mm · 1 paleta cada 150 mm de alto',
    despiece: (a, h) => {
      const paletas = Math.ceil(h / 150);
      return sinExtra(
        [
          { nombre: 'Marco lateral portapaleta', cantidad: 2, largoMm: h },
          { nombre: 'Marco horizontal', cantidad: 2, largoMm: a },
        ],
        [{ cantidad: paletas, anchoMm: a - 20, altoMm: 150 }],
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
    descuentoFabricacion: '2 paños: ancho − 40 mm · (alto ÷ 2) − 50 mm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Marco perimetral horizontal', cantidad: 2, largoMm: a },
          { nombre: 'Marco perimetral vertical', cantidad: 2, largoMm: h },
          { nombre: 'Travesaño de encuentro', cantidad: 1, largoMm: a },
        ],
        [{ cantidad: 2, anchoMm: a - 40, altoMm: h / 2 - 50 }],
      ),
  },
  pivotante: {
    clave: 'pivotante',
    nombre: 'Pivotante',
    barrillaCentimos: 4400,
    manoObraCentimos: 11000,
    soloTemplado: true,
    solo10mm: false,
    descuentoFabricacion: 'Paño = ancho − 120 mm · alto − 180 mm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Marco cabezal', cantidad: 1, largoMm: a },
          { nombre: 'Marco lateral', cantidad: 2, largoMm: h },
          { nombre: 'Hoja: travesaño', cantidad: 2, largoMm: a },
          { nombre: 'Hoja: parante', cantidad: 2, largoMm: h },
        ],
        [{ cantidad: 1, anchoMm: a - 120, altoMm: h - 180 }],
      ),
  },
  spider: {
    clave: 'spider',
    nombre: 'Spider (templado 10 mm)',
    barrillaCentimos: 0,
    manoObraCentimos: 16000,
    soloTemplado: true,
    solo10mm: true,
    descuentoFabricacion: 'Paño = medida exacta − 5 mm (sin marco; 4 arañas inox)',
    despiece: (a, h) => ({
      perfiles: [],
      panos: [{ cantidad: 1, anchoMm: a - 5, altoMm: h - 5 }],
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
    descuentoFabricacion: 'Paño = ancho − 40 mm · alto − 40 mm',
    despiece: (a, h) =>
      sinExtra(
        [
          { nombre: 'Marco perimetral horizontal', cantidad: 2, largoMm: a },
          { nombre: 'Marco perimetral vertical', cantidad: 2, largoMm: h },
        ],
        [{ cantidad: 1, anchoMm: a - 40, altoMm: h - 40 }],
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
    despiece: (a, h) => sinExtra([{ nombre: 'Perfilería estimada', cantidad: 4, largoMm: (a + h) / 2 }], [{ cantidad: 1, anchoMm: a - 40, altoMm: h - 40 }]),
  },

  // ===== SERIE 25 (ventana de aluminio) — fórmulas del fabricante. Mano de obra sube con el nº de hojas.
  serie25_2h: modeloSerie25('DOS_HOJAS', 'serie25_2h', 'Ventana SERIE 25 · 2 hojas', 3200, 5000),
  serie25_3h: modeloSerie25('TRES_HOJAS', 'serie25_3h', 'Ventana SERIE 25 · 3 hojas', 3200, 7000),
  serie25_3h_fijo: modeloSerie25('TRES_HOJAS_FIJO_EXTERIOR', 'serie25_3h_fijo', 'Ventana SERIE 25 · 3 hojas (fijo exterior)', 3200, 8000),
  serie25_4h: modeloSerie25('CUATRO_HOJAS', 'serie25_4h', 'Ventana SERIE 25 · 4 hojas', 3200, 9000),
  serie25_6h: modeloSerie25('SEIS_HOJAS', 'serie25_6h', 'Ventana SERIE 25 · 6 hojas', 3200, 13000),
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
