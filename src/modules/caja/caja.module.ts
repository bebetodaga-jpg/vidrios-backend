import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { CAJA_REPOSITORIO } from './dominio/caja.repositorio';
import {
  AbrirCajaCasoUso,
  CerrarCajaCasoUso,
  CreditosCasoUso,
  EstadoCajaCasoUso,
  MovimientosCajaCasoUso,
  RegistrarMovimientoCajaCasoUso,
  ReporteCierreCasoUso,
} from './aplicacion/caja.casos-uso';
import { CajaRepositorioPrisma } from './infraestructura/caja.repositorio.prisma';
import { CajaController } from './infraestructura/caja.controller';
import { VentaConfirmadaListener } from './infraestructura/venta-confirmada.listener';
import { PagoContratoListener } from './infraestructura/pago-contrato.listener';

/**
 * CAJA (S3): apertura, ingresos/egresos, cierre CIEGO con reporte de diferencias
 * solo-gerente (tolerancia ±S/5) y cuentas por cobrar a 15 días.
 * Recibe `venta.confirmada` desde el outbox sin acoplarse al módulo ventas.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [CajaController],
  providers: [
    PrismaService,
    EstadoCajaCasoUso,
    MovimientosCajaCasoUso,
    AbrirCajaCasoUso,
    RegistrarMovimientoCajaCasoUso,
    CerrarCajaCasoUso,
    ReporteCierreCasoUso,
    CreditosCasoUso,
    VentaConfirmadaListener,
    PagoContratoListener,
    { provide: CAJA_REPOSITORIO, useClass: CajaRepositorioPrisma },
  ],
})
export class CajaModule {}
