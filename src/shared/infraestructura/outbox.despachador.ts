import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from './prisma.service';

const INTERVALO_MS = 2_000;
const LOTE = 20;

/**
 * Despachador del patrón OUTBOX: lee eventos pendientes (persistidos en la misma
 * transacción que los originó) y los emite al bus interno. Si un handler falla,
 * el evento queda sin marcar y se reintenta en el siguiente ciclo — nunca se pierde.
 */
@Injectable()
export class OutboxDespachador implements OnModuleInit, OnModuleDestroy {
  private temporizador?: NodeJS.Timeout;
  private procesando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.temporizador = setInterval(() => void this.procesarPendientes(), INTERVALO_MS);
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  async procesarPendientes(): Promise<void> {
    if (this.procesando) return; // evita solaparse a sí mismo
    this.procesando = true;
    try {
      const pendientes = await this.prisma.outbox.findMany({
        where: { procesadoEn: null },
        orderBy: { creadoEn: 'asc' },
        take: LOTE,
      });
      for (const evento of pendientes) {
        try {
          await this.eventos.emitAsync(evento.tipo, evento.payload);
          await this.prisma.outbox.update({ where: { id: evento.id }, data: { procesadoEn: new Date() } });
        } catch (error) {
          // Se reintenta en el próximo ciclo; el error queda visible en logs/Sentry (S12).
          console.error(`Outbox: falló el evento ${evento.tipo} (${evento.id})`, error);
        }
      }
    } catch (error) {
      // Un fallo de la BD (caída transitoria, migración pendiente) NO debe tumbar el proceso:
      // sin este catch la promesa del setInterval revienta como unhandledRejection y Node sale.
      console.error('Outbox: no se pudo leer pendientes; se reintenta en el próximo ciclo.', error);
    } finally {
      this.procesando = false;
    }
  }
}
