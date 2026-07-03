import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { MovimientoDato, TipoMovimiento, saldoActual, validarMovimiento } from '../dominio/kardex.calculos';
import { KARDEX_REPOSITORIO, KardexRepositorio } from '../dominio/kardex.repositorio';

export interface ComandoRegistrarMovimiento {
  readonly codigoProducto: string;
  readonly tipo: TipoMovimiento;
  readonly cantidad: number;
  readonly costoCentimos: number;
  readonly referencia: string;
}

@Injectable()
export class RegistrarMovimientoCasoUso {
  constructor(@Inject(KARDEX_REPOSITORIO) private readonly kardex: KardexRepositorio) {}

  async ejecutar(comando: ComandoRegistrarMovimiento): Promise<Resultado<{ saldo: number }>> {
    const movimientos = await this.kardex.movimientosDe(comando.codigoProducto);
    if (movimientos === null) {
      return fallo('PRODUCTO_NO_EXISTE', `No existe el producto ${comando.codigoProducto}.`);
    }

    const movimiento: MovimientoDato = { ...comando, fecha: new Date() };
    const saldo = saldoActual(movimientos);
    const valido = validarMovimiento(movimiento, saldo);
    if (!valido.exito) {
      return valido;
    }

    // NOTA S2: el descuento concurrente desde el POS (dos cajas, mismo stock) se hará
    // dentro de una transacción serializable al implementar VentasModule. Aquí registra
    // movimientos manuales del almacén (compras, ajustes, mermas).
    await this.kardex.registrar(comando.codigoProducto, movimiento);
    return ok({ saldo: saldo + (comando.tipo === TipoMovimiento.SALIDA ? -comando.cantidad : comando.cantidad) });
  }
}
