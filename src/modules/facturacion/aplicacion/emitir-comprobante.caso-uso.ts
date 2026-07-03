import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import {
  DatosClienteComprobante,
  TipoComprobante,
  desglosarIgv,
  validarCliente,
} from '../dominio/comprobante.calculos';
import { Comprobante, COMPROBANTE_REPOSITORIO, ComprobanteRepositorio } from '../dominio/comprobante.repositorio';
import { COLA_EMISION, ColaEmision, VENTAS_FACTURACION, VentasFacturacion } from '../dominio/facturacion.puertos';

export interface ComandoEmitir {
  readonly ventaId: string;
  readonly tipo: TipoComprobante.BOLETA | TipoComprobante.FACTURA;
  readonly cliente: DatosClienteComprobante;
}

const SERIE: Record<string, string> = { BOLETA: 'B001', FACTURA: 'F001' };

/**
 * Emite un comprobante para una venta confirmada. Lo deja PENDIENTE y lo ENCOLA:
 * la respuesta es inmediata; el PSE se llama en segundo plano (contingencia).
 */
@Injectable()
export class EmitirComprobanteCasoUso {
  constructor(
    @Inject(COMPROBANTE_REPOSITORIO) private readonly comprobantes: ComprobanteRepositorio,
    @Inject(VENTAS_FACTURACION) private readonly ventas: VentasFacturacion,
    @Inject(COLA_EMISION) private readonly cola: ColaEmision,
  ) {}

  async ejecutar(comando: ComandoEmitir): Promise<Resultado<Comprobante>> {
    const venta = await this.ventas.porId(comando.ventaId);
    if (!venta) {
      return fallo('VENTA_NO_EXISTE', 'No existe la venta indicada.');
    }
    if (venta.anulada) {
      return fallo('VENTA_ANULADA', 'No se puede facturar una venta anulada.');
    }

    // Idempotencia: una venta no se factura dos veces (salvo que el anterior fuera rechazado).
    const existente = await this.comprobantes.comprobanteDeVenta(venta.id);
    if (existente && existente.estado !== 'RECHAZADO' && existente.estado !== 'ANULADO') {
      return ok(existente);
    }

    const desglose = desglosarIgv(venta.totalCentimos);
    const clienteValido = validarCliente(comando.tipo, comando.cliente, venta.totalCentimos);
    if (!clienteValido.exito) {
      return clienteValido;
    }

    const comprobante = await this.comprobantes.crearPendiente({
      tipo: comando.tipo,
      serie: SERIE[comando.tipo],
      ventaId: venta.id,
      cliente: comando.cliente,
      gravadaCentimos: desglose.gravadaCentimos,
      igvCentimos: desglose.igvCentimos,
      totalCentimos: desglose.totalCentimos,
    });

    await this.cola.encolar(comprobante.id);
    return ok(comprobante);
  }
}
