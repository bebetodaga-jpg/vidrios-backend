import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsString, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import {
  AbrirCajaCasoUso,
  CerrarCajaCasoUso,
  CreditosCasoUso,
  EstadoCajaCasoUso,
  MovimientosCajaCasoUso,
  RegistrarMovimientoCajaCasoUso,
  ReporteCierreCasoUso,
} from '../aplicacion/caja.casos-uso';

class AbrirCajaDto {
  @IsInt()
  @Min(0)
  montoInicialCentimos!: number;
}

class MovimientoCajaDto {
  @IsIn(['INGRESO', 'EGRESO'])
  tipo!: 'INGRESO' | 'EGRESO';

  @IsIn(['EFECTIVO', 'TARJETA', 'YAPE_PLIN'])
  metodo!: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';

  @IsString()
  @MinLength(3)
  concepto!: string;

  @IsInt()
  @Min(1)
  montoCentimos!: number;
}

class CerrarCajaDto {
  @IsInt()
  @Min(0)
  efectivoCentimos!: number;

  @IsInt()
  @Min(0)
  tarjetaCentimos!: number;

  @IsInt()
  @Min(0)
  yapeCentimos!: number;
}

class CobroDto {
  @IsInt()
  @Min(1)
  montoCentimos!: number;

  @IsIn(['EFECTIVO', 'TARJETA', 'YAPE_PLIN'])
  metodo!: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
}

interface PeticionConUsuario {
  user: { id: string; rol: string };
}

@Controller('caja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CajaController {
  constructor(
    private readonly abrirCaja: AbrirCajaCasoUso,
    private readonly registrarMovimiento: RegistrarMovimientoCajaCasoUso,
    private readonly cerrarCaja: CerrarCajaCasoUso,
    private readonly reporteCierre: ReporteCierreCasoUso,
    private readonly creditos: CreditosCasoUso,
    private readonly estadoCaja: EstadoCajaCasoUso,
    private readonly movimientosCaja: MovimientosCajaCasoUso,
  ) {}

  /** Estado de caja para el POS: ¿hay una sesión abierta? */
  @Get('actual')
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async actual(): Promise<{ abierta: boolean; sesionId?: string; montoInicialCentimos?: number; abiertaEn?: Date }> {
    return this.estadoCaja.ejecutar();
  }

  /** Movimientos de la caja del día (la cajera registra sus ingresos/egresos; las ventas llegan del POS). */
  @Get('actual/movimientos')
  @Roles('CAJERA', 'GERENTE')
  async movimientos(): Promise<unknown> {
    return this.movimientosCaja.ejecutar();
  }

  @Post('abrir')
  @Roles('CAJERA', 'GERENTE')
  async abrir(@Body() dto: AbrirCajaDto, @Req() peticion: PeticionConUsuario): Promise<{ sesionId: string }> {
    const r = await this.abrirCaja.ejecutar(peticion.user.id, dto.montoInicialCentimos);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** La cajera registra ingresos y egresos sola (regla del dueño). */
  @Post('movimientos')
  @Roles('CAJERA', 'GERENTE')
  async movimiento(@Body() dto: MovimientoCajaDto): Promise<{ ok: true }> {
    const r = await this.registrarMovimiento.ejecutar(dto);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ok: true };
  }

  /** Cierre CIEGO: declara y cierra; NO devuelve diferencias (eso es del gerente). */
  @Post('cerrar')
  @Roles('CAJERA', 'GERENTE')
  async cerrar(@Body() dto: CerrarCajaDto): Promise<{ sesionId: string; mensaje: string }> {
    const r = await this.cerrarCaja.ejecutar(dto);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ...r.valor, mensaje: 'Cierre declarado y enviado al gerente.' };
  }

  /** Reporte de diferencias con semáforo ±S/5: EXCLUSIVO del gerente. */
  @Get('cierres/:sesionId/reporte')
  @Roles('GERENTE')
  async reporte(@Param('sesionId') sesionId: string): Promise<unknown> {
    const r = await this.reporteCierre.ejecutar(sesionId);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get('cuentas-por-cobrar')
  @Roles('CAJERA', 'GERENTE')
  async cuentas(): Promise<unknown> {
    return this.creditos.listar();
  }

  @Post('cuentas-por-cobrar/:id/cobros')
  @Roles('CAJERA', 'GERENTE')
  async cobrar(@Param('id') id: string, @Body() dto: CobroDto): Promise<{ saldoRestanteCentimos: number }> {
    const r = await this.creditos.cobrar(id, dto.montoCentimos, dto.metodo);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }
}
