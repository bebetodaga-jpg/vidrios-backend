import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import {
  CambiarEstadoCotizacionCasoUso,
  ConfigItem,
  CotizarItemCasoUso,
  CrearCotizacionCasoUso,
  DetalleCotizacionCasoUso,
  ListarCotizacionesCasoUso,
  ListarModelosCasoUso,
} from '../aplicacion/cotizaciones.casos-uso';

class ConfigItemDto implements ConfigItem {
  @IsString() vanoCodigo!: string;
  @IsString() modelo!: string;
  @IsString() vidrioCodigo!: string;
  @IsString() color!: string;
  // En vidriería se mide al milímetro: cm con 1 decimal (ej. 155.3).
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'anchoMm: centímetros con 1 decimal como máximo (ej. 155.3).' }) @Min(1) anchoMm!: number;
  @IsNumber({ maxDecimalPlaces: 1 }, { message: 'altoMm: centímetros con 1 decimal como máximo (ej. 185.3).' }) @Min(1) altoMm!: number;
  @IsInt() @Min(1) cantidad!: number;
}
class CrearCotizacionDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ConfigItemDto) items!: ConfigItemDto[];
  @IsOptional() @IsString() clienteId?: string;
  @IsOptional() @IsString() obraId?: string;
}
class EstadoDto {
  @IsIn(['ENVIADA', 'ACEPTADA', 'RECHAZADA']) estado!: 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA';
}

@Controller('cotizaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CotizacionesController {
  constructor(
    private readonly listarModelos: ListarModelosCasoUso,
    private readonly cotizarItem: CotizarItemCasoUso,
    private readonly crearCotizacion: CrearCotizacionCasoUso,
    private readonly listarCotizaciones: ListarCotizacionesCasoUso,
    private readonly detalleCotizacion: DetalleCotizacionCasoUso,
    private readonly cambiarEstado: CambiarEstadoCotizacionCasoUso,
  ) {}

  /** Modelos y colores para construir el cotizador en el FE. */
  @Get('modelos')
  modelos(): unknown {
    return this.listarModelos.ejecutar();
  }

  /** Precio al instante de un ítem (preview). */
  @Post('cotizar-item')
  @Roles('VENDEDORA', 'GERENTE')
  async cotizar(@Body() dto: ConfigItemDto): Promise<unknown> {
    const r = await this.cotizarItem.ejecutar(dto);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Post()
  @Roles('VENDEDORA', 'GERENTE')
  async crear(@Body() dto: CrearCotizacionDto): Promise<{ id: string; numero: string }> {
    const r = await this.crearCotizacion.ejecutar(dto.items, dto.clienteId, dto.obraId);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get()
  @Roles('VENDEDORA', 'GERENTE')
  async lista(): Promise<unknown> {
    return this.listarCotizaciones.ejecutar();
  }

  @Get(':id')
  @Roles('VENDEDORA', 'GERENTE')
  async detalle(@Param('id') id: string): Promise<unknown> {
    const r = await this.detalleCotizacion.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Post(':id/estado')
  @Roles('VENDEDORA', 'GERENTE')
  async estado(@Param('id') id: string, @Body() dto: EstadoDto): Promise<{ ok: true }> {
    const r = await this.cambiarEstado.ejecutar(id, dto.estado);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ok: true };
  }
}
