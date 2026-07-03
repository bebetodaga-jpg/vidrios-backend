import { Module } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { CATALOGO_VENTAS, VENTA_REPOSITORIO } from './dominio/ventas.puertos';
import { ConfirmarVentaCasoUso } from './aplicacion/confirmar-venta.caso-uso';
import { CatalogoVentasPrisma } from './infraestructura/catalogo-ventas.prisma';
import { VentaRepositorioPrisma } from './infraestructura/venta.repositorio.prisma';
import { VentasController } from './infraestructura/ventas.controller';

/**
 * VENTAS / POS (S2): venta transaccional con descuento atómico de stock,
 * numeración correlativa y evento `venta.confirmada` vía OUTBOX (caja lo consume).
 */
@Module({
  imports: [IdentidadModule],
  controllers: [VentasController],
  providers: [
    PrismaService,
    ConfirmarVentaCasoUso,
    { provide: CATALOGO_VENTAS, useClass: CatalogoVentasPrisma },
    { provide: VENTA_REPOSITORIO, useClass: VentaRepositorioPrisma },
  ],
})
export class VentasModule {}
