import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { FilaKardex, construirKardex } from '../dominio/kardex.calculos';
import { KARDEX_REPOSITORIO, KardexRepositorio } from '../dominio/kardex.repositorio';

@Injectable()
export class ConsultarKardexCasoUso {
  constructor(@Inject(KARDEX_REPOSITORIO) private readonly kardex: KardexRepositorio) {}

  async ejecutar(codigoProducto: string): Promise<Resultado<FilaKardex[]>> {
    const movimientos = await this.kardex.movimientosDe(codigoProducto);
    if (movimientos === null) {
      return fallo('PRODUCTO_NO_EXISTE', `No existe el producto ${codigoProducto}.`);
    }
    return ok(construirKardex(movimientos));
  }
}
