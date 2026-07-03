import { ConfigService } from '@nestjs/config';
import { ConnectionOptions } from 'bullmq';

/**
 * Opciones de conexión para BullMQ (colas y workers de todos los módulos). Se pasan como
 * objeto —no instancia ioredis— para que BullMQ use su propio cliente (evita el choque de
 * tipos con el ioredis del caché). `maxRetriesPerRequest: null` es requisito de los workers.
 */
export function conexionBullmq(config: ConfigService): ConnectionOptions {
  const url = new URL(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    maxRetriesPerRequest: null,
  };
}
