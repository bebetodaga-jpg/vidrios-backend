import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { CATALOGO_COTIZACIONES, COTIZACION_REPOSITORIO } from './dominio/cotizaciones.puertos';
import {
  CambiarEstadoCotizacionCasoUso,
  CotizarItemCasoUso,
  CrearCotizacionCasoUso,
  DetalleCotizacionCasoUso,
  ListarCotizacionesCasoUso,
  ListarModelosCasoUso,
} from './aplicacion/cotizaciones.casos-uso';
import { CatalogoCotizacionesPrisma } from './infraestructura/catalogo-cotizaciones.prisma';
import { CotizacionRepositorioPrisma } from './infraestructura/cotizacion.repositorio.prisma';
import { CotizacionesController } from './infraestructura/cotizaciones.controller';

/**
 * COTIZACIONES ★ (S6): modelos paramétricos con despiece y descuentos de fabricación,
 * motor de precios (pie²/m², margen, color), y cotización con máquina de estados.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [CotizacionesController],
  providers: [
    PrismaService,
    ListarModelosCasoUso,
    CotizarItemCasoUso,
    CrearCotizacionCasoUso,
    ListarCotizacionesCasoUso,
    DetalleCotizacionCasoUso,
    CambiarEstadoCotizacionCasoUso,
    { provide: CATALOGO_COTIZACIONES, useClass: CatalogoCotizacionesPrisma },
    { provide: COTIZACION_REPOSITORIO, useClass: CotizacionRepositorioPrisma },
  ],
})
export class CotizacionesModule {}
