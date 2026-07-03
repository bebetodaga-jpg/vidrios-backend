import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { Alertas, AlertasCasoUso, PanelGerencial, PanelGerencialCasoUso } from '../aplicacion/reportes.casos-uso';

/** Panel gerencial (S11): solo el GERENTE ve las cifras del negocio. */
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(
    private readonly panelGerencial: PanelGerencialCasoUso,
    private readonly alertasCasoUso: AlertasCasoUso,
  ) {}

  @Get('panel')
  @Roles('GERENTE')
  panel(): Promise<PanelGerencial> {
    return this.panelGerencial.ejecutar();
  }

  @Get('alertas')
  @Roles('GERENTE')
  alertas(): Promise<Alertas> {
    return this.alertasCasoUso.ejecutar();
  }
}
