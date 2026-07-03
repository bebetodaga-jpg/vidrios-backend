import { Inject, Injectable } from '@nestjs/common';
import { KARDEX_REPOSITORIO, KardexRepositorio, SaldoProducto } from '../dominio/kardex.repositorio';

/** Saldo de todos los productos (para el semáforo de stock del catálogo). */
@Injectable()
export class ConsultarStockCasoUso {
  constructor(@Inject(KARDEX_REPOSITORIO) private readonly kardex: KardexRepositorio) {}

  ejecutar(): Promise<SaldoProducto[]> {
    return this.kardex.saldos();
  }
}
