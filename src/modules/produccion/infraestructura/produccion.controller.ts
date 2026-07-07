import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import {
  CalcularCorteManualCasoUso,
  ConfirmarCorteManualCasoUso,
  CrearOrdenCompraCasoUso,
  CubicarCasoUso,
  DetalleOrdenCorteCasoUso,
  GenerarOrdenCorteCasoUso,
  ListarCortesVentaCasoUso,
  ListarOrdenesCompraCasoUso,
  ListarOrdenesCorteCasoUso,
  MarcarCorteVentaCasoUso,
  RecibirOrdenCompraCasoUso,
} from '../aplicacion/produccion.casos-uso';

class GenerarCorteDto {
  @IsString() @MinLength(1) cotizacionId!: string;
}
class ItemCompraDto {
  @IsString() codigo!: string;
  @IsString() nombre!: string;
  @IsInt() @Min(1) cantidad!: number;
}
class CrearCompraDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemCompraDto) items!: ItemCompraDto[];
}
class CostoDto {
  @IsString() codigo!: string;
  @IsInt() @Min(1) costoCentimos!: number;
}
class RecibirCompraDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CostoDto) costos!: CostoDto[];
}
class PanoManualDto {
  @IsString() @MinLength(1) etiqueta!: string;
  @IsInt() @Min(1) anchoMm!: number;
  @IsInt() @Min(1) altoMm!: number;
  @IsInt() @Min(1) cantidad!: number;
}
class CorteManualDto {
  @IsString() vidrioCodigo!: string;
  @IsInt() @Min(1) planchaAnchoMm!: number;
  @IsInt() @Min(1) planchaAltoMm!: number;
  @IsBoolean() usarRetazos!: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PanoManualDto) panos!: PanoManualDto[];
}

@Controller('produccion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProduccionController {
  constructor(
    private readonly generarCorte: GenerarOrdenCorteCasoUso,
    private readonly listarCortes: ListarOrdenesCorteCasoUso,
    private readonly detalleCorte: DetalleOrdenCorteCasoUso,
    private readonly cubicar: CubicarCasoUso,
    private readonly crearCompra: CrearOrdenCompraCasoUso,
    private readonly recibirCompra: RecibirOrdenCompraCasoUso,
    private readonly listarCompras: ListarOrdenesCompraCasoUso,
    private readonly calcularCorteManual: CalcularCorteManualCasoUso,
    private readonly confirmarCorteManual: ConfirmarCorteManualCasoUso,
    private readonly listarCortesVenta: ListarCortesVentaCasoUso,
    private readonly marcarCorteVenta: MarcarCorteVentaCasoUso,
  ) {}

  /** Genera la orden de corte (queda PENDIENTE y la calcula el worker). */
  @Post('ordenes-corte')
  @Roles('CORTADOR', 'MAESTRO', 'GERENTE')
  async generar(@Body() dto: GenerarCorteDto): Promise<{ id: string; numero: string }> {
    const r = await this.generarCorte.ejecutar(dto.cotizacionId);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get('ordenes-corte')
  async cortes(): Promise<unknown> {
    return this.listarCortes.ejecutar();
  }

  @Get('ordenes-corte/:id')
  async corte(@Param('id') id: string): Promise<unknown> {
    const r = await this.detalleCorte.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Optimizador manual: el usuario pone la medida de la plancha y los paños; calcula el acomodo (simulación). */
  @Post('corte-manual/calcular')
  @Roles('CORTADOR', 'MAESTRO', 'GERENTE')
  async calcularManual(@Body() dto: CorteManualDto): Promise<unknown> {
    const r = await this.calcularCorteManual.ejecutar(dto);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Confirma el corte manual: descuenta los retazos usados y registra los sobrantes en inventario. */
  @Post('corte-manual/confirmar')
  @Roles('CORTADOR', 'MAESTRO', 'GERENTE')
  async confirmarManual(@Body() dto: CorteManualDto): Promise<unknown> {
    const r = await this.confirmarCorteManual.ejecutar(dto);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Cortes de mostrador: vidrio a medida vendido en el POS que llegó al taller automáticamente. */
  @Get('cortes-venta')
  @Roles('CORTADOR', 'MAESTRO', 'GERENTE')
  async cortesVenta(): Promise<unknown> {
    return this.listarCortesVenta.ejecutar();
  }

  @Post('cortes-venta/:id/cortado')
  @Roles('CORTADOR', 'MAESTRO', 'GERENTE')
  async marcarCortado(@Param('id') id: string): Promise<{ ok: true }> {
    const r = await this.marcarCorteVenta.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Cubicación: lista total de materiales de la cotización cruzada contra stock. */
  @Get('cubicacion/:cotizacionId')
  @Roles('VENDEDORA', 'MAESTRO', 'GERENTE')
  async cubicacion(@Param('cotizacionId') cotizacionId: string): Promise<unknown> {
    const r = await this.cubicar.ejecutar(cotizacionId);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Post('ordenes-compra')
  @Roles('GERENTE')
  async comprar(@Body() dto: CrearCompraDto): Promise<{ id: string; numero: string }> {
    const r = await this.crearCompra.ejecutar(dto.items);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get('ordenes-compra')
  @Roles('GERENTE')
  async compras(): Promise<unknown> {
    return this.listarCompras.ejecutar();
  }

  /** Recibir la compra: las ENTRADAS al kárdex se registran vía evento (inventario). */
  @Post('ordenes-compra/:id/recibir')
  @Roles('GERENTE')
  async recibir(@Param('id') id: string, @Body() dto: RecibirCompraDto): Promise<{ numero: string }> {
    const r = await this.recibirCompra.ejecutar(id, dto.costos);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }
}
