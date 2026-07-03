import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { ColaEmision } from '../dominio/facturacion.puertos';
import { NOMBRE_COLA_EMISION, conexionBullmq } from './emision-bullmq.conexion';

/**
 * Productor de la cola (adaptador del puerto ColaEmision). Cada comprobante se encola con
 * 5 reintentos y backoff exponencial: si el PSE está caído, se reintenta solo cuando vuelva.
 */
@Injectable()
export class EmisionCola implements ColaEmision, OnModuleDestroy {
  private readonly cola: Queue;

  constructor(config: ConfigService) {
    this.cola = new Queue(NOMBRE_COLA_EMISION, { connection: conexionBullmq(config) });
  }

  async encolar(comprobanteId: string): Promise<void> {
    await this.cola.add(
      'emitir',
      { comprobanteId },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: true,
        removeOnFail: false, // conservar los fallidos para inspección/contingencia
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.cola.close();
  }
}
