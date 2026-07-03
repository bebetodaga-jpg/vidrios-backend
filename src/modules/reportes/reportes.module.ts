import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { REPORTES_REPOSITORIO } from './dominio/reportes.puertos';
import { AcumularVentaCasoUso, AlertasCasoUso, PanelGerencialCasoUso } from './aplicacion/reportes.casos-uso';
import { ReportesRepositorioPrisma } from './infraestructura/reportes.repositorio.prisma';
import { VentaResumenListener } from './infraestructura/venta-resumen.listener';
import { ReportesController } from './infraestructura/reportes.controller';

/**
 * REPORTES (S11): panel gerencial con CQRS ligero — `ResumenVentasDia` se alimenta por el
 * evento `venta.confirmada` (outbox) y el resto son consultas de solo lectura indexadas.
 * Exportación a Excel: en el FE (SheetJS, mismo patrón que la carga de catálogo).
 */
@Module({
  imports: [IdentidadModule],
  controllers: [ReportesController],
  providers: [
    PrismaService,
    PanelGerencialCasoUso,
    AlertasCasoUso,
    AcumularVentaCasoUso,
    VentaResumenListener,
    { provide: REPORTES_REPOSITORIO, useClass: ReportesRepositorioPrisma },
  ],
})
export class ReportesModule {}
