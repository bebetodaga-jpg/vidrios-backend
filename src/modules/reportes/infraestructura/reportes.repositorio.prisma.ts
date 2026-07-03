import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { fechaLocal } from '../dominio/reportes.calculos';
import {
  AlertaObraAtrasada,
  AlertaPagoVencido,
  AlertaStock,
  DiaVentas,
  EstadoPorCobrar,
  ObraConCostos,
  RankingProducto,
  RankingVendedor,
  ReportesRepositorio,
} from '../dominio/reportes.puertos';

/** Forma del Json `resultado` de la orden de corte (lo escribe el módulo producción). */
interface ResultadoCorteJson {
  vidrios?: { plan?: { desperdicioPct?: number } }[];
  perfiles?: { desperdicioPct?: number };
}

const MS_POR_DIA = 86_400_000;

@Injectable()
export class ReportesRepositorioPrisma implements ReportesRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async acumularVenta(fecha: string, totalCentimos: number): Promise<void> {
    await this.prisma.resumenVentasDia.upsert({
      where: { fecha },
      create: { fecha, ventasCentimos: totalCentimos, tickets: 1 },
      update: { ventasCentimos: { increment: totalCentimos }, tickets: { increment: 1 } },
    });
  }

  async hayResumen(): Promise<boolean> {
    return (await this.prisma.resumenVentasDia.count()) > 0;
  }

  async reconstruirResumen(): Promise<void> {
    const ventas = await this.prisma.venta.findMany({ where: { estado: 'CONFIRMADA' }, select: { creadoEn: true, totalCentimos: true } });
    const porDia = new Map<string, { ventasCentimos: number; tickets: number }>();
    for (const v of ventas) {
      const fecha = fechaLocal(v.creadoEn);
      const acumulado = porDia.get(fecha) ?? { ventasCentimos: 0, tickets: 0 };
      porDia.set(fecha, { ventasCentimos: acumulado.ventasCentimos + v.totalCentimos, tickets: acumulado.tickets + 1 });
    }
    await this.prisma.$transaction([
      this.prisma.resumenVentasDia.deleteMany(),
      this.prisma.resumenVentasDia.createMany({
        data: [...porDia.entries()].map(([fecha, r]) => ({ fecha, ventasCentimos: r.ventasCentimos, tickets: r.tickets })),
      }),
    ]);
  }

  async resumenDias(fechas: string[]): Promise<DiaVentas[]> {
    const filas = await this.prisma.resumenVentasDia.findMany({ where: { fecha: { in: fechas } } });
    return filas.map((f) => ({ fecha: f.fecha, ventasCentimos: f.ventasCentimos, tickets: f.tickets }));
  }

  async ventasDelMes(prefijoMes: string): Promise<{ ventasCentimos: number; tickets: number }> {
    const filas = await this.prisma.resumenVentasDia.findMany({ where: { fecha: { startsWith: prefijoMes } } });
    return {
      ventasCentimos: filas.reduce((s, f) => s + f.ventasCentimos, 0),
      tickets: filas.reduce((s, f) => s + f.tickets, 0),
    };
  }

  async porCobrar(ahora: Date): Promise<EstadoPorCobrar> {
    const cuentas = await this.prisma.cuentaPorCobrar.findMany({ where: { saldoCentimos: { gt: 0 } }, select: { saldoCentimos: true, venceEn: true } });
    const vencidas = cuentas.filter((c) => c.venceEn < ahora);
    return {
      totalCentimos: cuentas.reduce((s, c) => s + c.saldoCentimos, 0),
      cuentas: cuentas.length,
      vencidasCentimos: vencidas.reduce((s, c) => s + c.saldoCentimos, 0),
      vencidas: vencidas.length,
    };
  }

  async desperdiciosPct(): Promise<number[]> {
    const ordenes = await this.prisma.ordenCorte.findMany({ where: { estado: 'LISTA' }, select: { resultado: true } });
    const pcts: number[] = [];
    for (const o of ordenes) {
      const r = o.resultado as ResultadoCorteJson | null;
      for (const v of r?.vidrios ?? []) {
        if (typeof v.plan?.desperdicioPct === 'number') pcts.push(v.plan.desperdicioPct);
      }
      if (typeof r?.perfiles?.desperdicioPct === 'number') pcts.push(r.perfiles.desperdicioPct);
    }
    return pcts;
  }

  async rankingProductos(limite: number): Promise<RankingProducto[]> {
    const grupos = await this.prisma.ventaItem.groupBy({
      by: ['nombre'],
      _sum: { importeCentimos: true, cantidad: true },
      orderBy: { _sum: { importeCentimos: 'desc' } },
      take: limite,
    });
    return grupos.map((g) => ({
      nombre: g.nombre,
      importeCentimos: g._sum.importeCentimos ?? 0,
      unidades: g._sum.cantidad ?? 0,
    }));
  }

  async rankingVendedores(limite: number): Promise<RankingVendedor[]> {
    const grupos = await this.prisma.venta.groupBy({
      by: ['vendedorId'],
      where: { estado: 'CONFIRMADA' },
      _sum: { totalCentimos: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCentimos: 'desc' } },
      take: limite,
    });
    const usuarios = await this.prisma.usuario.findMany({ where: { id: { in: grupos.map((g) => g.vendedorId) } }, select: { id: true, nombre: true } });
    const nombrePor = new Map(usuarios.map((u) => [u.id, u.nombre]));
    return grupos.map((g) => ({
      nombre: nombrePor.get(g.vendedorId) ?? 'Desconocido',
      importeCentimos: g._sum.totalCentimos ?? 0,
      tickets: g._count._all,
    }));
  }

  async obrasConCostos(): Promise<ObraConCostos[]> {
    const contratos = await this.prisma.contrato.findMany({
      where: { obraId: { not: null }, estado: 'VIGENTE' },
      select: { obraId: true, totalCentimos: true },
    });
    const obraIds = contratos.map((c) => c.obraId).filter((id): id is string => id !== null);
    if (obraIds.length === 0) {
      return [];
    }
    const [obras, costos] = await Promise.all([
      this.prisma.obra.findMany({ where: { id: { in: obraIds } }, select: { id: true, codigo: true, cliente: { select: { nombre: true } } } }),
      this.prisma.pagoPersonal.groupBy({ by: ['obraId'], where: { obraId: { in: obraIds } }, _sum: { montoCentimos: true } }),
    ]);
    const obraPor = new Map(obras.map((o) => [o.id, o]));
    const costoPor = new Map(costos.map((c) => [c.obraId, c._sum.montoCentimos ?? 0]));
    return contratos.flatMap((c) => {
      const obra = c.obraId ? obraPor.get(c.obraId) : undefined;
      if (!obra) {
        return [];
      }
      return [{
        obraCodigo: obra.codigo,
        cliente: obra.cliente.nombre,
        contratadoCentimos: c.totalCentimos,
        costosPersonalCentimos: costoPor.get(c.obraId ?? '') ?? 0,
      }];
    });
  }

  async alertasStockMinimo(): Promise<AlertaStock[]> {
    const saldos = await this.prisma.stockResumen.findMany({
      include: { producto: { select: { codigo: true, nombre: true, stockMinimo: true, activo: true } } },
    });
    return saldos
      .filter((s) => s.producto.activo && s.producto.stockMinimo > 0 && s.saldo <= s.producto.stockMinimo)
      .map((s) => ({ codigo: s.producto.codigo, nombre: s.producto.nombre, saldo: s.saldo, minimo: s.producto.stockMinimo }));
  }

  async pagosVencidos(ahora: Date): Promise<AlertaPagoVencido[]> {
    const cuentas = await this.prisma.cuentaPorCobrar.findMany({
      where: { saldoCentimos: { gt: 0 }, venceEn: { lt: ahora } },
      include: { cliente: { select: { nombre: true } }, venta: { select: { numero: true } } },
      orderBy: { venceEn: 'asc' },
    });
    return cuentas.map((c) => ({ cliente: c.cliente.nombre, numeroVenta: c.venta.numero, saldoCentimos: c.saldoCentimos, venceEn: c.venceEn }));
  }

  async obrasAtrasadas(ahora: Date, diasUmbral: number): Promise<AlertaObraAtrasada[]> {
    const limite = new Date(ahora.getTime() - diasUmbral * MS_POR_DIA);
    const obras = await this.prisma.obra.findMany({
      where: { estado: { not: 'ENTREGADA' }, creadoEn: { lt: limite } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { creadoEn: 'asc' },
    });
    return obras.map((o) => ({
      codigo: o.codigo,
      cliente: o.cliente.nombre,
      estado: o.estado,
      dias: Math.floor((ahora.getTime() - o.creadoEn.getTime()) / MS_POR_DIA),
    }));
  }
}
