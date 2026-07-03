import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '@modules/identidad/infraestructura/jwt-auth.guard';
import { Roles, RolesGuard } from '@modules/identidad/infraestructura/roles.guard';
import { BuscarClientesCasoUso, CrearClienteCasoUso } from '../aplicacion/clientes.casos-uso';
import { TipoDocumento } from '../dominio/cliente';

class CrearClienteDto {
  @IsIn(['DNI', 'RUC', 'SIN_DOCUMENTO'])
  tipoDoc!: TipoDocumento;

  @IsOptional()
  @IsString()
  numeroDoc?: string;

  @IsString()
  @MinLength(3)
  nombre!: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(
    private readonly crear: CrearClienteCasoUso,
    private readonly buscar: BuscarClientesCasoUso,
  ) {}

  @Post()
  @Roles('CAJERA', 'VENDEDORA', 'MAESTRO', 'GERENTE')
  async crearCliente(@Body() dto: CrearClienteDto): Promise<{ id: string }> {
    const r = await this.crear.ejecutar(dto);
    if (!r.exito) throw new BadRequestException(r.error);
    return r.valor;
  }

  @Get()
  async buscarClientes(@Query('buscar') texto = ''): Promise<unknown> {
    return this.buscar.ejecutar(texto);
  }
}
