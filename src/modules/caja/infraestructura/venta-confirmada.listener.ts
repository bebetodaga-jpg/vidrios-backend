import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CAJA_REPOSITORIO, CajaRepositorio } from '../dominio/caja.repositorio';

const DIAS_CREDITO = 15; // plazo por defecto (regla del dueño)

interface EventoVentaConfirmada {
  numero: string;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'CREDITO';
  totalCentimos: number;
  cajaSesionId: string;
  clienteId: string | null;
}

/**
 * Caja reacciona a `venta.confirmada` (vía outbox) SIN que ventas la conozca (TDR §3.3):
 * pago inmediato → movimiento de caja; crédito → cuenta por cobrar a 15 días.
 */
@Injectable()
export class VentaConfirmadaListener {
  constructor(@Inject(CAJA_REPOSITORIO) private readonly caja: CajaRepositorio) {}

  @OnEvent('venta.confirmada')
  async manejar(evento: EventoVentaConfirmada): Promise<void> {
    if (evento.metodoPago === 'CREDITO') {
      if (!evento.clienteId) return; // validado en ventas; defensa extra
      const venceEn = new Date(Date.now() + DIAS_CREDITO * 86_400_000);
      await this.caja.crearCuentaPorCobrar(evento.numero, evento.clienteId, evento.totalCentimos, venceEn);
      return;
    }
    await this.caja.registrarMovimiento(evento.cajaSesionId, {
      tipo: 'VENTA',
      metodo: evento.metodoPago,
      concepto: `Venta ${evento.numero}`,
      montoCentimos: evento.totalCentimos,
    });
  }
}
