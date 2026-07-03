import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { ESPECIALIDADES_VALIDAS, TIPOS_PAGO_VALIDOS } from '../dominio/personal.calculos';
import {
  AsignarCuadrillaCasoUso,
  CrearCuadrillaCasoUso,
  DesasignarCuadrillaCasoUso,
  ListarCuadrillasCasoUso,
  ListarPersonalCasoUso,
  PagosPersonalCasoUso,
  RegistrarPagoPersonalCasoUso,
  RegistrarPersonalCasoUso,
} from '../aplicacion/personal.casos-uso';

interface PeticionConUsuario {
  user: { id: string; rol: string };
}

class NuevoPersonalDto {
  @IsString() @MinLength(3) nombre!: string;
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos.' }) dni!: string;
  @IsOptional() @IsString() telefono?: string;
  @IsIn(ESPECIALIDADES_VALIDAS) especialidad!: string;
}
class NuevaCuadrillaDto {
  @IsString() @MinLength(1) obraId!: string;
  @IsString() @MinLength(3) nombre!: string;
}
class AsignacionDto {
  @IsString() @MinLength(1) personalId!: string;
  @IsIn(ESPECIALIDADES_VALIDAS) rol!: string;
}
class PagoPersonalDto {
  @IsIn(TIPOS_PAGO_VALIDOS) tipo!: string;
  @IsString() @MinLength(3) concepto!: string;
  @IsInt() @Min(1) montoCentimos!: number;
  @IsOptional() @IsString() obraId?: string;
}

/**
 * PERSONAL (S10): planilla simple del taller. Solo el GERENTE registra personal y pagos
 * (adelantos/destajos inmutables); el MAESTRO puede ver y armar cuadrillas de su obra.
 */
@Controller('personal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PersonalController {
  constructor(
    private readonly registrarPersonal: RegistrarPersonalCasoUso,
    private readonly listarPersonal: ListarPersonalCasoUso,
    private readonly crearCuadrilla: CrearCuadrillaCasoUso,
    private readonly listarCuadrillas: ListarCuadrillasCasoUso,
    private readonly asignarCuadrilla: AsignarCuadrillaCasoUso,
    private readonly desasignarCuadrilla: DesasignarCuadrillaCasoUso,
    private readonly registrarPago: RegistrarPagoPersonalCasoUso,
    private readonly pagosPersonal: PagosPersonalCasoUso,
  ) {}

  // Las rutas fijas (cuadrillas) van antes que ':id' para que Nest no las capture como id.

  @Post('cuadrillas')
  @Roles('MAESTRO', 'GERENTE')
  async nuevaCuadrilla(@Body() dto: NuevaCuadrillaDto): Promise<{ id: string }> {
    const r = await this.crearCuadrilla.ejecutar(dto.obraId, dto.nombre);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get('cuadrillas')
  @Roles('MAESTRO', 'GERENTE')
  cuadrillas(@Query('obraId') obraId?: string): Promise<unknown> {
    return this.listarCuadrillas.ejecutar(obraId || undefined);
  }

  @Post('cuadrillas/:id/asignaciones')
  @Roles('MAESTRO', 'GERENTE')
  async asignar(@Param('id') id: string, @Body() dto: AsignacionDto): Promise<{ ok: true }> {
    const r = await this.asignarCuadrilla.ejecutar(id, dto.personalId, dto.rol);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ok: true };
  }

  @Delete('cuadrillas/:id/asignaciones/:personalId')
  @Roles('MAESTRO', 'GERENTE')
  async desasignar(@Param('id') id: string, @Param('personalId') personalId: string): Promise<{ ok: true }> {
    const r = await this.desasignarCuadrilla.ejecutar(id, personalId);
    if (!r.exito) throw new BadRequestException(r.error);
    return { ok: true };
  }

  @Post()
  @Roles('GERENTE')
  async alta(@Body() dto: NuevoPersonalDto): Promise<{ id: string }> {
    const r = await this.registrarPersonal.ejecutar(dto.nombre, dto.dni, dto.especialidad, dto.telefono);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get()
  @Roles('MAESTRO', 'GERENTE')
  lista(@Query('buscar') buscar?: string): Promise<unknown> {
    return this.listarPersonal.ejecutar(buscar || undefined);
  }

  /** Planilla inmutable: el pago registrado no se edita ni se borra. */
  @Post(':id/pagos')
  @Roles('GERENTE')
  async pagar(@Param('id') id: string, @Body() dto: PagoPersonalDto, @Req() peticion: PeticionConUsuario): Promise<{ id: string }> {
    const r = await this.registrarPago.ejecutar(id, dto.tipo, dto.concepto, dto.montoCentimos, peticion.user.id, dto.obraId);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get(':id/pagos')
  @Roles('GERENTE')
  async pagos(@Param('id') id: string): Promise<unknown> {
    const r = await this.pagosPersonal.ejecutar(id);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }
}
