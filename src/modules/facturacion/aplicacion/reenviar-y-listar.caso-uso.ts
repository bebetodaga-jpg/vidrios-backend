import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { Comprobante, COMPROBANTE_REPOSITORIO, ComprobanteRepositorio } from '../dominio/comprobante.repositorio';
import { COLA_EMISION, ColaEmision } from '../dominio/facturacion.puertos';

@Injectable()
export class ListarComprobantesCasoUso {
  constructor(@Inject(COMPROBANTE_REPOSITORIO) private readonly comprobantes: ComprobanteRepositorio) {}

  ejecutar(): Promise<Comprobante[]> {
    return this.comprobantes.listar();
  }
}

@Injectable()
export class ReintentarComprobanteCasoUso {
  constructor(
    @Inject(COMPROBANTE_REPOSITORIO) private readonly comprobantes: ComprobanteRepositorio,
    @Inject(COLA_EMISION) private readonly cola: ColaEmision,
  ) {}

  /** Reencola un comprobante que quedó PENDIENTE (PSE caído) para forzar un nuevo intento. */
  async ejecutar(id: string): Promise<Resultado<void>> {
    const comprobante = await this.comprobantes.porId(id);
    if (!comprobante) {
      return fallo('COMPROBANTE_NO_EXISTE', 'No existe el comprobante.');
    }
    if (comprobante.estado !== 'PENDIENTE') {
      return fallo('NO_REINTENTABLE', `El comprobante ya está ${comprobante.estado.toLowerCase()}.`);
    }
    await this.cola.encolar(id);
    return ok(undefined);
  }
}

@Injectable()
export class ObtenerComprobanteCasoUso {
  constructor(@Inject(COMPROBANTE_REPOSITORIO) private readonly comprobantes: ComprobanteRepositorio) {}

  /** Para reenviar por correo/WhatsApp: el FE arma el mensaje con el enlace del PDF. */
  async ejecutar(id: string): Promise<Resultado<Comprobante>> {
    const comprobante = await this.comprobantes.porId(id);
    if (!comprobante) {
      return fallo('COMPROBANTE_NO_EXISTE', 'No existe el comprobante.');
    }
    return ok(comprobante);
  }
}
