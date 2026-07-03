import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AcumularVentaCasoUso } from '../aplicacion/reportes.casos-uso';

interface EventoVentaConfirmada {
  totalCentimos: number;
}

/**
 * CQRS ligero (TL S11): el resumen diario de ventas se actualiza al confirmar el evento
 * (mismo bus outbox que caja) — el panel del gerente nunca lanza consultas gigantes al POS.
 */
@Injectable()
export class VentaResumenListener {
  constructor(private readonly acumular: AcumularVentaCasoUso) {}

  @OnEvent('venta.confirmada')
  async manejar(evento: EventoVentaConfirmada): Promise<void> {
    await this.acumular.ejecutar(evento.totalCentimos);
  }
}
