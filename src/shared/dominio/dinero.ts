import { Resultado, fallo, ok } from './resultado';

/**
 * Dinero en céntimos enteros (ADR-004): S/ 4.50 = 450.
 * Evita los errores de coma flotante (0.1 + 0.2 ≠ 0.3) en precios, caja y kárdex.
 * Todos los montos del sistema incluyen IGV (regla del dueño).
 */
export class Dinero {
  private constructor(readonly centimos: number) {}

  static desdeCentimos(centimos: number): Resultado<Dinero> {
    if (!Number.isInteger(centimos) || centimos < 0) {
      return fallo('DINERO_INVALIDO', 'El monto debe ser un entero de céntimos no negativo.');
    }
    return ok(new Dinero(centimos));
  }

  static desdeSoles(soles: number): Resultado<Dinero> {
    return Dinero.desdeCentimos(Math.round(soles * 100));
  }

  sumar(otro: Dinero): Dinero {
    return new Dinero(this.centimos + otro.centimos);
  }

  /** Multiplica por un factor (área en pies²/m², factor de color…) redondeando al céntimo. */
  multiplicar(factor: number): Dinero {
    return new Dinero(Math.round(this.centimos * factor));
  }

  get soles(): number {
    return this.centimos / 100;
  }

  /** Formato para UI y documentos: "S/ 1,250.50". */
  formato(): string {
    return 'S/ ' + this.soles.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
