import { Resultado, fallo, ok } from '@shared/dominio/resultado';

/**
 * Reglas fiscales SUNAT (funciones puras — estándar §1). El precio en Perú INCLUYE IGV
 * (18%, regla del dueño): hay que desglosar la base gravada y el IGV a partir del total.
 */
export const TASA_IGV = 0.18;

/** Boleta por importe ≥ S/ 700 exige DNI del cliente (regla SUNAT, validada en el prototipo UX). */
export const LIMITE_BOLETA_SIN_DNI_CENTIMOS = 70_000;

export enum TipoComprobante {
  BOLETA = 'BOLETA',
  FACTURA = 'FACTURA',
  NOTA_CREDITO = 'NOTA_CREDITO',
}

export interface DesgloseIgv {
  readonly gravadaCentimos: number;
  readonly igvCentimos: number;
  readonly totalCentimos: number;
}

/** total (inc. IGV) → base gravada + IGV. Se reparte el céntimo de redondeo al IGV. */
export function desglosarIgv(totalCentimos: number): DesgloseIgv {
  const gravada = Math.round(totalCentimos / (1 + TASA_IGV));
  return { gravadaCentimos: gravada, igvCentimos: totalCentimos - gravada, totalCentimos };
}

export interface DatosClienteComprobante {
  readonly tipoDoc: 'DNI' | 'RUC' | 'SIN_DOCUMENTO';
  readonly numeroDoc?: string;
  readonly nombre: string;
}

const esDni = (n: string | undefined): n is string => !!n && /^\d{8}$/.test(n);
const esRuc = (n: string | undefined): n is string => !!n && /^(10|20)\d{9}$/.test(n);

/**
 * Valida que el cliente sea coherente con el tipo de comprobante y el monto.
 * FACTURA → RUC; BOLETA ≥ S/700 → DNI; BOLETA < S/700 → puede ir como público general.
 */
export function validarCliente(
  tipo: TipoComprobante,
  cliente: DatosClienteComprobante,
  totalCentimos: number,
): Resultado<DatosClienteComprobante> {
  if (tipo === TipoComprobante.FACTURA) {
    if (!esRuc(cliente.numeroDoc)) {
      return fallo('RUC_INVALIDO', 'La factura requiere un RUC válido (11 dígitos, empieza en 10 o 20).');
    }
    return ok(cliente);
  }

  // BOLETA y NOTA_CREDITO (la NC hereda el cliente del comprobante que anula).
  if (totalCentimos >= LIMITE_BOLETA_SIN_DNI_CENTIMOS && !esDni(cliente.numeroDoc)) {
    return fallo('DNI_REQUERIDO', 'Esta venta supera S/ 700: la boleta exige el DNI del cliente (8 dígitos).');
  }
  if (cliente.numeroDoc !== undefined && cliente.numeroDoc !== '' && !esDni(cliente.numeroDoc)) {
    return fallo('DNI_INVALIDO', 'El DNI debe tener 8 dígitos.');
  }
  return ok(cliente);
}
