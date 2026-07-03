import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { CLIENTE_REPOSITORIO } from './dominio/cliente.repositorio';
import { BuscarClientesCasoUso, CrearClienteCasoUso } from './aplicacion/clientes.casos-uso';
import { ClienteRepositorioPrisma } from './infraestructura/cliente.repositorio.prisma';
import { ClientesController } from './infraestructura/clientes.controller';

/** CLIENTES (S5): alta y búsqueda; reutilizado por obras, POS (crédito) y facturación. */
@Module({
  imports: [IdentidadModule],
  controllers: [ClientesController],
  providers: [
    PrismaService,
    CrearClienteCasoUso,
    BuscarClientesCasoUso,
    { provide: CLIENTE_REPOSITORIO, useClass: ClienteRepositorioPrisma },
  ],
})
export class ClientesModule {}
