import { Dinero } from '@shared/dominio/dinero';
import { RedisService } from '@shared/infraestructura/redis.service';
import { Familia, Producto, UnidadVenta } from '../dominio/producto';
import { ProductoRepositorio } from '../dominio/producto.repositorio';

/**
 * DECORATOR de caché (TDR §3.2: "el POS lee precios cientos de veces al día;
 * no debe golpear la base de datos en cada tecla").
 *
 * Invalidación por VERSIÓN: cada escritura incrementa `catalogo:version` y todas las
 * claves anteriores quedan huérfanas (expiran solas por TTL). Evita SCAN/KEYS en Redis.
 * Si Redis no responde, degrada a la BD: el POS nunca se detiene por el caché.
 */
export class ProductoRepositorioCacheado implements ProductoRepositorio {
  private static readonly TTL_SEGUNDOS = 300;

  constructor(
    private readonly interno: ProductoRepositorio,
    private readonly redis: RedisService,
  ) {}

  async guardar(producto: Producto): Promise<void> {
    await this.interno.guardar(producto);
    try {
      await this.redis.incr('catalogo:version'); // invalida todo el caché del catálogo
    } catch {
      // Redis caído: el caché viejo expira por TTL; la escritura en BD ya está segura.
    }
  }

  async porCodigo(codigo: string): Promise<Producto | null> {
    const clave = await this.clave(`codigo:${codigo}`);
    const cacheado = await this.leer(clave);
    if (cacheado !== null) {
      return cacheado.length ? this.deserializar(cacheado[0]) : null;
    }
    const producto = await this.interno.porCodigo(codigo);
    await this.escribir(clave, producto ? [producto] : []);
    return producto;
  }

  async buscar(texto: string): Promise<Producto[]> {
    const clave = await this.clave(`busqueda:${texto.toLowerCase()}`);
    const cacheado = await this.leer(clave);
    if (cacheado !== null) {
      return cacheado.map((props) => this.deserializar(props));
    }
    const productos = await this.interno.buscar(texto);
    await this.escribir(clave, productos);
    return productos;
  }

  // ===== detalle de caché =====

  private async clave(sufijo: string): Promise<string> {
    let version = '0';
    try {
      version = (await this.redis.get('catalogo:version')) ?? '0';
    } catch {
      /* sin Redis se usa versión 0; leer() también fallará y se irá a BD */
    }
    return `catalogo:v${version}:${sufijo}`;
  }

  private async leer(clave: string): Promise<PropsPlanas[] | null> {
    try {
      const crudo = await this.redis.get(clave);
      return crudo ? (JSON.parse(crudo) as PropsPlanas[]) : null;
    } catch {
      return null; // Redis caído o JSON corrupto → BD
    }
  }

  private async escribir(clave: string, productos: Producto[]): Promise<void> {
    const planos: PropsPlanas[] = productos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      familia: p.familia,
      subfamilia: p.subfamilia,
      unidadVenta: p.unidadVenta,
      precioCentimos: p.precio.centimos,
      stockMinimo: p.stockMinimo,
      grosorMm: p.grosorMm,
    }));
    try {
      await this.redis.set(clave, JSON.stringify(planos), 'EX', ProductoRepositorioCacheado.TTL_SEGUNDOS);
    } catch {
      /* caché best-effort */
    }
  }

  private deserializar(plano: PropsPlanas): Producto {
    const precio = Dinero.desdeCentimos(plano.precioCentimos);
    if (!precio.exito) {
      throw new Error(`Caché corrupto: precio inválido para ${plano.codigo}`);
    }
    const producto = Producto.crear({ ...plano, precio: precio.valor });
    if (!producto.exito) {
      throw new Error(`Caché corrupto: ${producto.error.mensaje}`);
    }
    return producto.valor;
  }
}

interface PropsPlanas {
  id: string;
  codigo: string;
  nombre: string;
  familia: Familia;
  subfamilia: string;
  unidadVenta: UnidadVenta;
  precioCentimos: number;
  stockMinimo: number;
  grosorMm?: number;
}
