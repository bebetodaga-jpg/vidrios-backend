import { Resultado, fallo, ok } from '@shared/dominio/resultado';

export type TipoMedida = 'INICIAL' | 'REMETREO';
export type RolMedidor = 'CAJERA' | 'VENDEDORA' | 'CORTADOR' | 'AYUDANTE' | 'MAESTRO' | 'GERENTE';

/**
 * Versionado de medidas (funciones puras). La medida NUNCA se sobrescribe: la primera medición
 * del vano es INICIAL y las siguientes son REMETREO. Solo GERENTE/MAESTRO remetrean (regla del dueño).
 */
export function tipoSiguienteMedida(medidasPrevias: number): TipoMedida {
  return medidasPrevias === 0 ? 'INICIAL' : 'REMETREO';
}

export function autorizarMedida(tipo: TipoMedida, rol: RolMedidor): Resultado<void> {
  if (tipo === 'REMETREO' && rol !== 'GERENTE' && rol !== 'MAESTRO') {
    return fallo('REMETREO_NO_AUTORIZADO', 'Solo el gerente o el maestro pueden remetrear una medida ya enviada.');
  }
  return ok(undefined);
}

/** Si el trabajo tiene detalle, la foto del vano es obligatoria (regla del dueño). */
export function exigeFoto(tieneDetalle: boolean, hayFoto: boolean): Resultado<void> {
  if (tieneDetalle && !hayFoto) {
    return fallo('FOTO_REQUERIDA', 'Este vano tiene detalle: la foto es obligatoria.');
  }
  return ok(undefined);
}
