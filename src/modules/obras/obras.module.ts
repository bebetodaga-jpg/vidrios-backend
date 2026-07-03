import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { OBRAS_REPOSITORIO } from './dominio/obras.repositorio';
import {
  AgregarAmbienteCasoUso,
  AvanzarEstadoObraCasoUso,
  CrearObraCasoUso,
  DetalleObraCasoUso,
  ListarObrasCasoUso,
  RegistrarMedidaCasoUso,
  SincronizarCasoUso,
} from './aplicacion/obras.casos-uso';
import { ObrasRepositorioPrisma } from './infraestructura/obras.repositorio.prisma';
import { ObrasController } from './infraestructura/obras.controller';

/**
 * OBRAS (S5): clientes → obra → ambiente → vano → medidas VERSIONADAS (remetreo solo gerente/maestro)
 * + sincronización offline idempotente para la PWA de campo.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [ObrasController],
  providers: [
    PrismaService,
    CrearObraCasoUso,
    ListarObrasCasoUso,
    DetalleObraCasoUso,
    AgregarAmbienteCasoUso,
    RegistrarMedidaCasoUso,
    SincronizarCasoUso,
    AvanzarEstadoObraCasoUso,
    { provide: OBRAS_REPOSITORIO, useClass: ObrasRepositorioPrisma },
  ],
})
export class ObrasModule {}
