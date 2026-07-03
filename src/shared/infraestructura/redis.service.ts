import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Conexión Redis compartida: caché de catálogo/precios (S1) y colas BullMQ (S4/S8). */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
