import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsString, MinLength, NotEquals } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { TipoMovimiento } from '../dominio/kardex.calculos';
import { RegistrarMovimientoCasoUso } from '../aplicacion/registrar-movimiento.caso-uso';
import { ConsultarKardexCasoUso } from '../aplicacion/consultar-kardex.caso-uso';
import { ConsultarStockCasoUso } from '../aplicacion/consultar-stock.caso-uso';

class RegistrarMovimientoDto {
  @IsString()
  @MinLength(3)
  codigoProducto!: string;

  @IsEnum(TipoMovimiento)
  tipo!: TipoMovimiento;

  @IsInt()
  @NotEquals(0)
  cantidad!: number;

  @IsInt()
  costoCentimos!: number;

  @IsString()
  @MinLength(3)
  referencia!: string;
}

@Controller('inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(
    private readonly registrarMovimiento: RegistrarMovimientoCasoUso,
    private readonly consultarKardex: ConsultarKardexCasoUso,
    private readonly consultarStock: ConsultarStockCasoUso,
  ) {}

  /** Saldo de todos los productos (alimenta el semáforo de stock del catálogo). */
  @Get('stock')
  async stock(): Promise<{ codigo: string; saldo: number }[]> {
    return this.consultarStock.ejecutar();
  }

  /** Movimientos manuales del almacén (compras, ajustes, mermas): GERENTE. */
  @Post('movimientos')
  @Roles('GERENTE')
  async registrar(@Body() dto: RegistrarMovimientoDto): Promise<{ saldo: number }> {
    const resultado = await this.registrarMovimiento.ejecutar(dto);
    if (!resultado.exito) {
      throw new BadRequestException(resultado.error);
    }
    return resultado.valor;
  }

  /** Kárdex valorizado por producto: lectura para cualquier rol autenticado. */
  @Get('kardex/:codigo')
  async kardex(@Param('codigo') codigo: string): Promise<unknown> {
    const resultado = await this.consultarKardex.ejecutar(codigo);
    if (!resultado.exito) {
      throw new BadRequestException(resultado.error);
    }
    return resultado.valor.map((fila) => ({
      fecha: fila.fecha,
      tipo: fila.tipo,
      referencia: fila.referencia,
      cantidad: fila.cantidad,
      costoCentimos: fila.costoCentimos,
      saldo: fila.saldo,
      costoPromedioCentimos: fila.costoPromedioCentimos,
      saldoValorizadoCentimos: fila.saldoValorizadoCentimos,
    }));
  }
}
