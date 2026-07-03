import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { CONTRATO_REPOSITORIO, COTIZACION_CONTRATOS } from './dominio/contratos.puertos';
import {
  CrearContratoCasoUso,
  DetalleContratoCasoUso,
  GuardarFirmaCasoUso,
  ListarContratosCasoUso,
  RegistrarPagoContratoCasoUso,
} from './aplicacion/contratos.casos-uso';
import { CotizacionContratosPrisma } from './infraestructura/cotizacion-contratos.prisma';
import { ContratoRepositorioPrisma } from './infraestructura/contrato.repositorio.prisma';
import { ContratosController } from './infraestructura/contratos.controller';

/**
 * CONTRATOS (S7): contrato desde la cotización aceptada, cronograma de pagos (el cobro entra a
 * caja vía evento outbox), firma capturada en pantalla. El PDF se imprime desde el FE.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [ContratosController],
  providers: [
    PrismaService,
    CrearContratoCasoUso,
    RegistrarPagoContratoCasoUso,
    GuardarFirmaCasoUso,
    ListarContratosCasoUso,
    DetalleContratoCasoUso,
    { provide: COTIZACION_CONTRATOS, useClass: CotizacionContratosPrisma },
    { provide: CONTRATO_REPOSITORIO, useClass: ContratoRepositorioPrisma },
  ],
})
export class ContratosModule {}
