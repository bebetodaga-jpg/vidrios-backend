import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CORTE_VENTA_REPOSITORIO, CorteVentaRepositorio, VidrioVendido } from '../dominio/produccion.puertos';

interface EventoVentaConfirmada {
  numero: string;
  vidrios?: VidrioVendido[];
}

/**
 * Cortes reacciona a `venta.confirmada` (vía outbox) SIN que ventas lo conozca (TDR §3.3):
 * todo vidrio a medida vendido en el POS pasa AUTOMÁTICAMENTE a la cola de cortes del taller.
 */
@Injectable()
export class VentaConfirmadaCortesListener {
  private readonly log = new Logger(VentaConfirmadaCortesListener.name);

  constructor(@Inject(CORTE_VENTA_REPOSITORIO) private readonly cortes: CorteVentaRepositorio) {}

  @OnEvent('venta.confirmada')
  async manejar(evento: EventoVentaConfirmada): Promise<void> {
    const vidrios = evento.vidrios ?? [];
    if (vidrios.length === 0) {
      return; // la venta no tenía vidrio a medida: nada que cortar
    }
    await this.cortes.crearDesdeVenta(evento.numero, vidrios);
    this.log.log(`Venta ${evento.numero}: ${String(vidrios.length)} vidrio(s) enviados a cortes.`);
  }
}
