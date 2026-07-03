import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { ConfirmarVentaCasoUso } from '../aplicacion/confirmar-venta.caso-uso';

class ItemVentaDto {
  @IsString()
  @MinLength(3)
  codigo!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;

  // Vidrio a medida: cm con 1 decimal (se mide al milímetro).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  anchoCm?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  altoCm?: number;
}

class ConfirmarVentaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items!: ItemVentaDto[];

  @IsIn(['EFECTIVO', 'TARJETA', 'YAPE_PLIN', 'CREDITO'])
  metodoPago!: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'CREDITO';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  descuentoPct?: number;

  @IsOptional()
  @IsString()
  clienteId?: string;
}

interface PeticionConUsuario {
  user: { id: string; rol: string };
}

@Controller('ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VentasController {
  constructor(private readonly confirmarVenta: ConfirmarVentaCasoUso) {}

  /** Venta rápida del POS. El descuento >0 solo pasa si quien vende es GERENTE (S10: clave delegada). */
  @Post()
  @Roles('CAJERA', 'VENDEDORA', 'GERENTE')
  async vender(
    @Body() dto: ConfirmarVentaDto,
    @Req() peticion: PeticionConUsuario,
  ): Promise<{ id: string; numero: string; totalCentimos: number }> {
    const resultado = await this.confirmarVenta.ejecutar({
      items: dto.items,
      metodoPago: dto.metodoPago,
      descuentoPct: dto.descuentoPct ?? 0,
      vendedorId: peticion.user.id,
      esGerente: peticion.user.rol === 'GERENTE',
      clienteId: dto.clienteId,
    });
    if (!resultado.exito) {
      throw new BadRequestException(resultado.error);
    }
    return resultado.valor;
  }
}
