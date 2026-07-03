import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { ADELANTO_PCT_DEFECTO, cronograma, validarPago } from '../dominio/contrato.calculos';
import {
  CONTRATO_REPOSITORIO,
  COTIZACION_CONTRATOS,
  ContratoDetalle,
  ContratoRepositorio,
  ContratoResumen,
  CotizacionParaContratos,
} from '../dominio/contratos.puertos';

@Injectable()
export class CrearContratoCasoUso {
  constructor(
    @Inject(COTIZACION_CONTRATOS) private readonly cotizaciones: CotizacionParaContratos,
    @Inject(CONTRATO_REPOSITORIO) private readonly contratos: ContratoRepositorio,
  ) {}

  /** Genera el contrato desde una cotización ACEPTADA (no se contrata un borrador). */
  async ejecutar(cotizacionId: string, adelantoPct = ADELANTO_PCT_DEFECTO, firmaDataUrl?: string): Promise<Resultado<{ id: string; numero: string }>> {
    const cot = await this.cotizaciones.cotizacion(cotizacionId);
    if (!cot) {
      return fallo('COTIZACION_NO_EXISTE', 'No existe la cotización.');
    }
    if (cot.estado !== 'ACEPTADA') {
      return fallo('COTIZACION_NO_ACEPTADA', 'Solo se genera contrato a partir de una cotización aceptada.');
    }
    if (await this.contratos.yaTieneContrato(cotizacionId)) {
      return fallo('YA_TIENE_CONTRATO', 'Esta cotización ya tiene un contrato.');
    }
    const crono = cronograma(cot.totalCentimos, adelantoPct);
    if (!crono.exito) {
      return crono;
    }
    return ok(
      await this.contratos.crear({
        cotizacionId,
        clienteId: cot.clienteId,
        obraId: cot.obraId,
        totalCentimos: cot.totalCentimos,
        adelantoCentimos: crono.valor.adelantoCentimos,
        saldoCentimos: crono.valor.saldoCentimos,
        firmaDataUrl,
      }),
    );
  }
}

@Injectable()
export class RegistrarPagoContratoCasoUso {
  constructor(@Inject(CONTRATO_REPOSITORIO) private readonly contratos: ContratoRepositorio) {}

  async ejecutar(id: string, montoCentimos: number, metodo: string): Promise<Resultado<{ pagadoCentimos: number; saldoPendienteCentimos: number }>> {
    const detalle = await this.contratos.detalle(id);
    if (!detalle) {
      return fallo('CONTRATO_NO_EXISTE', 'No existe el contrato.');
    }
    const valido = validarPago(montoCentimos, detalle.totalCentimos, detalle.pagadoCentimos);
    if (!valido.exito) {
      return valido;
    }
    return ok(await this.contratos.registrarPago(id, montoCentimos, metodo));
  }
}

@Injectable()
export class GuardarFirmaCasoUso {
  constructor(@Inject(CONTRATO_REPOSITORIO) private readonly contratos: ContratoRepositorio) {}

  async ejecutar(id: string, dataUrl: string): Promise<Resultado<void>> {
    if (!dataUrl.startsWith('data:image/')) {
      return fallo('FIRMA_INVALIDA', 'La firma debe ser una imagen capturada.');
    }
    if (!(await this.contratos.guardarFirma(id, dataUrl))) {
      return fallo('CONTRATO_NO_EXISTE', 'No existe el contrato.');
    }
    return ok(undefined);
  }
}

@Injectable()
export class ListarContratosCasoUso {
  constructor(@Inject(CONTRATO_REPOSITORIO) private readonly contratos: ContratoRepositorio) {}
  ejecutar(): Promise<ContratoResumen[]> {
    return this.contratos.listar();
  }
}

@Injectable()
export class DetalleContratoCasoUso {
  constructor(@Inject(CONTRATO_REPOSITORIO) private readonly contratos: ContratoRepositorio) {}
  async ejecutar(id: string): Promise<Resultado<ContratoDetalle>> {
    const d = await this.contratos.detalle(id);
    return d ? ok(d) : fallo('CONTRATO_NO_EXISTE', 'No existe el contrato.');
  }
}
