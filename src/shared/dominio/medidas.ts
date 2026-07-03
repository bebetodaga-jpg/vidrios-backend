import { Resultado, fallo, ok } from './resultado';

/**
 * Funciones puras de medidas (ADR-004). Lineales en cm con 1 decimal —
 * en vidriería se mide al milímetro (ej. 155.3 cm); el vidrio crudo/catedral/espejo
 * se vende por PIE² y el templado por M² (regla del dueño).
 */
export const CM2_POR_PIE2 = 929.0304; // 1 pie = 30.48 cm
export const CM2_POR_M2 = 10_000;

export interface MedidaCm {
  readonly anchoCm: number;
  readonly altoCm: number;
}

/** cm positivo con 1 decimal como máximo (tolerancia por flotantes: 155.3*10 = 1553.0000…2). */
function esCmValido(valor: number): boolean {
  return valor > 0 && Math.abs(valor * 10 - Math.round(valor * 10)) < 1e-9;
}

export function validarMedida(anchoCm: number, altoCm: number): Resultado<MedidaCm> {
  if (!esCmValido(anchoCm) || !esCmValido(altoCm)) {
    return fallo('MEDIDA_INVALIDA', 'Ancho y alto en centímetros, con 1 decimal como máximo (ej. 155.3).');
  }
  return ok({ anchoCm, altoCm });
}

export function areaCm2(medida: MedidaCm): number {
  return medida.anchoCm * medida.altoCm;
}

export function aPies2(cm2: number): number {
  return cm2 / CM2_POR_PIE2;
}

export function aM2(cm2: number): number {
  return cm2 / CM2_POR_M2;
}
