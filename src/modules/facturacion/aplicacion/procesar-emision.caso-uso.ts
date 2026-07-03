import { Inject, Injectable, Logger } from '@nestjs/common';
import { COMPROBANTE_REPOSITORIO, ComprobanteRepositorio } from '../dominio/comprobante.repositorio';
import { EMISOR_COMPROBANTES, EmisorComprobantes } from '../dominio/emisor-comprobantes';

/**
 * Lo que ejecuta el WORKER de la cola por cada comprobante encolado.
 * Si el PSE lanza (ErrorPseNoDisponible), NO se traga el error: lo propaga para que
 * BullMQ reintente y el comprobante siga PENDIENTE (contingencia).
 */
@Injectable()
export class ProcesarEmisionCasoUso {
  private readonly log = new Logger(ProcesarEmisionCasoUso.name);

  constructor(
    @Inject(COMPROBANTE_REPOSITORIO) private readonly comprobantes: ComprobanteRepositorio,
    @Inject(EMISOR_COMPROBANTES) private readonly emisor: EmisorComprobantes,
  ) {}

  async ejecutar(comprobanteId: string): Promise<void> {
    const comprobante = await this.comprobantes.porId(comprobanteId);
    if (!comprobante) {
      this.log.warn(`Comprobante ${comprobanteId} ya no existe; se ignora.`);
      return;
    }
    if (comprobante.estado === 'ACEPTADO' || comprobante.estado === 'ANULADO') {
      return; // ya resuelto: idempotente ante reintentos de la cola
    }

    // Puede lanzar ErrorPseNoDisponible → la cola reintenta (contingencia).
    const respuesta = await this.emisor.emitir({
      tipo: comprobante.tipo,
      numero: comprobante.numero,
      cliente: {
        tipoDoc: comprobante.clienteNumeroDoc ? 'DOC' : 'SIN_DOCUMENTO',
        numeroDoc: comprobante.clienteNumeroDoc ?? undefined,
        nombre: comprobante.clienteNombre,
      },
      gravadaCentimos: comprobante.gravadaCentimos,
      igvCentimos: comprobante.igvCentimos,
      totalCentimos: comprobante.totalCentimos,
    });

    await this.comprobantes.registrarRespuestaSunat(comprobante.id, respuesta);
    const desenlace = respuesta.aceptado ? 'ACEPTADO por SUNAT' : `RECHAZADO — ${respuesta.motivoRechazo ?? 'sin motivo'}`;
    this.log.log(`${comprobante.numero}: ${desenlace}`);
  }
}
