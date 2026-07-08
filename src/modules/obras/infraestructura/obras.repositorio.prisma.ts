import { Injectable } from '@nestjs/common';
import { TipoMedida as TipoMedidaPrisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { TipoMedida } from '../dominio/medida.calculos';
import { EstadoObra } from '../dominio/obra-estado.calculos';
import {
  ObraDetalle,
  ObraResumen,
  ObrasRepositorio,
  VanoSync,
} from '../dominio/obras.repositorio';

const SERIE_OBRA = 'OB';

@Injectable()
export class ObrasRepositorioPrisma implements ObrasRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async clienteExiste(clienteId: string): Promise<boolean> {
    return (await this.prisma.cliente.count({ where: { id: clienteId } })) > 0;
  }

  async crearObra(clienteId: string, direccion: string): Promise<{ id: string; codigo: string }> {
    return this.prisma.$transaction(async (tx) => {
      const num = await tx.numeracion.upsert({
        where: { serie: SERIE_OBRA },
        create: { serie: SERIE_OBRA, correlativo: 1 },
        update: { correlativo: { increment: 1 } },
      });
      const codigo = `OB-${String(num.correlativo).padStart(4, '0')}`;
      const obra = await tx.obra.create({ data: { codigo, clienteId, direccion } });
      return { id: obra.id, codigo };
    });
  }

  async listar(): Promise<ObraResumen[]> {
    const filas = await this.prisma.obra.findMany({
      include: { cliente: true, ambientes: { include: { _count: { select: { vanos: true } } } } },
      orderBy: { creadoEn: 'desc' },
    });
    return filas.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      cliente: o.cliente.nombre,
      direccion: o.direccion,
      estado: o.estado,
      vanos: o.ambientes.reduce((s, a) => s + a._count.vanos, 0),
      creadoEn: o.creadoEn,
    }));
  }

  async tiposDeTrabajoUsados(): Promise<string[]> {
    const filas = await this.prisma.vano.findMany({ distinct: ['tipo'], select: { tipo: true }, orderBy: { tipo: 'asc' } });
    return filas.map((f) => f.tipo);
  }

  async detalle(obraId: string): Promise<ObraDetalle | null> {
    const o = await this.prisma.obra.findUnique({
      where: { id: obraId },
      include: {
        cliente: true,
        ambientes: { include: { vanos: { include: { medidas: { include: { autor: true }, orderBy: { creadoEn: 'asc' } } } } } },
      },
    });
    if (!o) {
      return null;
    }
    return {
      id: o.id,
      codigo: o.codigo,
      cliente: o.cliente.nombre,
      direccion: o.direccion,
      estado: o.estado,
      ambientes: o.ambientes.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        vanos: a.vanos.map((v) => {
          const ultima = v.medidas.at(-1);
          return {
            id: v.id,
            codigo: v.codigo,
            nombre: v.nombre,
            tipo: v.tipo,
            cantidad: v.cantidad,
            tieneDetalle: v.tieneDetalle,
            fotoUrl: v.fotoUrl,
            medidaActual: ultima ? { anchoMm: ultima.anchoMm, altoMm: ultima.altoMm } : null,
            medidas: v.medidas.map((m) => ({ id: m.id, tipo: m.tipo, anchoMm: m.anchoMm, altoMm: m.altoMm, autor: m.autor.nombre, creadoEn: m.creadoEn })),
          };
        }),
      })),
    };
  }

  async agregarAmbiente(obraId: string, nombre: string): Promise<{ id: string } | null> {
    if ((await this.prisma.obra.count({ where: { id: obraId } })) === 0) {
      return null;
    }
    const a = await this.prisma.ambiente.create({ data: { obraId, nombre } });
    return { id: a.id };
  }

  async agregarVano(ambienteId: string, vano: Omit<VanoSync, 'medidas'>): Promise<{ id: string } | null> {
    if ((await this.prisma.ambiente.count({ where: { id: ambienteId } })) === 0) {
      return null;
    }
    const v = await this.prisma.vano.create({
      data: {
        ambienteId,
        codigo: vano.codigo,
        nombre: vano.nombre,
        tipo: vano.tipo,
        cantidad: vano.cantidad,
        tieneDetalle: vano.tieneDetalle,
        fotoUrl: vano.fotoUrl ?? null,
      },
    });
    return { id: v.id };
  }

  async contarMedidas(vanoId: string): Promise<number | null> {
    const vano = await this.prisma.vano.findUnique({ where: { id: vanoId }, select: { id: true } });
    if (!vano) {
      return null;
    }
    return this.prisma.medida.count({ where: { vanoId } });
  }

  async estadoObra(obraId: string): Promise<EstadoObra | null> {
    const o = await this.prisma.obra.findUnique({ where: { id: obraId }, select: { estado: true } });
    return o ? o.estado : null;
  }

  async cambiarEstadoObra(obraId: string, nuevo: EstadoObra): Promise<void> {
    await this.prisma.obra.update({ where: { id: obraId }, data: { estado: nuevo } });
  }

  async medidasExistentes(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const filas = await this.prisma.medida.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return new Set(filas.map((f) => f.id));
  }

  async registrarMedida(vanoId: string, tipo: TipoMedida, anchoMm: number, altoMm: number, autorId: string): Promise<void> {
    await this.prisma.medida.create({ data: { vanoId, tipo: tipo, anchoMm, altoMm, autorId } });
  }

  async sincronizar(ambienteId: string, vanos: VanoSync[], autorId: string): Promise<{ vanos: number; medidas: number } | null> {
    if ((await this.prisma.ambiente.count({ where: { id: ambienteId } })) === 0) {
      return null;
    }
    let nVanos = 0;
    let nMedidas = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const vano of vanos) {
        await tx.vano.upsert({
          where: { id: vano.id },
          create: { id: vano.id, ambienteId, codigo: vano.codigo, nombre: vano.nombre, tipo: vano.tipo, cantidad: vano.cantidad, tieneDetalle: vano.tieneDetalle, fotoUrl: vano.fotoUrl ?? null },
          update: { nombre: vano.nombre, tipo: vano.tipo, cantidad: vano.cantidad, tieneDetalle: vano.tieneDetalle, fotoUrl: vano.fotoUrl ?? null },
        });
        nVanos++;
        let cuenta = await tx.medida.count({ where: { vanoId: vano.id } });
        for (const m of vano.medidas) {
          const existe = await tx.medida.findUnique({ where: { id: m.id }, select: { id: true } });
          if (existe) {
            continue; // idempotente: medida ya sincronizada
          }
          const tipo: TipoMedidaPrisma = cuenta === 0 ? 'INICIAL' : 'REMETREO';
          await tx.medida.create({ data: { id: m.id, vanoId: vano.id, tipo, anchoMm: m.anchoMm, altoMm: m.altoMm, autorId } });
          cuenta++;
          nMedidas++;
        }
      }
    });
    return { vanos: nVanos, medidas: nMedidas };
  }
}
