import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { COMPROBANTE_REPOSITORIO } from './dominio/comprobante.repositorio';
import { EMISOR_COMPROBANTES } from './dominio/emisor-comprobantes';
import { COLA_EMISION, VENTAS_FACTURACION } from './dominio/facturacion.puertos';
import { EmitirComprobanteCasoUso } from './aplicacion/emitir-comprobante.caso-uso';
import { ProcesarEmisionCasoUso } from './aplicacion/procesar-emision.caso-uso';
import { AnularComprobanteCasoUso } from './aplicacion/anular-comprobante.caso-uso';
import {
  ListarComprobantesCasoUso,
  ObtenerComprobanteCasoUso,
  ReintentarComprobanteCasoUso,
} from './aplicacion/reenviar-y-listar.caso-uso';
import { ComprobanteRepositorioPrisma } from './infraestructura/comprobante.repositorio.prisma';
import { VentasFacturacionPrisma } from './infraestructura/ventas-facturacion.prisma';
import { NubeFactEmisor } from './infraestructura/nubefact.emisor';
import { EstadoPseSimulado } from './infraestructura/estado-pse.service';
import { EmisionCola } from './infraestructura/emision.cola';
import { EmisionWorker } from './infraestructura/emision.worker';
import { FacturacionController } from './infraestructura/facturacion.controller';

/**
 * FACTURACIÓN (S4): emisión boleta/factura/NC vía PSE NubeFact tras puerto hexagonal,
 * cola BullMQ con reintentos (contingencia: la venta nunca se detiene) y desglose de IGV.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [FacturacionController],
  providers: [
    PrismaService,
    EstadoPseSimulado,
    EmitirComprobanteCasoUso,
    ProcesarEmisionCasoUso,
    AnularComprobanteCasoUso,
    ListarComprobantesCasoUso,
    ObtenerComprobanteCasoUso,
    ReintentarComprobanteCasoUso,
    EmisionWorker,
    { provide: COMPROBANTE_REPOSITORIO, useClass: ComprobanteRepositorioPrisma },
    { provide: VENTAS_FACTURACION, useClass: VentasFacturacionPrisma },
    { provide: EMISOR_COMPROBANTES, useClass: NubeFactEmisor },
    { provide: COLA_EMISION, useClass: EmisionCola },
  ],
})
export class FacturacionModule {}
