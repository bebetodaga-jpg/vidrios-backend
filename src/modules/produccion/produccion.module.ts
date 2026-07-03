import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import {
  COLA_OPTIMIZACION,
  CORTE_VENTA_REPOSITORIO,
  COTIZACION_PRODUCCION,
  OPTIMIZADOR_EXTERNO,
  ORDEN_COMPRA_REPOSITORIO,
  ORDEN_CORTE_REPOSITORIO,
  RETAZOS_PRODUCCION,
  STOCK_PRODUCCION,
} from './dominio/produccion.puertos';
import {
  CalcularCorteManualCasoUso,
  ConfirmarCorteManualCasoUso,
  CrearOrdenCompraCasoUso,
  CubicarCasoUso,
  DetalleOrdenCorteCasoUso,
  GenerarOrdenCorteCasoUso,
  ListarCortesVentaCasoUso,
  ListarOrdenesCompraCasoUso,
  ListarOrdenesCorteCasoUso,
  MarcarCorteVentaCasoUso,
  ProcesarOrdenCorteCasoUso,
  RecibirOrdenCompraCasoUso,
} from './aplicacion/produccion.casos-uso';
import { CotizacionProduccionPrisma } from './infraestructura/cotizacion-produccion.prisma';
import { RetazosProduccionPrisma } from './infraestructura/retazos-produccion.prisma';
import { StockProduccionPrisma } from './infraestructura/stock-produccion.prisma';
import { OrdenCorteRepositorioPrisma } from './infraestructura/orden-corte.repositorio.prisma';
import { OrdenCompraRepositorioPrisma } from './infraestructura/orden-compra.repositorio.prisma';
import { CorteVentaPrisma } from './infraestructura/corte-venta.prisma';
import { OptimizadorOrToolsHttp } from './infraestructura/optimizador-ortools.http';
import { VentaConfirmadaCortesListener } from './infraestructura/venta-confirmada.listener';
import { OptimizacionCola, OptimizacionWorker } from './infraestructura/optimizacion.cola';
import { ProduccionController } from './infraestructura/produccion.controller';

/**
 * PRODUCCIÓN ★ (S8–S9): optimización de corte 1D/2D en cola BullMQ (heurística TS tras el
 * puerto; el worker Python+OR-Tools se conecta después — ADR-007), retazos reutilizables,
 * cubicación contra stock y órdenes de compra cuya recepción alimenta el kárdex por evento.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [ProduccionController],
  providers: [
    PrismaService,
    GenerarOrdenCorteCasoUso,
    ProcesarOrdenCorteCasoUso,
    ListarOrdenesCorteCasoUso,
    DetalleOrdenCorteCasoUso,
    CubicarCasoUso,
    CrearOrdenCompraCasoUso,
    RecibirOrdenCompraCasoUso,
    ListarOrdenesCompraCasoUso,
    CalcularCorteManualCasoUso,
    ConfirmarCorteManualCasoUso,
    ListarCortesVentaCasoUso,
    MarcarCorteVentaCasoUso,
    VentaConfirmadaCortesListener,
    OptimizacionWorker,
    { provide: COTIZACION_PRODUCCION, useClass: CotizacionProduccionPrisma },
    { provide: RETAZOS_PRODUCCION, useClass: RetazosProduccionPrisma },
    { provide: STOCK_PRODUCCION, useClass: StockProduccionPrisma },
    { provide: ORDEN_CORTE_REPOSITORIO, useClass: OrdenCorteRepositorioPrisma },
    { provide: ORDEN_COMPRA_REPOSITORIO, useClass: OrdenCompraRepositorioPrisma },
    { provide: CORTE_VENTA_REPOSITORIO, useClass: CorteVentaPrisma },
    { provide: COLA_OPTIMIZACION, useClass: OptimizacionCola },
    { provide: OPTIMIZADOR_EXTERNO, useClass: OptimizadorOrToolsHttp },
  ],
})
export class ProduccionModule {}
