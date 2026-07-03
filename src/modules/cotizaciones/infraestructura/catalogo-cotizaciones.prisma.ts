import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { VidrioCotizar } from '../dominio/cotizador.calculos';
import { CatalogoCotizaciones } from '../dominio/cotizaciones.puertos';

/** Lee el vidrio del catálogo y deriva su unidad (pie²/m²) y si es templado para el cálculo. */
@Injectable()
export class CatalogoCotizacionesPrisma implements CatalogoCotizaciones {
  constructor(private readonly prisma: PrismaService) {}

  async vidrio(codigo: string): Promise<VidrioCotizar | null> {
    const p = await this.prisma.producto.findUnique({ where: { codigo }, include: { subfamilia: true } });
    if (!p || p.subfamilia.familia !== 'VIDRIO') {
      return null;
    }
    const unidad = p.unidadVenta === 'M2' ? 'M2' : 'PIE2';
    return {
      codigo: p.codigo,
      nombre: p.nombre,
      precioCentimos: p.precioCentimos,
      unidad,
      grosorMm: p.grosorMm ?? 0,
      templado: p.subfamilia.nombre === 'Templado',
    };
  }
}
