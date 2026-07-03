import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import {
  CrearContratoCasoUso,
  DetalleContratoCasoUso,
  GuardarFirmaCasoUso,
  ListarContratosCasoUso,
  RegistrarPagoContratoCasoUso,
} from '../aplicacion/contratos.casos-uso';

class CrearContratoDto {
  @IsString() @MinLength(1) cotizacionId!: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) adelantoPct?: number;
  @IsOptional() @IsString() firmaDataUrl?: string;
}
class PagoDto {
  @IsInt() @Min(1) montoCentimos!: number;
  @IsIn(['EFECTIVO', 'TARJETA', 'YAPE_PLIN']) metodo!: string;
}
class FirmaDto {
  @IsString() @MinLength(20) dataUrl!: string;
}

@Controller('contratos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContratosController {
  constructor(
    private readonly crearContrato: CrearContratoCasoUso,
    private readonly registrarPago: RegistrarPagoContratoCasoUso,
    private readonly guardarFirma: GuardarFirmaCasoUso,
    private readonly listarContratos: ListarContratosCasoUso,
    private readonly detalleContrato: DetalleContratoCasoUso,
  ) {}

  @Post()
  @Roles('VENDEDORA', 'GERENTE')
  async crear(@Body() dto: CrearContratoDto): Promise<{ id: string; numero: string }> {
    const r = await this.crearContrato.ejecutar(dto.cotizacionId, dto.adelantoPct, dto.firmaDataUrl);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get()
  @Roles('VENDEDORA', 'GERENTE')
  async lista(): Promise<unknown> {
    return this.listarContratos.ejecutar();
  }

  @Get(':id')
  @Roles('VENDEDORA', 'GERENTE')
  async detalle(@Param('id') id: string): Promise<unknown> {
    const r = await this.detalleContrato.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Registrar un cobro del contrato (adelanto/saldo): entra a la caja del día vía evento. */
  @Post(':id/pagos')
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async pagar(@Param('id') id: string, @Body() dto: PagoDto): Promise<{ pagadoCentimos: number; saldoPendienteCentimos: number }> {
    const r = await this.registrarPago.ejecutar(id, dto.montoCentimos, dto.metodo);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Guardar la firma capturada en pantalla (celular). */
  @Post(':id/firma')
  @Roles('VENDEDORA', 'MAESTRO', 'GERENTE')
  async firma(@Param('id') id: string, @Body() dto: FirmaDto): Promise<{ ok: true }> {
    const r = await this.guardarFirma.ejecutar(id, dto.dataUrl);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ok: true };
  }
}
