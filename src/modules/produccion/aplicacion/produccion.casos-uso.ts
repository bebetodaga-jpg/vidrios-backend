import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { LaminaDisponible, PanoCorte, PiezaLineal, Plan2D, optimizar1D, optimizar2D, optimizarCorte } from '../dominio/corte.calculos';
import { Cubicacion, cubicar } from '../dominio/cubicacion.calculos';
import {
  COLA_OPTIMIZACION,
  CORTE_VENTA_REPOSITORIO,
  COTIZACION_PRODUCCION,
  ColaOptimizacion,
  CorteVentaRepositorio,
  CorteVentaVista,
  CotizacionProduccion,
  OPTIMIZADOR_EXTERNO,
  OptimizadorExterno,
  ItemOrdenCompra,
  ORDEN_COMPRA_REPOSITORIO,
  ORDEN_CORTE_REPOSITORIO,
  OrdenCompraRepositorio,
  OrdenCompraVista,
  OrdenCorteRepositorio,
  OrdenCorteVista,
  PlanVidrio,
  RETAZOS_PRODUCCION,
  RetazosProduccion,
  ResultadoCorte,
  STOCK_PRODUCCION,
  StockProduccion,
} from '../dominio/produccion.puertos';

@Injectable()
export class GenerarOrdenCorteCasoUso {
  constructor(
    @Inject(COTIZACION_PRODUCCION) private readonly cotizaciones: CotizacionProduccion,
    @Inject(ORDEN_CORTE_REPOSITORIO) private readonly ordenes: OrdenCorteRepositorio,
    @Inject(COLA_OPTIMIZACION) private readonly cola: ColaOptimizacion,
  ) {}

  /** Crea la orden PENDIENTE y la encola: la respuesta es inmediata, el cálculo va al worker. */
  async ejecutar(cotizacionId: string): Promise<Resultado<{ id: string; numero: string }>> {
    const cot = await this.cotizaciones.despieces(cotizacionId);
    if (!cot) {
      return fallo('COTIZACION_NO_EXISTE', 'No existe la cotización.');
    }
    if (cot.estado !== 'ACEPTADA') {
      return fallo('COTIZACION_NO_ACEPTADA', 'Solo se corta una cotización aceptada (con contrato).');
    }
    const orden = await this.ordenes.crearPendiente(cotizacionId);
    await this.cola.encolar(orden.id);
    return ok(orden);
  }
}

@Injectable()
export class ProcesarOrdenCorteCasoUso {
  private readonly log = new Logger(ProcesarOrdenCorteCasoUso.name);

  constructor(
    @Inject(ORDEN_CORTE_REPOSITORIO) private readonly ordenes: OrdenCorteRepositorio,
    @Inject(COTIZACION_PRODUCCION) private readonly cotizaciones: CotizacionProduccion,
    @Inject(RETAZOS_PRODUCCION) private readonly retazos: RetazosProduccion,
  ) {}

  /** Lo que ejecuta el WORKER por cada orden encolada: optimiza, consume y crea retazos. */
  async ejecutar(ordenCorteId: string): Promise<void> {
    const cotizacionId = await this.ordenes.cotizacionDe(ordenCorteId);
    if (!cotizacionId) {
      this.log.warn(`Orden de corte ${ordenCorteId} ya no existe; se ignora.`);
      return;
    }
    const cot = await this.cotizaciones.despieces(cotizacionId);
    if (!cot) {
      await this.ordenes.marcarError(ordenCorteId, 'La cotización ya no existe.');
      return;
    }

    // 2D por cada vidrio (los retazos son del mismo vidrio: no se mezclan grosores/tipos).
    const porVidrio = new Map<string, { nombre: string; panos: PanoCorte[] }>();
    for (const item of cot.items) {
      const grupo = porVidrio.get(item.vidrioCodigo) ?? { nombre: item.vidrioNombre, panos: [] };
      for (let unidad = 1; unidad <= item.cantidadItem; unidad++) {
        item.panos.forEach((p, i) => {
          for (let n = 1; n <= p.cantidad; n++) {
            grupo.panos.push({
              etiqueta: `${item.vidrioNombre} ${String(unidad)}.${String(i + 1)}.${String(n)}`,
              anchoMm: p.anchoMm,
              altoMm: p.altoMm,
            });
          }
        });
      }
      porVidrio.set(item.vidrioCodigo, grupo);
    }

    const vidrios: PlanVidrio[] = [];
    for (const [codigo, grupo] of porVidrio) {
      const disponibles = await this.retazos.disponiblesDe(codigo);
      const plan = optimizar2D(grupo.panos, disponibles);
      if (!plan.exito) {
        await this.ordenes.marcarError(ordenCorteId, plan.error.mensaje);
        return;
      }
      await this.retazos.consumir(plan.valor.retazosUsados);
      const sobrantes = plan.valor.laminas.flatMap((l) => l.sobrantes.map((s) => ({ anchoMm: s.anchoMm, altoMm: s.altoMm })));
      const creados = await this.retazos.crear(codigo, sobrantes, `Orden de corte ${ordenCorteId.slice(0, 8)}`);
      vidrios.push({ vidrioCodigo: codigo, vidrioNombre: grupo.nombre, plan: plan.valor, retazosCreados: creados });
    }

    // 1D: todos los perfiles de la cotización juntos (mismo proveedor de barrillas).
    const piezas: PiezaLineal[] = cot.items.flatMap((item) =>
      item.perfiles.flatMap((p) =>
        Array.from({ length: p.cantidad * item.cantidadItem }, () => ({ nombre: p.nombre, largoMm: p.largoMm })),
      ),
    );
    const plan1d = optimizar1D(piezas);
    if (!plan1d.exito) {
      await this.ordenes.marcarError(ordenCorteId, plan1d.error.mensaje);
      return;
    }

    const resultado: ResultadoCorte = { vidrios, perfiles: plan1d.valor };
    await this.ordenes.marcarLista(ordenCorteId, resultado);
    this.log.log(`Orden de corte lista: ${String(vidrios.length)} vidrio(s), ${String(plan1d.valor.totalBarras)} barrilla(s).`);
  }
}

@Injectable()
export class ListarOrdenesCorteCasoUso {
  constructor(@Inject(ORDEN_CORTE_REPOSITORIO) private readonly ordenes: OrdenCorteRepositorio) {}
  ejecutar(): Promise<OrdenCorteVista[]> {
    return this.ordenes.listar();
  }
}

@Injectable()
export class DetalleOrdenCorteCasoUso {
  constructor(@Inject(ORDEN_CORTE_REPOSITORIO) private readonly ordenes: OrdenCorteRepositorio) {}
  async ejecutar(id: string): Promise<Resultado<OrdenCorteVista>> {
    const d = await this.ordenes.detalle(id);
    return d ? ok(d) : fallo('ORDEN_NO_EXISTE', 'No existe la orden de corte.');
  }
}

/** Un grupo de paños iguales que el usuario pide cortar (mampara, ventana, etc.). */
export interface PanoManual {
  readonly etiqueta: string;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
}

/** Entrada del optimizador manual: el usuario pone la medida de la plancha y los paños. */
export interface EntradaCorteManual {
  readonly vidrioCodigo: string;
  readonly planchaAnchoMm: number;
  readonly planchaAltoMm: number;
  readonly usarRetazos: boolean;
  readonly panos: PanoManual[];
}

function expandirPanos(panos: PanoManual[]): PanoCorte[] {
  return panos.flatMap((p) =>
    Array.from({ length: p.cantidad }, (_, n) => ({
      etiqueta: p.cantidad > 1 ? `${p.etiqueta} ${String(n + 1)}` : p.etiqueta,
      anchoMm: p.anchoMm,
      altoMm: p.altoMm,
    })),
  );
}

function validarEntrada(e: EntradaCorteManual): Resultado<PanoCorte[]> {
  if (e.planchaAnchoMm <= 0 || e.planchaAltoMm <= 0) {
    return fallo('PLANCHA_INVALIDA', 'Indique medidas de plancha válidas (ancho y alto en mm).');
  }
  const panos = expandirPanos(e.panos);
  if (panos.length === 0) {
    return fallo('SIN_PANOS', 'Agregue al menos un paño a cortar.');
  }
  return ok(panos);
}

/**
 * Resuelve el plan de corte: usa el motor OR-Tools (óptimo, varias planchas y reuso de retazos)
 * y, si el servicio no responde o el acomodo no es guillotina, cae a la heurística TS.
 */
async function resolverPlan(
  optimizador: OptimizadorExterno,
  panos: PanoCorte[],
  disponibles: LaminaDisponible[],
  plancha: { anchoMm: number; altoMm: number },
): Promise<Resultado<Plan2D>> {
  const externo = await optimizador.optimizar(plancha, panos, disponibles);
  if (externo) {
    return ok(externo);
  }
  return optimizarCorte(panos, disponibles, plancha);
}

/**
 * Optimizador MANUAL (Sprint 8+): el usuario indica la medida de la plancha y la lista de paños;
 * se acomodan con el motor de optimización (OR-Tools) dejando el retazo aprovechable más grande.
 * Es una simulación — no toca inventario (eso lo hace ConfirmarCorteManualCasoUso).
 */
@Injectable()
export class CalcularCorteManualCasoUso {
  constructor(
    @Inject(RETAZOS_PRODUCCION) private readonly retazos: RetazosProduccion,
    @Inject(OPTIMIZADOR_EXTERNO) private readonly optimizador: OptimizadorExterno,
  ) {}

  async ejecutar(e: EntradaCorteManual): Promise<Resultado<Plan2D>> {
    const validacion = validarEntrada(e);
    if (!validacion.exito) {
      return validacion;
    }
    const disponibles = e.usarRetazos && e.vidrioCodigo ? await this.retazos.disponiblesDe(e.vidrioCodigo) : [];
    return resolverPlan(this.optimizador, validacion.valor, disponibles, { anchoMm: e.planchaAnchoMm, altoMm: e.planchaAltoMm });
  }
}

export interface ResumenCorteManual {
  readonly retazosUsados: string[];
  readonly retazosCreados: string[];
  readonly desperdicioPct: number;
  readonly planchasNuevas: number;
}

/** Confirma el corte manual: recalcula (determinista), consume los retazos usados y crea los sobrantes. */
@Injectable()
export class ConfirmarCorteManualCasoUso {
  constructor(
    @Inject(RETAZOS_PRODUCCION) private readonly retazos: RetazosProduccion,
    @Inject(OPTIMIZADOR_EXTERNO) private readonly optimizador: OptimizadorExterno,
  ) {}

  async ejecutar(e: EntradaCorteManual): Promise<Resultado<ResumenCorteManual>> {
    if (!e.vidrioCodigo) {
      return fallo('VIDRIO_REQUERIDO', 'Seleccione el vidrio para descontar y crear los retazos.');
    }
    const validacion = validarEntrada(e);
    if (!validacion.exito) {
      return validacion;
    }
    const disponibles = e.usarRetazos ? await this.retazos.disponiblesDe(e.vidrioCodigo) : [];
    const plan = await resolverPlan(this.optimizador, validacion.valor, disponibles, { anchoMm: e.planchaAnchoMm, altoMm: e.planchaAltoMm });
    if (!plan.exito) {
      return plan;
    }
    await this.retazos.consumir(plan.valor.retazosUsados);
    const sobrantes = plan.valor.laminas.flatMap((l) => l.sobrantes.map((s) => ({ anchoMm: s.anchoMm, altoMm: s.altoMm })));
    const retazosCreados = await this.retazos.crear(e.vidrioCodigo, sobrantes, 'Corte manual');
    return ok({
      retazosUsados: plan.valor.retazosUsados,
      retazosCreados,
      desperdicioPct: plan.valor.desperdicioPct,
      planchasNuevas: plan.valor.planchasNuevas,
    });
  }
}

@Injectable()
export class CubicarCasoUso {
  constructor(
    @Inject(COTIZACION_PRODUCCION) private readonly cotizaciones: CotizacionProduccion,
    @Inject(STOCK_PRODUCCION) private readonly stock: StockProduccion,
  ) {}

  async ejecutar(cotizacionId: string): Promise<Resultado<Cubicacion>> {
    const cot = await this.cotizaciones.despieces(cotizacionId);
    if (!cot) {
      return fallo('COTIZACION_NO_EXISTE', 'No existe la cotización.');
    }
    return ok(cubicar(cot.items, await this.stock.saldos()));
  }
}

@Injectable()
export class CrearOrdenCompraCasoUso {
  constructor(@Inject(ORDEN_COMPRA_REPOSITORIO) private readonly compras: OrdenCompraRepositorio) {}

  async ejecutar(items: ItemOrdenCompra[]): Promise<Resultado<{ id: string; numero: string }>> {
    const validos = items.filter((i) => i.cantidad > 0);
    if (validos.length === 0) {
      return fallo('SIN_FALTANTES', 'No hay faltantes que comprar.');
    }
    return ok(await this.compras.crear(validos));
  }
}

@Injectable()
export class RecibirOrdenCompraCasoUso {
  constructor(@Inject(ORDEN_COMPRA_REPOSITORIO) private readonly compras: OrdenCompraRepositorio) {}

  async ejecutar(id: string, costos: { codigo: string; costoCentimos: number }[]): Promise<Resultado<{ numero: string }>> {
    const costoInvalido = costos.find((c) => !Number.isInteger(c.costoCentimos) || c.costoCentimos <= 0);
    if (costoInvalido) {
      return fallo('COSTO_INVALIDO', `Indique el costo unitario de ${costoInvalido.codigo}.`);
    }
    const r = await this.compras.recibir(id, costos);
    return r ? ok(r) : fallo('NO_RECIBIBLE', 'La orden no existe o ya fue recibida.');
  }
}

@Injectable()
export class ListarOrdenesCompraCasoUso {
  constructor(@Inject(ORDEN_COMPRA_REPOSITORIO) private readonly compras: OrdenCompraRepositorio) {}
  ejecutar(): Promise<OrdenCompraVista[]> {
    return this.compras.listar();
  }
}

@Injectable()
export class ListarCortesVentaCasoUso {
  constructor(@Inject(CORTE_VENTA_REPOSITORIO) private readonly cortes: CorteVentaRepositorio) {}
  ejecutar(): Promise<CorteVentaVista[]> {
    return this.cortes.listarPendientes();
  }
}

@Injectable()
export class MarcarCorteVentaCasoUso {
  constructor(@Inject(CORTE_VENTA_REPOSITORIO) private readonly cortes: CorteVentaRepositorio) {}
  async ejecutar(id: string): Promise<Resultado<{ ok: true }>> {
    const esHecho = await this.cortes.marcarCortado(id);
    return esHecho ? ok({ ok: true }) : fallo('CORTE_NO_EXISTE', 'El corte no existe o ya estaba cortado.');
  }
}
