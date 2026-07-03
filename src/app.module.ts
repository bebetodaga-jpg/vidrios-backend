import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { OutboxDespachador } from '@shared/infraestructura/outbox.despachador';
import { IdentidadModule } from '@modules/identidad/identidad.module';
import { CatalogoModule } from '@modules/catalogo/catalogo.module';
import { InventarioModule } from '@modules/inventario/inventario.module';
import { VentasModule } from '@modules/ventas/ventas.module';
import { CajaModule } from '@modules/caja/caja.module';
import { FacturacionModule } from '@modules/facturacion/facturacion.module';
import { ClientesModule } from '@modules/clientes/clientes.module';
import { ObrasModule } from '@modules/obras/obras.module';
import { CotizacionesModule } from '@modules/cotizaciones/cotizaciones.module';
import { ContratosModule } from '@modules/contratos/contratos.module';
import { ProduccionModule } from '@modules/produccion/produccion.module';
import { PersonalModule } from '@modules/personal/personal.module';
import { ReportesModule } from '@modules/reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(), // bus interno; el outbox garantiza no perder eventos
    IdentidadModule,
    CatalogoModule,
    InventarioModule, // S1 ✓
    VentasModule, // S2 ✓
    CajaModule, // S3 ✓
    FacturacionModule, // S4 ✓
    ClientesModule, // S5 ✓
    ObrasModule, // S5 ✓
    CotizacionesModule, // S6 ★ ✓
    ContratosModule, // S7 ✓
    ProduccionModule, // S8–S9 ★ ✓
    PersonalModule, // S10 ✓
    ReportesModule, // S11 ✓
  ],
  providers: [PrismaService, OutboxDespachador],
})
export class AppModule {}
