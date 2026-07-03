import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { Familia, UnidadVenta } from '../dominio/producto';
import { ComandoCrearProducto, CrearProductoCasoUso } from '../aplicacion/crear-producto.caso-uso';
import { BuscarProductosCasoUso } from '../aplicacion/buscar-productos.caso-uso';
import { ActualizarPrecioCasoUso } from '../aplicacion/actualizar-precio.caso-uso';
import { CargaMasivaCasoUso, ReporteCarga } from '../aplicacion/carga-masiva.caso-uso';

/** DTO HTTP: valida forma y tipos; las reglas de negocio viven en el dominio. */
class CrearProductoDto {
  @IsString()
  @MinLength(3)
  codigo!: string;

  @IsString()
  @MinLength(3)
  nombre!: string;

  @IsEnum(Familia)
  familia!: Familia;

  @IsString()
  subfamilia!: string;

  @IsEnum(UnidadVenta)
  unidadVenta!: UnidadVenta;

  @IsInt()
  @Min(1)
  precioCentimos!: number;

  @IsInt()
  @Min(0)
  stockMinimo!: number;

  @IsOptional()
  @IsInt()
  grosorMm?: number;
}

class ActualizarPrecioDto {
  @IsInt()
  @Min(1)
  precioCentimos!: number;
}

class FilaCargaDto extends CrearProductoDto {
  @IsInt()
  @Min(1)
  fila!: number;
}

class CargaMasivaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilaCargaDto)
  filas!: FilaCargaDto[];
}

@Controller('catalogo/productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogoController {
  constructor(
    private readonly crearProducto: CrearProductoCasoUso,
    private readonly buscarProductos: BuscarProductosCasoUso,
    private readonly actualizarPrecio: ActualizarPrecioCasoUso,
    private readonly cargaMasiva: CargaMasivaCasoUso,
  ) {}

  /** Solo el GERENTE crea/edita productos (regla del dueño, junio 2026). */
  @Post()
  @Roles('GERENTE')
  async crear(@Body() dto: CrearProductoDto): Promise<{ id: string; codigo: string }> {
    const comando: ComandoCrearProducto = dto;
    const resultado = await this.crearProducto.ejecutar(comando);
    if (!resultado.exito) {
      // Error de negocio → 400 con código y mensaje en español (estándar §5).
      throw new BadRequestException(resultado.error);
    }
    return { id: resultado.valor.id, codigo: resultado.valor.codigo };
  }

  /** Edición en línea del precio (prototipo S1): solo GERENTE; invalida el caché al instante. */
  @Patch(':codigo/precio')
  @Roles('GERENTE')
  async cambiarPrecio(
    @Param('codigo') codigo: string,
    @Body() dto: ActualizarPrecioDto,
  ): Promise<{ precio: string }> {
    const resultado = await this.actualizarPrecio.ejecutar(codigo, dto.precioCentimos);
    if (!resultado.exito) {
      throw new BadRequestException(resultado.error);
    }
    return resultado.valor;
  }

  /** Carga masiva desde Excel (el FE parsea y envía filas): solo GERENTE; idempotente. */
  @Post('carga-masiva')
  @Roles('GERENTE')
  async cargar(@Body() dto: CargaMasivaDto): Promise<ReporteCarga> {
    return this.cargaMasiva.ejecutar(dto.filas);
  }

  /** Búsqueda rápida del POS y el catálogo: cualquier rol autenticado puede leer. */
  @Get()
  async buscar(@Query('buscar') texto = ''): Promise<unknown[]> {
    const productos = await this.buscarProductos.ejecutar(texto);
    return productos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      familia: p.familia,
      subfamilia: p.subfamilia,
      unidadVenta: p.unidadVenta,
      precioCentimos: p.precio.centimos,
      precio: p.precio.formato(),
      stockMinimo: p.stockMinimo,
      grosorMm: p.grosorMm ?? null,
    }));
  }
}
