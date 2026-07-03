import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { TipoComprobante } from '../dominio/comprobante.calculos';
import { Comprobante, COMPROBANTE_REPOSITORIO, ComprobanteRepositorio } from '../dominio/comprobante.repositorio';
import { COLA_EMISION, ColaEmision } from '../dominio/facturacion.puertos';

/**
 * Anula un comprobante ACEPTADO emitiendo una NOTA DE CRÉDITO (serie NC01) que SUNAT
 * debe aceptar. El original pasa a ANULADO; la NC entra a la misma cola de emisión.
 */
@Injectable()
export class AnularComprobanteCasoUso {
  constructor(
    @Inject(COMPROBANTE_REPOSITORIO) private readonly comprobantes: ComprobanteRepositorio,
    @Inject(COLA_EMISION) private readonly cola: ColaEmision,
  ) {}

  async ejecutar(comprobanteId: string, motivo: string): Promise<Resultado<Comprobante>> {
    if (motivo.trim().length < 3) {
      return fallo('MOTIVO_REQUERIDO', 'Indique el motivo de la anulación.');
    }
    const original = await this.comprobantes.porId(comprobanteId);
    if (!original) {
      return fallo('COMPROBANTE_NO_EXISTE', 'No existe el comprobante.');
    }
    if (original.estado !== 'ACEPTADO') {
      return fallo('NO_ANULABLE', 'Solo se anula un comprobante aceptado por SUNAT (con nota de crédito).');
    }

    const notaCredito = await this.comprobantes.crearPendiente({
      tipo: TipoComprobante.NOTA_CREDITO,
      serie: 'NC01',
      ventaId: null,
      cliente: {
        tipoDoc: original.clienteNumeroDoc ? 'DOC' : 'SIN_DOCUMENTO',
        numeroDoc: original.clienteNumeroDoc ?? undefined,
        nombre: original.clienteNombre,
      },
      gravadaCentimos: original.gravadaCentimos,
      igvCentimos: original.igvCentimos,
      totalCentimos: original.totalCentimos,
      comprobanteRefId: original.id,
    });

    await this.comprobantes.marcarAnulado(original.id);
    await this.cola.encolar(notaCredito.id);
    return ok(notaCredito);
  }
}
