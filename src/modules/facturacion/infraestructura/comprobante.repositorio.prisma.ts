import { Injectable } from '@nestjs/common';
import { EstadoComprobante as EstadoPrisma, TipoComprobante as TipoPrisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { TipoComprobante } from '../dominio/comprobante.calculos';
import {
  Comprobante,
  ComprobanteRepositorio,
  NuevoComprobante,
  ResultadoSunat,
} from '../dominio/comprobante.repositorio';

interface FilaComprobante {
  id: string;
  tipo: TipoPrisma;
  numero: string;
  estado: EstadoPrisma;
  clienteNombre: string;
  clienteNumeroDoc: string | null;
  gravadaCentimos: number;
  igvCentimos: number;
  totalCentimos: number;
  cdrHash: string | null;
  enlacePdf: string | null;
  motivoRechazo: string | null;
  creadoEn: Date;
}

@Injectable()
export class ComprobanteRepositorioPrisma implements ComprobanteRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crearPendiente(nuevo: NuevoComprobante): Promise<Comprobante> {
    const fila = await this.prisma.$transaction(async (tx) => {
      // Correlativo por serie dentro de la transacción (sin huecos ni duplicados).
      const numeracion = await tx.numeracion.upsert({
        where: { serie: nuevo.serie },
        create: { serie: nuevo.serie, correlativo: 1 },
        update: { correlativo: { increment: 1 } },
      });
      const numero = `${nuevo.serie}-${String(numeracion.correlativo).padStart(6, '0')}`;
      return tx.comprobante.create({
        data: {
          tipo: nuevo.tipo,
          serie: nuevo.serie,
          correlativo: numeracion.correlativo,
          numero,
          ventaId: nuevo.ventaId,
          clienteTipoDoc: (nuevo.cliente.tipoDoc === 'RUC'
            ? 'RUC'
            : nuevo.cliente.numeroDoc
              ? 'DNI'
              : 'SIN_DOCUMENTO'),
          clienteNumeroDoc: nuevo.cliente.numeroDoc ?? null,
          clienteNombre: nuevo.cliente.nombre,
          gravadaCentimos: nuevo.gravadaCentimos,
          igvCentimos: nuevo.igvCentimos,
          totalCentimos: nuevo.totalCentimos,
          comprobanteRefId: nuevo.comprobanteRefId ?? null,
        },
      });
    });
    return this.aDominio(fila);
  }

  async porId(id: string): Promise<Comprobante | null> {
    const fila = await this.prisma.comprobante.findUnique({ where: { id } });
    return fila ? this.aDominio(fila) : null;
  }

  async comprobanteDeVenta(ventaId: string): Promise<Comprobante | null> {
    const fila = await this.prisma.comprobante.findFirst({
      where: { ventaId, tipo: { not: 'NOTA_CREDITO' } },
      orderBy: { creadoEn: 'desc' },
    });
    return fila ? this.aDominio(fila) : null;
  }

  async registrarRespuestaSunat(id: string, resultado: ResultadoSunat): Promise<void> {
    await this.prisma.comprobante.update({
      where: { id },
      data: {
        estado: resultado.aceptado ? 'ACEPTADO' : 'RECHAZADO',
        cdrHash: resultado.cdrHash ?? null,
        enlacePdf: resultado.enlacePdf ?? null,
        motivoRechazo: resultado.motivoRechazo ?? null,
        intentos: { increment: 1 },
      },
    });
  }

  async marcarAnulado(id: string): Promise<void> {
    await this.prisma.comprobante.update({ where: { id }, data: { estado: 'ANULADO' } });
  }

  async listar(): Promise<Comprobante[]> {
    const filas = await this.prisma.comprobante.findMany({ orderBy: { creadoEn: 'desc' }, take: 100 });
    return filas.map((f) => this.aDominio(f));
  }

  private aDominio(f: FilaComprobante): Comprobante {
    return {
      id: f.id,
      tipo: f.tipo as TipoComprobante,
      numero: f.numero,
      estado: f.estado,
      clienteNombre: f.clienteNombre,
      clienteNumeroDoc: f.clienteNumeroDoc,
      gravadaCentimos: f.gravadaCentimos,
      igvCentimos: f.igvCentimos,
      totalCentimos: f.totalCentimos,
      cdrHash: f.cdrHash,
      enlacePdf: f.enlacePdf,
      motivoRechazo: f.motivoRechazo,
      creadoEn: f.creadoEn,
    };
  }
}
