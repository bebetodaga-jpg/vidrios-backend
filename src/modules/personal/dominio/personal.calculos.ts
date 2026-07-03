import { Resultado, fallo, ok } from '@shared/dominio/resultado';

// ===== Tipos de pago =====

export type TipoPago = 'ADELANTO' | 'PAGO' | 'DESTAJO';
export const TIPOS_PAGO_VALIDOS: TipoPago[] = ['ADELANTO', 'PAGO', 'DESTAJO'];

// ===== Especialidades de personal externo =====

export type Especialidad = 'MAESTRO_OBRA' | 'CORTADOR' | 'INSTALADOR' | 'AYUDANTE';
export const ESPECIALIDADES_VALIDAS: Especialidad[] = ['MAESTRO_OBRA', 'CORTADOR', 'INSTALADOR', 'AYUDANTE'];

// ===== Validaciones de pago (funciones puras) =====

/** Valida que un pago tiene datos coherentes antes de registrarlo. */
export function validarPago(montoCentimos: number, tipo: string, concepto: string): Resultado<void> {
  if (!Number.isInteger(montoCentimos) || montoCentimos <= 0) {
    return fallo('MONTO_INVALIDO', 'El monto del pago debe ser un entero positivo (en céntimos).');
  }
  if (!TIPOS_PAGO_VALIDOS.includes(tipo as TipoPago)) {
    return fallo('TIPO_INVALIDO', `Tipo de pago inválido: ${tipo}. Debe ser ADELANTO, PAGO o DESTAJO.`);
  }
  if (!concepto || concepto.trim().length === 0) {
    return fallo('CONCEPTO_VACIO', 'El concepto del pago es obligatorio.');
  }
  return ok(undefined);
}

// ===== Validaciones de personal =====

/** Valida los datos mínimos para registrar personal externo. */
export function validarPersonal(nombre: string, dni: string, especialidad: string): Resultado<void> {
  if (!nombre || nombre.trim().length < 3) {
    return fallo('NOMBRE_INVALIDO', 'El nombre debe tener al menos 3 caracteres.');
  }
  if (!/^\d{8}$/.test(dni)) {
    return fallo('DNI_INVALIDO', 'El DNI debe tener exactamente 8 dígitos.');
  }
  if (!ESPECIALIDADES_VALIDAS.includes(especialidad as Especialidad)) {
    return fallo('ESPECIALIDAD_INVALIDA', `Especialidad inválida: ${especialidad}. Debe ser MAESTRO_OBRA, CORTADOR, INSTALADOR o AYUDANTE.`);
  }
  return ok(undefined);
}

// ===== Cálculos de resumen (funciones puras) =====

export interface PagoParaResumen {
  readonly tipo: TipoPago;
  readonly montoCentimos: number;
}

export interface ResumenPagos {
  readonly totalCentimos: number;
  readonly adelantosCentimos: number;
  readonly pagosCentimos: number;
  readonly destajosCentimos: number;
  readonly cantidadPagos: number;
}

/** Calcula el total pagado a partir de una lista de pagos. */
export function calcularTotalPagado(pagos: PagoParaResumen[]): number {
  return pagos.reduce((acum, p) => acum + p.montoCentimos, 0);
}

/** Calcula el resumen desglosado de pagos por tipo. */
export function calcularResumenPagos(pagos: PagoParaResumen[]): ResumenPagos {
  let adelantosCentimos = 0;
  let pagosCentimos = 0;
  let destajosCentimos = 0;

  for (const pago of pagos) {
    switch (pago.tipo) {
      case 'ADELANTO':
        adelantosCentimos += pago.montoCentimos;
        break;
      case 'PAGO':
        pagosCentimos += pago.montoCentimos;
        break;
      case 'DESTAJO':
        destajosCentimos += pago.montoCentimos;
        break;
    }
  }

  return {
    totalCentimos: adelantosCentimos + pagosCentimos + destajosCentimos,
    adelantosCentimos,
    pagosCentimos,
    destajosCentimos,
    cantidadPagos: pagos.length,
  };
}
