import { Inject, Injectable } from '@nestjs/common';
import { calcularMargen, fechaLocal, promedioDesperdicio, ultimosDias } from '../dominio/reportes.calculos';
import {
  AlertaObraAtrasada,
  AlertaPagoVencido,
  AlertaStock,
  DiaVentas,
  EstadoPorCobrar,
  REPORTES_REPOSITORIO,
  RankingProducto,
  RankingVendedor,
  ReportesRepositorio,
} from '../dominio/reportes.puertos';

const DIAS_SERIE = 30;
const TOP_RANKING = 5;
const DIAS_OBRA_ATRASADA = 30; // umbral inicial; el PM lo valida con el gerente (S11)

export interface MargenObra {
  obraCodigo: string;
  cliente: string;
  contratadoCentimos: number;
  costosPersonalCentimos: number;
  margenCentimos: number;
  margenPct: number;
}

export interface PanelGerencial {
  ventasHoy: DiaVentas;
  ventasMes: { ventasCentimos: number; tickets: number };
  serie: DiaVentas[];
  porCobrar: EstadoPorCobrar;
  desperdicioPromedioPct: number;
  rankingProductos: RankingProducto[];
  rankingVendedores: RankingVendedor[];
  margenObras: MargenObra[];
}

export interface Alertas {
  stockMinimo: AlertaStock[];
  pagosVencidos: AlertaPagoVencido[];
  obrasAtrasadas: AlertaObraAtrasada[];
}

@Injectable()
export class PanelGerencialCasoUso {
  constructor(@Inject(REPORTES_REPOSITORIO) private readonly repo: ReportesRepositorio) {}

  async ejecutar(ahora = new Date()): Promise<PanelGerencial> {
    // Primera vez (o recuperación): el resumen se reconstruye desde las ventas reales.
    if (!(await this.repo.hayResumen())) {
      await this.repo.reconstruirResumen();
    }

    const fechas = ultimosDias(DIAS_SERIE, ahora);
    const hoy = fechaLocal(ahora);
    const [conDatos, ventasMes, porCobrar, desperdicios, rankingProductos, rankingVendedores, obras] = await Promise.all([
      this.repo.resumenDias(fechas),
      this.repo.ventasDelMes(hoy.slice(0, 7)),
      this.repo.porCobrar(ahora),
      this.repo.desperdiciosPct(),
      this.repo.rankingProductos(TOP_RANKING),
      this.repo.rankingVendedores(TOP_RANKING),
      this.repo.obrasConCostos(),
    ]);

    const porFecha = new Map(conDatos.map((d) => [d.fecha, d]));
    const serie = fechas.map((f) => porFecha.get(f) ?? { fecha: f, ventasCentimos: 0, tickets: 0 });

    return {
      ventasHoy: serie[serie.length - 1] ?? { fecha: hoy, ventasCentimos: 0, tickets: 0 },
      ventasMes,
      serie,
      porCobrar,
      desperdicioPromedioPct: promedioDesperdicio(desperdicios),
      rankingProductos,
      rankingVendedores,
      margenObras: obras.map((o) => ({ ...o, ...calcularMargen(o.contratadoCentimos, o.costosPersonalCentimos) })),
    };
  }
}

@Injectable()
export class AlertasCasoUso {
  constructor(@Inject(REPORTES_REPOSITORIO) private readonly repo: ReportesRepositorio) {}

  async ejecutar(ahora = new Date()): Promise<Alertas> {
    const [stockMinimo, pagosVencidos, obrasAtrasadas] = await Promise.all([
      this.repo.alertasStockMinimo(),
      this.repo.pagosVencidos(ahora),
      this.repo.obrasAtrasadas(ahora, DIAS_OBRA_ATRASADA),
    ]);
    return { stockMinimo, pagosVencidos, obrasAtrasadas };
  }
}

@Injectable()
export class AcumularVentaCasoUso {
  constructor(@Inject(REPORTES_REPOSITORIO) private readonly repo: ReportesRepositorio) {}

  ejecutar(totalCentimos: number, ahora = new Date()): Promise<void> {
    return this.repo.acumularVenta(fechaLocal(ahora), totalCentimos);
  }
}
