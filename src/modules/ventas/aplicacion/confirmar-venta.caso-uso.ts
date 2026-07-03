import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo } from '@shared/dominio/resultado';
import { ItemCalculado, ItemPedido, calcularItem, calcularTotales } from '../dominio/venta.calculos';
import {
  CATALOGO_VENTAS,
  CatalogoVentas,
  VENTA_REPOSITORIO,
  VentaConfirmada,
  VentaRepositorio,
} from '../dominio/ventas.puertos';

export interface ComandoConfirmarVenta {
  readonly items: ItemPedido[];
  readonly metodoPago: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN' | 'CREDITO';
  readonly descuentoPct: number;
  readonly vendedorId: string;
  readonly esGerente: boolean;
  readonly clienteId?: string;
}

@Injectable()
export class ConfirmarVentaCasoUso {
  constructor(
    @Inject(CATALOGO_VENTAS) private readonly catalogo: CatalogoVentas,
    @Inject(VENTA_REPOSITORIO) private readonly ventas: VentaRepositorio,
  ) {}

  async ejecutar(comando: ComandoConfirmarVenta): Promise<Resultado<VentaConfirmada>> {
    // Crédito: lo autorizan gerente/cajera y exige cliente identificado (regla del dueño).
    if (comando.metodoPago === 'CREDITO' && !comando.clienteId) {
      return fallo('CLIENTE_REQUERIDO', 'La venta al crédito requiere identificar al cliente.');
    }

    const itemsCalculados: ItemCalculado[] = [];
    for (const pedido of comando.items) {
      const producto = await this.catalogo.vendible(pedido.codigo);
      if (!producto) {
        return fallo('PRODUCTO_NO_EXISTE', `No existe el producto ${pedido.codigo}.`);
      }
      const item = calcularItem(producto, pedido);
      if (!item.exito) {
        return item;
      }
      itemsCalculados.push(item.valor);
    }

    const totales = calcularTotales(itemsCalculados, comando.descuentoPct, comando.esGerente);
    if (!totales.exito) {
      return totales;
    }

    return this.ventas.confirmar({
      items: itemsCalculados,
      totales: totales.valor,
      metodoPago: comando.metodoPago,
      descuentoPct: comando.descuentoPct,
      vendedorId: comando.vendedorId,
      clienteId: comando.clienteId,
    });
  }
}
