import { validarMedida } from '@shared/dominio/medidas';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { COLORES_ALUMINIO, Despiece, buscarModelo } from './modelos';

const PIES_POR_M2 = 10.7639;
const MARGEN = 1.35; // margen configurable por el gerente
const FACTOR_ACCESORIOS = 0.08;

export interface VidrioCotizar {
  readonly codigo: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  readonly unidad: 'PIE2' | 'M2';
  readonly grosorMm: number;
  readonly templado: boolean;
}

export interface ItemCotizado {
  readonly despiece: Despiece;
  readonly metrosLinealesAluminio: number;
  readonly m2Vidrio: number;
  readonly unitCentimos: number;
  readonly totalCentimos: number;
}

/**
 * Calcula el despiece y el precio de un ítem de cotización (función pura — corazón del negocio).
 * Vidrio crudo/catedral por pie², templado por m². Reglas de seguridad: mampara/pivotante/spider
 * exigen templado; spider exige 10 mm.
 */
export function calcularItem(
  modeloClave: string,
  vidrio: VidrioCotizar,
  colorClave: string,
  anchoMm: number,
  altoMm: number,
  cantidad: number,
): Resultado<ItemCotizado> {
  const modelo = buscarModelo(modeloClave);
  if (!modelo) {
    return fallo('MODELO_NO_EXISTE', 'El modelo de carpintería no existe.');
  }
  const color = COLORES_ALUMINIO.find((c) => c.clave === colorClave);
  if (!color) {
    return fallo('COLOR_NO_EXISTE', 'El color de aluminio no existe.');
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return fallo('CANTIDAD_INVALIDA', 'La cantidad debe ser un entero mayor que cero.');
  }
  const medida = validarMedida(anchoMm, altoMm);
  if (!medida.exito) {
    return medida;
  }
  if (modelo.soloTemplado && !vidrio.templado) {
    return fallo('EXIGE_TEMPLADO', `El modelo ${modelo.nombre} exige vidrio templado por seguridad.`);
  }
  if (modelo.solo10mm && vidrio.grosorMm !== 10) {
    return fallo('EXIGE_10MM', `El modelo ${modelo.nombre} exige vidrio templado de 10 mm.`);
  }

  const despiece = modelo.despiece(anchoMm, altoMm);

  const mlAluminio = despiece.perfiles.reduce((s, p) => s + (p.cantidad * p.largoMm) / 1000, 0);
  const costoAlu = Math.round((mlAluminio / 6.0) * modelo.barrillaCentimos * color.factor);

  const m2 = despiece.panos.reduce((s, p) => s + (p.cantidad * p.anchoMm * p.altoMm) / 1_000_000, 0);
  const costoVid = vidrio.unidad === 'PIE2' ? Math.round(m2 * PIES_POR_M2 * vidrio.precioCentimos) : Math.round(m2 * vidrio.precioCentimos);

  const extra = despiece.accesoriosExtra.reduce((s, x) => s + x.cantidad * x.precioCentimos, 0);
  const accesorios = Math.round((costoAlu + costoVid) * FACTOR_ACCESORIOS) + extra;

  const unit = Math.round((costoAlu + costoVid + accesorios + modelo.manoObraCentimos) * MARGEN);

  return ok({
    despiece,
    metrosLinealesAluminio: Math.round(mlAluminio * 100) / 100,
    m2Vidrio: Math.round(m2 * 100) / 100,
    unitCentimos: unit,
    totalCentimos: unit * cantidad,
  });
}
