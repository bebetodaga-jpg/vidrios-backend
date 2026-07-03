import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { ProcesarEmisionCasoUso } from '../aplicacion/procesar-emision.caso-uso';
import { NOMBRE_COLA_EMISION, conexionBullmq } from './emision-bullmq.conexion';

interface DatosTrabajo {
  comprobanteId: string;
}

/**
 * Worker de la cola: por cada comprobante encolado llama al caso de uso de emisión.
 * Si lanza (PSE caído), BullMQ reintenta con backoff — el comprobante sigue PENDIENTE.
 * Corre en el mismo proceso que la API (monolito); se separa a su propio proceso si crece.
 */
@Injectable()
export class EmisionWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly procesarEmision: ProcesarEmisionCasoUso,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      NOMBRE_COLA_EMISION,
      async (job: Job<DatosTrabajo>) => {
        await this.procesarEmision.ejecutar(job.data.comprobanteId);
      },
      { connection: conexionBullmq(this.config), concurrency: 4 },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
