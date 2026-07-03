import { Dinero } from '@shared/dominio/dinero';
import { MedidaCm, aM2, aPies2, areaCm2, validarMedida } from '@shared/dominio/medidas';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { Producto, UnidadVenta } from './producto';

/**
 * Cálculo de importes: FUNCIONES PURAS (estándar §1) — el corazón monetario del sistema,
 * por eso vive aislado y con la cobertura de pruebas más alta.
 */
export interface ImporteCalculado {
  readonly importe: Dinero;
  /** Área en la unidad de venta del producto (pie² o m²); undefined para barrilla/unidad. */
  readonly area?: number;
  readonly unidad: UnidadVenta;
}

export function calcularImporte(
  producto: Producto,
  cantidad: number,
  medida?: { anchoCm: number; altoCm: number },
): Resultado<ImporteCalculado> {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return fallo('CANTIDAD_INVALIDA', 'La cantidad debe ser un entero mayor que cero.');
  }

  const unidad = producto.unidadVenta;
  const esPorArea = unidad === UnidadVenta.PIE2 || unidad === UnidadVenta.M2;

  if (!esPorArea) {
    // Barrillas y unidades: precio × cantidad.
    return ok({ importe: producto.precio.multiplicar(cantidad), unidad });
  }

  if (!medida) {
    return fallo('MEDIDA_REQUERIDA', 'La venta de vidrio requiere ancho y alto en centímetros.');
  }
  const medidaValida = validarMedida(medida.anchoCm, medida.altoCm);
  if (!medidaValida.exito) {
    return medidaValida;
  }

  const area = areaEnUnidadDeVenta(medidaValida.valor, unidad);
  return ok({ importe: producto.precio.multiplicar(area * cantidad), area, unidad });
}

function areaEnUnidadDeVenta(medida: MedidaCm, unidad: UnidadVenta.PIE2 | UnidadVenta.M2): number {
  const cm2 = areaCm2(medida);
  return unidad === UnidadVenta.PIE2 ? aPies2(cm2) : aM2(cm2);
}
