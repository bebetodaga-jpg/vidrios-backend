import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { TipoComprobante } from '../dominio/comprobante.calculos';
import { Comprobante } from '../dominio/comprobante.repositorio';
import { EmitirComprobanteCasoUso } from '../aplicacion/emitir-comprobante.caso-uso';
import { AnularComprobanteCasoUso } from '../aplicacion/anular-comprobante.caso-uso';
import {
  ListarComprobantesCasoUso,
  ObtenerComprobanteCasoUso,
  ReintentarComprobanteCasoUso,
} from '../aplicacion/reenviar-y-listar.caso-uso';
import { EstadoPseSimulado } from './estado-pse.service';

class ClienteDto {
  @IsIn(['DNI', 'RUC', 'SIN_DOCUMENTO'])
  tipoDoc!: 'DNI' | 'RUC' | 'SIN_DOCUMENTO';

  @IsOptional()
  @IsString()
  numeroDoc?: string;

  @IsString()
  @MinLength(1)
  nombre!: string;
}

class EmitirDto {
  @IsString()
  @MinLength(1)
  ventaId!: string;

  @IsIn(['BOLETA', 'FACTURA'])
  tipo!: 'BOLETA' | 'FACTURA';

  @ValidateNested()
  @Type(() => ClienteDto)
  cliente!: ClienteDto;
}

class AnularDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}

class PseDto {
  @IsBoolean()
  caido!: boolean;
}

const vista = (c: Comprobante): Record<string, unknown> => ({
  id: c.id,
  tipo: c.tipo,
  numero: c.numero,
  estado: c.estado,
  cliente: c.clienteNombre,
  documento: c.clienteNumeroDoc,
  gravada: (c.gravadaCentimos / 100).toFixed(2),
  igv: (c.igvCentimos / 100).toFixed(2),
  total: (c.totalCentimos / 100).toFixed(2),
  motivoRechazo: c.motivoRechazo,
  enlacePdf: c.enlacePdf,
});

@Controller('facturacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacturacionController {
  constructor(
    private readonly emitir: EmitirComprobanteCasoUso,
    private readonly anular: AnularComprobanteCasoUso,
    private readonly listar: ListarComprobantesCasoUso,
    private readonly obtener: ObtenerComprobanteCasoUso,
    private readonly reintentar: ReintentarComprobanteCasoUso,
    private readonly estadoPse: EstadoPseSimulado,
  ) {}

  /** Emite boleta/factura desde el POS (CAJERA/VENDEDORA/GERENTE). Responde al instante (PENDIENTE). */
  @Post('emitir')
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async emitirComprobante(@Body() dto: EmitirDto): Promise<Record<string, unknown>> {
    const r = await this.emitir.ejecutar({ ventaId: dto.ventaId, tipo: dto.tipo as TipoComprobante.BOLETA, cliente: dto.cliente });
    if (!r.exito) throw new BadRequestException(r.error);
    return vista(r.valor);
  }

  @Get('comprobantes')
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async lista(): Promise<Record<string, unknown>[]> {
    return (await this.listar.ejecutar()).map(vista);
  }

  @Get('comprobantes/:id')
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async detalle(@Param('id') id: string): Promise<Record<string, unknown>> {
    const r = await this.obtener.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return vista(r.valor);
  }

  /** Anular con nota de crédito: solo GERENTE. */
  @Post('comprobantes/:id/anular')
  @Roles('GERENTE')
  async anularComprobante(@Param('id') id: string, @Body() dto: AnularDto): Promise<Record<string, unknown>> {
    const r = await this.anular.ejecutar(id, dto.motivo);
    if (!r.exito) throw new BadRequestException(r.error);
    return vista(r.valor);
  }

  /** Reintentar un comprobante que quedó PENDIENTE por contingencia. */
  @Post('comprobantes/:id/reintentar')
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async reintentarComprobante(@Param('id') id: string): Promise<{ ok: true }> {
    const r = await this.reintentar.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ok: true };
  }

  /** SOLO DESARROLLO: simula la caída/recuperación del PSE (espejo del toggle del prototipo). */
  @Post('_dev/pse')
  @Roles('GERENTE')
  simularPse(@Body() dto: PseDto): { pseCaido: boolean } {
    this.estadoPse.fijar(dto.caido);
    return { pseCaido: dto.caido };
  }
}
