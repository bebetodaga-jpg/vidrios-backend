import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  DatosEmision,
  EmisorComprobantes,
  ErrorPseNoDisponible,
  RespuestaEmision,
} from '../dominio/emisor-comprobantes';
import { EstadoPseSimulado } from './estado-pse.service';

/**
 * Adaptador del PSE NubeFact — versión SIMULADA (ADR-006).
 * La versión real hará un POST a la API de NubeFact y mapeará su respuesta
 * (aceptada_por_sunat / sunat_description / enlace_del_pdf) a RespuestaEmision.
 * El contrato hacia el dominio NO cambia: cambiar de PSE = reescribir solo esta clase.
 *
 * Reglas de la simulación:
 *  - PSE marcado "caído" (interruptor dev)  → lanza ErrorPseNoDisponible (contingencia).
 *  - documento que empieza en "00000000"    → SUNAT lo RECHAZA (no habido / observado).
 *  - resto                                   → ACEPTADO con CDR y enlace de PDF simulados.
 */
@Injectable()
export class NubeFactEmisor implements EmisorComprobantes {
  constructor(private readonly estadoPse: EstadoPseSimulado) {}

  async emitir(datos: DatosEmision): Promise<RespuestaEmision> {
    await this.simularLatenciaRed();

    if (this.estadoPse.estaCaido()) {
      throw new ErrorPseNoDisponible('NubeFact no respondió (timeout). El comprobante queda en cola.');
    }

    if (datos.cliente.numeroDoc?.startsWith('00000000')) {
      return {
        aceptado: false,
        motivoRechazo: 'SUNAT observó el comprobante: el documento del cliente no está habido.',
      };
    }

    const cdrHash = createHash('sha1').update(datos.numero + randomUUID()).digest('hex').slice(0, 16);
    return {
      aceptado: true,
      cdrHash,
      enlacePdf: `https://nubefact.example/pdf/${datos.numero}.pdf`,
    };
  }

  private simularLatenciaRed(): Promise<void> {
    return new Promise((resolver) => setTimeout(resolver, 150));
  }
}
