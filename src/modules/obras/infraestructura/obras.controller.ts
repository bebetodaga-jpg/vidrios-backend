import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { RolMedidor } from '../dominio/medida.calculos';
import { EstadoObra } from '../dominio/obra-estado.calculos';
import {
  AgregarAmbienteCasoUso,
  AvanzarEstadoObraCasoUso,
  CrearObraCasoUso,
  DetalleObraCasoUso,
  ListarObrasCasoUso,
  RegistrarMedidaCasoUso,
  SincronizarCasoUso,
} from '../aplicacion/obras.casos-uso';

class CrearObraDto {
  @IsString() @MinLength(1) clienteId!: string;
  @IsString() @MinLength(3) direccion!: string;
}
class AmbienteDto {
  @IsString() @MinLength(2) nombre!: string;
}
class MedidaDto {
  @IsInt() @Min(1) anchoCm!: number;
  @IsInt() @Min(1) altoCm!: number;
}
class MedidaSyncDto {
  @IsString() id!: string;
  @IsString() tipo!: 'INICIAL' | 'REMETREO';
  @IsInt() @Min(1) anchoCm!: number;
  @IsInt() @Min(1) altoCm!: number;
}
class VanoSyncDto {
  @IsString() id!: string;
  @IsString() codigo!: string;
  @IsString() nombre!: string;
  @IsString() tipo!: string;
  @IsInt() @Min(1) cantidad!: number;
  @IsBoolean() tieneDetalle!: boolean;
  @IsOptional() @IsString() fotoUrl?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => MedidaSyncDto) medidas!: MedidaSyncDto[];
}
class SincronizarDto {
  @IsString() ambienteId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => VanoSyncDto) vanos!: VanoSyncDto[];
}
class EstadoObraDto {
  @IsIn(['REMETREO', 'CORTE', 'FABRICACION', 'INSTALACION', 'ENTREGADA']) estado!: EstadoObra;
}

interface PeticionUsuario {
  user: { id: string; rol: RolMedidor };
}

@Controller('obras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObrasController {
  constructor(
    private readonly crearObra: CrearObraCasoUso,
    private readonly listarObras: ListarObrasCasoUso,
    private readonly detalleObra: DetalleObraCasoUso,
    private readonly agregarAmbiente: AgregarAmbienteCasoUso,
    private readonly registrarMedida: RegistrarMedidaCasoUso,
    private readonly sincronizar: SincronizarCasoUso,
    private readonly avanzarEstado: AvanzarEstadoObraCasoUso,
  ) {}

  /** Avanzar la etapa de la obra (kanban): medición → remetreo → corte → … → entregada. */
  @Post(':id/estado')
  @Roles('CORTADOR', 'MAESTRO', 'GERENTE')
  async estado(@Param('id') id: string, @Body() dto: EstadoObraDto): Promise<{ estado: EstadoObra }> {
    const r = await this.avanzarEstado.ejecutar(id, dto.estado);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Post()
  @Roles('VENDEDORA', 'MAESTRO', 'GERENTE')
  async crear(@Body() dto: CrearObraDto): Promise<{ id: string; codigo: string }> {
    const r = await this.crearObra.ejecutar(dto.clienteId, dto.direccion);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get()
  async lista(): Promise<unknown> {
    return this.listarObras.ejecutar();
  }

  @Get(':id')
  async detalle(@Param('id') id: string): Promise<unknown> {
    const r = await this.detalleObra.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Post(':id/ambientes')
  @Roles('VENDEDORA', 'MAESTRO', 'GERENTE')
  async ambiente(@Param('id') id: string, @Body() dto: AmbienteDto): Promise<{ id: string }> {
    const r = await this.agregarAmbiente.ejecutar(id, dto.nombre);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Registrar/remetrear una medida online (el remetreo lo limita el caso de uso a gerente/maestro). */
  @Post('vanos/:vanoId/medidas')
  async medida(@Param('vanoId') vanoId: string, @Body() dto: MedidaDto, @Req() req: PeticionUsuario): Promise<{ tipo: string }> {
    const r = await this.registrarMedida.ejecutar(vanoId, dto.anchoCm, dto.altoCm, req.user.id, req.user.rol);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  /** Sincronización del lote capturado offline (PWA de campo). Idempotente. */
  @Post('sincronizar')
  async sync(@Body() dto: SincronizarDto, @Req() req: PeticionUsuario): Promise<{ vanos: number; medidas: number }> {
    const r = await this.sincronizar.ejecutar(dto.ambienteId, dto.vanos, req.user.id, req.user.rol);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }
}
