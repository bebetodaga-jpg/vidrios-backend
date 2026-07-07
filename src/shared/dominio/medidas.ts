import { Resultado, fallo, ok } from './resultado';

/**
 * Funciones puras de medidas (ADR-004). Lineales en MILÍMETROS ENTEROS —
 * en vidriería se mide al milímetro (ej. 1553 mm); el vidrio crudo/catedral/espejo
 * se vende por PIE² y el templado por M² (regla del dueño).
 */
export const MM2_POR_PIE2 = 92_903.04; // 1 pie = 304.8 mm
export const MM2_POR_M2 = 1_000_000;

export interface MedidaMm {
  readonly anchoMm: number;
  readonly altoMm: number;
}

/** mm entero positivo: el milímetro es la unidad mínima del taller (no hay fracciones). */
function esMmValido(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0;
}

export function validarMedida(anchoMm: number, altoMm: number): Resultado<MedidaMm> {
  if (!esMmValido(anchoMm) || !esMmValido(altoMm)) {
    return fallo('MEDIDA_INVALIDA', 'Ancho y alto en milímetros enteros (ej. 1553).');
  }
  return ok({ anchoMm, altoMm });
}

export function areaMm2(medida: MedidaMm): number {
  return medida.anchoMm * medida.altoMm;
}

export function aPies2(mm2: number): number {
  return mm2 / MM2_POR_PIE2;
}

export function aM2(mm2: number): number {
  return mm2 / MM2_POR_M2;
}
