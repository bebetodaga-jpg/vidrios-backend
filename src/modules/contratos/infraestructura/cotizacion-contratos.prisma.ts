import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { CotizacionParaContratos } from '../dominio/contratos.puertos';

/** Lectura de la cotización (proyección mínima) para crear el contrato. */
@Injectable()
export class CotizacionContratosPrisma implements CotizacionParaContratos {
  constructor(private readonly prisma: PrismaService) {}

  async cotizacion(id: string): Promise<{ id: string; numero: string; estado: string; totalCentimos: number; clienteId: string | null; obraId: string | null } | null> {
    const c = await this.prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, numero: true, estado: true, totalCentimos: true, clienteId: true, obraId: true },
    });
    return c;
  }
}
