import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { KARDEX_REPOSITORIO } from './dominio/kardex.repositorio';
import { RegistrarMovimientoCasoUso } from './aplicacion/registrar-movimiento.caso-uso';
import { ConsultarKardexCasoUso } from './aplicacion/consultar-kardex.caso-uso';
import { ConsultarStockCasoUso } from './aplicacion/consultar-stock.caso-uso';
import { KardexRepositorioPrisma } from './infraestructura/kardex.repositorio.prisma';
import { InventarioController } from './infraestructura/inventario.controller';
import { CompraRecibidaListener } from './infraestructura/compra-recibida.listener';

/**
 * INVENTARIO (S1): kárdex inmutable valorizado por promedio ponderado + movimientos manuales.
 * S2: reacciona a `VentaConfirmada` descontando stock en transacción.
 * S8–S9: retazos para el optimizador y reservas por obra.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [InventarioController],
  providers: [
    PrismaService,
    RegistrarMovimientoCasoUso,
    ConsultarKardexCasoUso,
    ConsultarStockCasoUso,
    CompraRecibidaListener,
    { provide: KARDEX_REPOSITORIO, useClass: KardexRepositorioPrisma },
  ],
})
export class InventarioModule {}
