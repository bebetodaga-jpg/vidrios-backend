import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CAJA_REPOSITORIO, CajaRepositorio } from '../dominio/caja.repositorio';

interface EventoPagoContrato {
  contratoNumero: string;
  montoCentimos: number;
  metodo: string;
}

/**
 * Caja reacciona a `pago.contrato.registrado` (vía outbox) sin que contratos la conozca:
 * el adelanto/saldo cobrado entra a la caja del día como ingreso.
 */
@Injectable()
export class PagoContratoListener {
  private readonly log = new Logger(PagoContratoListener.name);

  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  @OnEvent('pago.contrato.registrado')
  async manejar(evento: EventoPagoContrato): Promise<void> {
    const sesion = await this.caja.sesionAbierta();
    if (!sesion) {
      this.log.warn(`Pago de ${evento.contratoNumero} recibido con caja cerrada; no se registró en caja.`);
      return;
    }
    await this.caja.registrarMovimiento(sesion.id, {
      tipo: 'INGRESO',
      metodo: evento.metodo,
      concepto: `Pago de contrato ${evento.contratoNumero}`,
      montoCentimos: evento.montoCentimos,
    });
  }
}
