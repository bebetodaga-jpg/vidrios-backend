import { Resultado, fallo, ok } from '@shared/dominio/resultado';

export type EstadoObra = 'MEDICION' | 'REMETREO' | 'CORTE' | 'FABRICACION' | 'INSTALACION' | 'ENTREGADA';

/** Flujo lineal de la obra (kanban). No se salta una etapa: no se corta sin remetreo aprobado. */
export const ORDEN_OBRA: EstadoObra[] = ['MEDICION', 'REMETREO', 'CORTE', 'FABRICACION', 'INSTALACION', 'ENTREGADA'];

export function avanzarEstadoObra(actual: EstadoObra, nuevo: EstadoObra): Resultado<void> {
  const iActual = ORDEN_OBRA.indexOf(actual);
  const iNuevo = ORDEN_OBRA.indexOf(nuevo);
  if (iNuevo !== iActual + 1) {
    return fallo('TRANSICION_INVALIDA', `La obra no puede pasar de ${actual} a ${nuevo}: las etapas avanzan una a una.`);
  }
  return ok(undefined);
}
