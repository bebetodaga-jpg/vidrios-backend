import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { RedisService } from '@shared/infraestructura/redis.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { PRODUCTO_REPOSITORIO } from './dominio/producto.repositorio';
import { CrearProductoCasoUso } from './aplicacion/crear-producto.caso-uso';
import { BuscarProductosCasoUso } from './aplicacion/buscar-productos.caso-uso';
import { ActualizarPrecioCasoUso } from './aplicacion/actualizar-precio.caso-uso';
import { CargaMasivaCasoUso } from './aplicacion/carga-masiva.caso-uso';
import { ProductoRepositorioPrisma } from './infraestructura/producto.repositorio.prisma';
import { ProductoRepositorioCacheado } from './infraestructura/producto.repositorio.cache';
import { CatalogoController } from './infraestructura/catalogo.controller';

/**
 * Módulo de REFERENCIA del monolito: todos los demás módulos copian esta estructura.
 * El puerto se cablea aquí a su adaptador, envuelto en el decorator de caché Redis (S1):
 * los casos de uso no saben que existe un caché — pueden cachearse o no sin tocarlos.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [CatalogoController],
  providers: [
    PrismaService,
    RedisService,
    ProductoRepositorioPrisma,
    CrearProductoCasoUso,
    BuscarProductosCasoUso,
    ActualizarPrecioCasoUso,
    CargaMasivaCasoUso,
    {
      provide: PRODUCTO_REPOSITORIO,
      inject: [ProductoRepositorioPrisma, RedisService],
      useFactory: (prisma: ProductoRepositorioPrisma, redis: RedisService) =>
        new ProductoRepositorioCacheado(prisma, redis),
    },
  ],
})
export class CatalogoModule {}
