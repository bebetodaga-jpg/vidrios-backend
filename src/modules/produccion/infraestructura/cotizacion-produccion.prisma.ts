import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { Despiece } from '@modules/cotizaciones/dominio/modelos';
import { DespieceDeItem } from '../dominio/cubicacion.calculos';
import { CotizacionProduccion } from '../dominio/produccion.puertos';

/** Lee los despieces guardados en la cotización (JSON por ítem) para corte y cubicación. */
@Injectable()
export class CotizacionProduccionPrisma implements CotizacionProduccion {
  constructor(private readonly prisma: PrismaService) {}

  async despieces(cotizacionId: string): Promise<{ numero: string; estado: string; items: DespieceDeItem[] } | null> {
    const cot = await this.prisma.cotizacion.findUnique({ where: { id: cotizacionId }, include: { items: true } });
    if (!cot) {
      return null;
    }
    return {
      numero: cot.numero,
      estado: cot.estado,
      items: cot.items.map((i) => {
        const despiece = i.despiece as unknown as Despiece;
        return {
          cantidadItem: i.cantidad,
          vidrioCodigo: i.vidrioCodigo,
          vidrioNombre: i.vidrioNombre,
          perfiles: despiece.perfiles.map((p) => ({ nombre: p.nombre, cantidad: p.cantidad, largoCm: p.largoCm })),
          panos: despiece.panos.map((p) => ({ cantidad: p.cantidad, anchoCm: p.anchoCm, altoCm: p.altoCm })),
          accesoriosExtra: despiece.accesoriosExtra.map((a) => ({ nombre: a.nombre, cantidad: a.cantidad })),
        };
      }),
    };
  }
}
