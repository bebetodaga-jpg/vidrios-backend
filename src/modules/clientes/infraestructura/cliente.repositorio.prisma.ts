import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { Cliente } from '../dominio/cliente';
import { ClienteRepositorio, ClienteVista } from '../dominio/cliente.repositorio';

@Injectable()
export class ClienteRepositorioPrisma implements ClienteRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async guardar(cliente: Cliente): Promise<void> {
    const p = cliente.props;
    await this.prisma.cliente.upsert({
      where: { id: p.id },
      create: { id: p.id, tipoDoc: p.tipoDoc, numeroDoc: p.numeroDoc ?? null, nombre: p.nombre, telefono: p.telefono ?? null },
      update: { nombre: p.nombre, telefono: p.telefono ?? null },
    });
  }

  async buscar(texto: string): Promise<ClienteVista[]> {
    const filas = await this.prisma.cliente.findMany({
      where: texto ? { OR: [{ nombre: { contains: texto, mode: 'insensitive' } }, { numeroDoc: { contains: texto } }] } : {},
      orderBy: { nombre: 'asc' },
      take: 50,
    });
    return filas.map((f) => this.aVista(f));
  }

  async porDocumento(numeroDoc: string): Promise<ClienteVista | null> {
    const fila = await this.prisma.cliente.findFirst({ where: { numeroDoc } });
    return fila ? this.aVista(fila) : null;
  }

  private aVista(f: { id: string; tipoDoc: string; numeroDoc: string | null; nombre: string; telefono: string | null }): ClienteVista {
    return { id: f.id, tipoDoc: f.tipoDoc, numeroDoc: f.numeroDoc, nombre: f.nombre, telefono: f.telefono };
  }
}
