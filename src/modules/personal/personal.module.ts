import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { PERSONAL_REPOSITORIO } from './dominio/personal.puertos';
import {
  AsignarCuadrillaCasoUso,
  CrearCuadrillaCasoUso,
  DesasignarCuadrillaCasoUso,
  ListarCuadrillasCasoUso,
  ListarPersonalCasoUso,
  PagosPersonalCasoUso,
  RegistrarPagoPersonalCasoUso,
  RegistrarPersonalCasoUso,
} from './aplicacion/personal.casos-uso';
import { PersonalRepositorioPrisma } from './infraestructura/personal.repositorio.prisma';
import { PersonalController } from './infraestructura/personal.controller';

/**
 * PERSONAL (S10): personal externo del taller (maestros, cortadores, instaladores, ayudantes),
 * cuadrillas por obra y planilla simple inmutable (pagos/adelantos/destajos, solo GERENTE).
 */
@Module({
  imports: [IdentidadModule],
  controllers: [PersonalController],
  providers: [
    PrismaService,
    RegistrarPersonalCasoUso,
    ListarPersonalCasoUso,
    CrearCuadrillaCasoUso,
    ListarCuadrillasCasoUso,
    AsignarCuadrillaCasoUso,
    DesasignarCuadrillaCasoUso,
    RegistrarPagoPersonalCasoUso,
    PagosPersonalCasoUso,
    { provide: PERSONAL_REPOSITORIO, useClass: PersonalRepositorioPrisma },
  ],
})
export class PersonalModule {}
