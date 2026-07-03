import { Inject, Injectable } from '@nestjs/common';
import { Dinero } from '@shared/dominio/dinero';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { PRODUCTO_REPOSITORIO, ProductoRepositorio } from '../dominio/producto.repositorio';

/** Solo GERENTE (guard en el controller). El cambio impacta al instante en POS y cotizador vía caché. */
@Injectable()
export class ActualizarPrecioCasoUso {
  constructor(@Inject(PRODUCTO_REPOSITORIO) private readonly productos: ProductoRepositorio) {}

  async ejecutar(codigo: string, precioCentimos: number): Promise<Resultado<{ precio: string }>> {
    const producto = await this.productos.porCodigo(codigo);
    if (!producto) {
      return fallo('PRODUCTO_NO_EXISTE', `No existe el producto ${codigo}.`);
    }
    const precio = Dinero.desdeCentimos(precioCentimos);
    if (!precio.exito) {
      return precio;
    }
    const cambio = producto.cambiarPrecio(precio.valor);
    if (!cambio.exito) {
      return cambio;
    }
    await this.productos.guardar(producto);
    return ok({ precio: producto.precio.formato() });
  }
}
