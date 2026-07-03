import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { TipoPago } from '../dominio/personal.calculos';
import {
  CuadrillaResumen,
  NuevoPersonal,
  PagoRegistrado,
  PersonalRepositorio,
  PersonalResumen,
  ResultadoAsignacion,
} from '../dominio/personal.puertos';

@Injectable()
export class PersonalRepositorioPrisma implements PersonalRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async dniExiste(dni: string): Promise<boolean> {
    return (await this.prisma.personalExterno.count({ where: { dni } })) > 0;
  }

  async crear(nuevo: NuevoPersonal): Promise<{ id: string }> {
    const p = await this.prisma.personalExterno.create({
      data: { nombre: nuevo.nombre, dni: nuevo.dni, telefono: nuevo.telefono ?? null, especialidad: nuevo.especialidad },
    });
    return { id: p.id };
  }

  async listar(buscar?: string): Promise<PersonalResumen[]> {
    const where: Prisma.PersonalExternoWhereInput = buscar
      ? { OR: [{ nombre: { contains: buscar, mode: 'insensitive' } }, { dni: { contains: buscar } }] }
      : {};
    const filas = await this.prisma.personalExterno.findMany({ where, orderBy: { nombre: 'asc' } });
    return filas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      dni: p.dni,
      telefono: p.telefono,
      especialidad: p.especialidad,
      hayActividad: p.activo,
      creadoEn: p.creadoEn,
    }));
  }

  async existe(id: string): Promise<boolean> {
    return (await this.prisma.personalExterno.count({ where: { id } })) > 0;
  }

  async obraExiste(obraId: string): Promise<boolean> {
    return (await this.prisma.obra.count({ where: { id: obraId } })) > 0;
  }

  async crearCuadrilla(obraId: string, nombre: string): Promise<{ id: string }> {
    const c = await this.prisma.cuadrilla.create({ data: { obraId, nombre } });
    return { id: c.id };
  }

  async listarCuadrillas(obraId?: string): Promise<CuadrillaResumen[]> {
    const filas = await this.prisma.cuadrilla.findMany({
      where: obraId ? { obraId } : {},
      include: { obra: { select: { codigo: true } }, asignaciones: { include: { personal: { select: { nombre: true, especialidad: true } } } } },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      obraId: c.obraId,
      obraCodigo: c.obra.codigo,
      integrantes: c.asignaciones.map((a) => ({
        personalId: a.personalId,
        nombre: a.personal.nombre,
        especialidad: a.personal.especialidad,
        rol: a.rol,
      })),
    }));
  }

  async asignar(cuadrillaId: string, personalId: string, rol: string): Promise<ResultadoAsignacion> {
    const [cuadrillas, personas] = await Promise.all([
      this.prisma.cuadrilla.count({ where: { id: cuadrillaId } }),
      this.prisma.personalExterno.count({ where: { id: personalId } }),
    ]);
    if (cuadrillas === 0 || personas === 0) {
      return 'NO_EXISTE';
    }
    const repetidas = await this.prisma.cuadrillaAsignacion.count({ where: { cuadrillaId, personalId } });
    if (repetidas > 0) {
      return 'YA_ASIGNADO';
    }
    await this.prisma.cuadrillaAsignacion.create({ data: { cuadrillaId, personalId, rol } });
    return 'OK';
  }

  async desasignar(cuadrillaId: string, personalId: string): Promise<boolean> {
    const r = await this.prisma.cuadrillaAsignacion.deleteMany({ where: { cuadrillaId, personalId } });
    return r.count > 0;
  }

  async registrarPago(
    personalId: string,
    tipo: TipoPago,
    concepto: string,
    montoCentimos: number,
    obraId: string | null,
    registradoPorId: string,
  ): Promise<{ id: string }> {
    const p = await this.prisma.pagoPersonal.create({
      data: { personalId, tipo, concepto, montoCentimos, obraId, registradoPorId },
    });
    return { id: p.id };
  }

  async pagosDe(personalId: string): Promise<PagoRegistrado[]> {
    const filas = await this.prisma.pagoPersonal.findMany({ where: { personalId }, orderBy: { creadoEn: 'desc' } });
    return filas.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      concepto: p.concepto,
      montoCentimos: p.montoCentimos,
      obraId: p.obraId,
      creadoEn: p.creadoEn,
    }));
  }
}
