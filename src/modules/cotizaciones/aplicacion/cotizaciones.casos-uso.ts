import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { COLORES_ALUMINIO, MODELOS } from '../dominio/modelos';
import { ItemCotizado, calcularItem } from '../dominio/cotizador.calculos';
import {
  CATALOGO_COTIZACIONES,
  COTIZACION_REPOSITORIO,
  CatalogoCotizaciones,
  CotizacionDetalle,
  CotizacionRepositorio,
  CotizacionResumen,
  EstadoCotizacion,
  ItemPersistir,
} from '../dominio/cotizaciones.puertos';

export interface ConfigItem {
  readonly vanoCodigo: string;
  readonly modelo: string;
  readonly vidrioCodigo: string;
  readonly color: string;
  readonly anchoMm: number;
  readonly altoMm: number;
  readonly cantidad: number;
}

/** Catálogo de modelos y colores para que el FE arme el cotizador. */
@Injectable()
export class ListarModelosCasoUso {
  ejecutar(): { modelos: unknown[]; colores: typeof COLORES_ALUMINIO } {
    const modelos = Object.values(MODELOS).map((m) => ({
      clave: m.clave,
      nombre: m.nombre,
      soloTemplado: m.soloTemplado,
      solo10mm: m.solo10mm,
      descuentoFabricacion: m.descuentoFabricacion,
    }));
    return { modelos, colores: COLORES_ALUMINIO };
  }
}

/** Precio al instante de un ítem (preview, sin persistir). */
@Injectable()
export class CotizarItemCasoUso {
  constructor(@Inject(CATALOGO_COTIZACIONES) private readonly catalogo: CatalogoCotizaciones) {}

  async ejecutar(config: ConfigItem): Promise<Resultado<ItemCotizado & { vidrioNombre: string }>> {
    const vidrio = await this.catalogo.vidrio(config.vidrioCodigo);
    if (!vidrio) {
      return fallo('VIDRIO_NO_EXISTE', 'El vidrio seleccionado no existe en el catálogo.');
    }
    const item = calcularItem(config.modelo, vidrio, config.color, config.anchoMm, config.altoMm, config.cantidad);
    if (!item.exito) {
      return item;
    }
    return ok({ ...item.valor, vidrioNombre: vidrio.nombre });
  }
}

@Injectable()
export class CrearCotizacionCasoUso {
  constructor(
    @Inject(CATALOGO_COTIZACIONES) private readonly catalogo: CatalogoCotizaciones,
    @Inject(COTIZACION_REPOSITORIO) private readonly cotizaciones: CotizacionRepositorio,
  ) {}

  async ejecutar(items: ConfigItem[], clienteId?: string, obraId?: string): Promise<Resultado<{ id: string; numero: string }>> {
    if (items.length === 0) {
      return fallo('COTIZACION_VACIA', 'La cotización no tiene ítems.');
    }
    const persistir: ItemPersistir[] = [];
    for (const config of items) {
      const vidrio = await this.catalogo.vidrio(config.vidrioCodigo);
      if (!vidrio) {
        return fallo('VIDRIO_NO_EXISTE', `El vidrio ${config.vidrioCodigo} no existe.`);
      }
      const calc = calcularItem(config.modelo, vidrio, config.color, config.anchoMm, config.altoMm, config.cantidad);
      if (!calc.exito) {
        return calc;
      }
      persistir.push({
        vanoCodigo: config.vanoCodigo,
        modelo: config.modelo,
        vidrioCodigo: config.vidrioCodigo,
        vidrioNombre: vidrio.nombre,
        color: config.color,
        anchoMm: config.anchoMm,
        altoMm: config.altoMm,
        cantidad: config.cantidad,
        unitCentimos: calc.valor.unitCentimos,
        totalCentimos: calc.valor.totalCentimos,
        despiece: calc.valor.despiece,
      });
    }
    const total = persistir.reduce((s, i) => s + i.totalCentimos, 0);
    return ok(await this.cotizaciones.crear(persistir, total, clienteId, obraId));
  }
}

@Injectable()
export class ListarCotizacionesCasoUso {
  constructor(@Inject(COTIZACION_REPOSITORIO) private readonly cotizaciones: CotizacionRepositorio) {}
  ejecutar(): Promise<CotizacionResumen[]> {
    return this.cotizaciones.listar();
  }
}

@Injectable()
export class DetalleCotizacionCasoUso {
  constructor(@Inject(COTIZACION_REPOSITORIO) private readonly cotizaciones: CotizacionRepositorio) {}
  async ejecutar(id: string): Promise<Resultado<CotizacionDetalle>> {
    const d = await this.cotizaciones.detalle(id);
    return d ? ok(d) : fallo('COTIZACION_NO_EXISTE', 'No existe la cotización.');
  }
}

const TRANSICIONES: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['ACEPTADA', 'RECHAZADA'],
  ACEPTADA: [],
  RECHAZADA: [],
};

@Injectable()
export class CambiarEstadoCotizacionCasoUso {
  constructor(@Inject(COTIZACION_REPOSITORIO) private readonly cotizaciones: CotizacionRepositorio) {}

  /** Máquina de estados: borrador → enviada → aceptada/rechazada. */
  async ejecutar(id: string, nuevo: EstadoCotizacion): Promise<Resultado<void>> {
    const detalle = await this.cotizaciones.detalle(id);
    if (!detalle) {
      return fallo('COTIZACION_NO_EXISTE', 'No existe la cotización.');
    }
    if (!TRANSICIONES[detalle.estado].includes(nuevo)) {
      return fallo('TRANSICION_INVALIDA', `No se puede pasar de ${detalle.estado} a ${nuevo}.`);
    }
    await this.cotizaciones.cambiarEstado(id, nuevo);
    return ok(undefined);
  }
}
