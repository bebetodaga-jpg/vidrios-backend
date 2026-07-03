import { Resultado, fallo, ok } from '@shared/dominio/resultado';

/** Adelanto por defecto del contrato (regla comercial del cotizador: 60% a la firma). */
export const ADELANTO_PCT_DEFECTO = 60;

export interface Cronograma {
  readonly adelantoCentimos: number;
  readonly saldoCentimos: number;
}

/** Reparte el total en adelanto + saldo según el % de adelanto (funciones puras). */
export function cronograma(totalCentimos: number, adelantoPct: number): Resultado<Cronograma> {
  if (!Number.isInteger(adelantoPct) || adelantoPct < 0 || adelantoPct > 100) {
    return fallo('ADELANTO_INVALIDO', 'El adelanto debe ser un porcentaje entre 0 y 100.');
  }
  const adelanto = Math.round((totalCentimos * adelantoPct) / 100);
  return ok({ adelantoCentimos: adelanto, saldoCentimos: totalCentimos - adelanto });
}

/** Valida un cobro contra el saldo pendiente del contrato. */
export function validarPago(montoCentimos: number, totalCentimos: number, pagadoCentimos: number): Resultado<void> {
  if (!Number.isInteger(montoCentimos) || montoCentimos <= 0) {
    return fallo('MONTO_INVALIDO', 'El monto del pago debe ser positivo.');
  }
  if (pagadoCentimos + montoCentimos > totalCentimos) {
    return fallo('SALDO_EXCEDIDO', 'El pago supera el saldo pendiente del contrato.');
  }
  return ok(undefined);
}
