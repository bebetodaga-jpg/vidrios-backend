import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import {
  DeclaracionCierre,
  FilaCierre,
  esperadoPorMetodo,
  estadoCredito,
  evaluarCierre,
} from '../dominio/caja.calculos';
import { CAJA_REPOSITORIO, CajaRepositorio, MovimientoCajaDetalle, SesionCaja } from '../dominio/caja.repositorio';

@Injectable()
export class EstadoCajaCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  /** ¿Hay caja abierta? Lo consulta el POS para no dejar vender (o sugerir abrir caja). */
  async ejecutar(): Promise<{ abierta: boolean; sesionId?: string; montoInicialCentimos?: number; abiertaEn?: Date }> {
    const sesion = await this.caja.sesionAbierta();
    return sesion
      ? { abierta: true, sesionId: sesion.id, montoInicialCentimos: sesion.montoInicialCentimos, abiertaEn: sesion.abiertaEn }
      : { abierta: false };
  }
}

@Injectable()
export class MovimientosCajaCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  /** Movimientos de la caja abierta (caja del día). Vacío si no hay sesión. */
  async ejecutar(): Promise<MovimientoCajaDetalle[]> {
    const sesion = await this.caja.sesionAbierta();
    return sesion ? this.caja.movimientosDetalle(sesion.id) : [];
  }
}

@Injectable()
export class AbrirCajaCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  async ejecutar(usuarioId: string, montoInicialCentimos: number): Promise<Resultado<{ sesionId: string }>> {
    if (!Number.isInteger(montoInicialCentimos) || montoInicialCentimos < 0) {
      return fallo('MONTO_INVALIDO', 'El monto de apertura debe ser un entero de céntimos no negativo.');
    }
    const abierta = await this.caja.sesionAbierta();
    if (abierta) {
      return fallo('CAJA_YA_ABIERTA', 'Ya hay una caja abierta: ciérrela antes de abrir otra.');
    }
    const sesion = await this.caja.abrir(usuarioId, montoInicialCentimos);
    return ok({ sesionId: sesion.id });
  }
}

@Injectable()
export class RegistrarMovimientoCajaCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  /** Ingresos/egresos manuales. La cajera registra egresos sola (regla del dueño). */
  async ejecutar(comando: {
    tipo: 'INGRESO' | 'EGRESO';
    metodo: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
    concepto: string;
    montoCentimos: number;
  }): Promise<Resultado<void>> {
    if (!Number.isInteger(comando.montoCentimos) || comando.montoCentimos <= 0) {
      return fallo('MONTO_INVALIDO', 'El monto debe ser positivo; el tipo define el signo.');
    }
    if (comando.concepto.trim().length < 3) {
      return fallo('CONCEPTO_REQUERIDO', 'Indique el concepto del movimiento.');
    }
    const sesion = await this.caja.sesionAbierta();
    if (!sesion) {
      return fallo('CAJA_CERRADA', 'No hay una caja abierta.');
    }
    await this.caja.registrarMovimiento(sesion.id, {
      tipo: comando.tipo,
      metodo: comando.metodo,
      concepto: comando.concepto.trim(),
      montoCentimos: comando.tipo === 'EGRESO' ? -comando.montoCentimos : comando.montoCentimos,
    });
    return ok(undefined);
  }
}

@Injectable()
export class CerrarCajaCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  /**
   * Cierre CIEGO: recibe la declaración de la cajera y cierra. NO retorna diferencias —
   * eso es del reporte del gerente. La declaración queda inmutable.
   */
  async ejecutar(declarado: DeclaracionCierre): Promise<Resultado<{ sesionId: string }>> {
    const sesion = await this.caja.sesionAbierta();
    if (!sesion) {
      return fallo('CAJA_CERRADA', 'No hay una caja abierta que cerrar.');
    }
    const montos = [declarado.efectivoCentimos, declarado.tarjetaCentimos, declarado.yapeCentimos];
    if (montos.some((m) => !Number.isInteger(m) || m < 0)) {
      return fallo('DECLARACION_INVALIDA', 'Los montos declarados deben ser céntimos enteros no negativos.');
    }
    await this.caja.cerrar(sesion.id, declarado);
    return ok({ sesionId: sesion.id });
  }
}

@Injectable()
export class ReporteCierreCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  /** Solo GERENTE (guard en el controller): esperado vs declarado con semáforo ±S/5. */
  async ejecutar(sesionId: string): Promise<Resultado<{ sesion: SesionCaja; filas: FilaCierre[] }>> {
    const sesion = await this.caja.sesionPorId(sesionId);
    if (!sesion) {
      return fallo('SESION_NO_EXISTE', 'No existe esa sesión de caja.');
    }
    if (!sesion.cerradaEn || !sesion.declarado) {
      return fallo('CAJA_SIN_CERRAR', 'La caja aún no fue cerrada y declarada por la cajera.');
    }
    const movimientos = await this.caja.movimientosDe(sesionId);
    const esperado = esperadoPorMetodo(sesion.montoInicialCentimos, movimientos);
    return ok({ sesion, filas: evaluarCierre(esperado, sesion.declarado) });
  }
}

@Injectable()
export class CreditosCasoUso {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  async listar(): Promise<
    { id: string; cliente: string; numeroVenta: string; saldoCentimos: number; venceEn: Date; estado: string }[]
  > {
    const cuentas = await this.caja.cuentasPorCobrar();
    const hoy = new Date();
    return cuentas.map((c) => ({ ...c, estado: estadoCredito(c.venceEn, hoy) }));
  }

  /** El cobro entra a la caja del día como ingreso (flujo del prototipo S3). */
  async cobrar(
    cuentaId: string,
    montoCentimos: number,
    metodo: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN',
  ): Promise<Resultado<{ saldoRestanteCentimos: number }>> {
    if (!Number.isInteger(montoCentimos) || montoCentimos <= 0) {
      return fallo('MONTO_INVALIDO', 'El monto del cobro debe ser positivo.');
    }
    const sesion = await this.caja.sesionAbierta();
    if (!sesion) {
      return fallo('CAJA_CERRADA', 'Abra caja para registrar el cobro.');
    }
    const saldoRestante = await this.caja.aplicarCobro(cuentaId, montoCentimos);
    if (saldoRestante === null) {
      return fallo('COBRO_INVALIDO', 'La cuenta no existe o el monto supera el saldo.');
    }
    await this.caja.registrarMovimiento(sesion.id, {
      tipo: 'COBRO_CREDITO',
      metodo,
      concepto: `Cobro de crédito ${cuentaId.slice(0, 8)}`,
      montoCentimos,
    });
    return ok({ saldoRestanteCentimos: saldoRestante });
  }
}
