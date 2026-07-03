import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { conexionBullmq } from '@shared/infraestructura/bullmq.conexion';
import { ColaOptimizacion } from '../dominio/produccion.puertos';
import { ProcesarOrdenCorteCasoUso } from '../aplicacion/produccion.casos-uso';

export const NOMBRE_COLA_OPTIMIZACION = 'optimizacion-cortes';

interface DatosTrabajo {
  ordenCorteId: string;
}

/** Productor de la cola: la optimización NUNCA corre en la petición web (TDR §3.1). */
@Injectable()
export class OptimizacionCola implements ColaOptimizacion, OnModuleDestroy {
  private readonly cola: Queue;

  constructor(config: ConfigService) {
    this.cola = new Queue(NOMBRE_COLA_OPTIMIZACION, { connection: conexionBullmq(config) });
  }

  async encolar(ordenCorteId: string): Promise<void> {
    await this.cola.add(
      'optimizar',
      { ordenCorteId },
      { attempts: 3, backoff: { type: 'exponential', delay: 1_000 }, removeOnComplete: true, removeOnFail: false },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.cola.close();
  }
}

/**
 * Worker de optimización. Hoy ejecuta la heurística TS (ADR-007); cuando se despliegue el
 * worker Python + OR-Tools, este consumidor se reemplaza y el resto del sistema no cambia.
 */
@Injectable()
export class OptimizacionWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly procesar: ProcesarOrdenCorteCasoUso,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      NOMBRE_COLA_OPTIMIZACION,
      async (job: Job<DatosTrabajo>) => {
        await this.procesar.ejecutar(job.data.ordenCorteId);
      },
      { connection: conexionBullmq(this.config), concurrency: 2 },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
