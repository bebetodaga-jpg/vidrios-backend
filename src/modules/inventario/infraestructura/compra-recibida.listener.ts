import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TipoMovimiento } from '../dominio/kardex.calculos';
import { KARDEX_REPOSITORIO, KardexRepositorio } from '../dominio/kardex.repositorio';

interface EventoCompraRecibida {
  numero: string;
  items: { codigo: string; cantidad: number; costoCentimos: number }[];
}

/**
 * Inventario reacciona a `compra.recibida` (vía outbox) sin acoplarse a producción:
 * cada ítem recibido es una ENTRADA al kárdex con su costo (valoriza el promedio).
 */
@Injectable()
export class CompraRecibidaListener {
  private readonly log = new Logger(CompraRecibidaListener.name);

  constructor(@Inject(KARDEX_REPOSITORIO) private readonly kardex: KardexRepositorio) {}

  @OnEvent('compra.recibida')
  async manejar(evento: EventoCompraRecibida): Promise<void> {
    for (const item of evento.items) {
      await this.kardex.registrar(item.codigo, {
        tipo: TipoMovimiento.ENTRADA,
        cantidad: item.cantidad,
        costoCentimos: item.costoCentimos,
        referencia: `Compra ${evento.numero}`,
        fecha: new Date(),
      });
    }
    this.log.log(`Compra ${evento.numero}: ${String(evento.items.length)} ítem(s) ingresados al kárdex.`);
  }
}
