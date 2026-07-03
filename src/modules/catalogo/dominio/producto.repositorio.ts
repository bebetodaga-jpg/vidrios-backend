import { Producto } from './producto';

/**
 * PUERTO (hexagonal): el dominio define el contrato; la infraestructura lo implementa.
 * El símbolo permite inyectarlo en NestJS sin que el dominio conozca el framework.
 */
export const PRODUCTO_REPOSITORIO = Symbol('ProductoRepositorio');

export interface ProductoRepositorio {
  guardar(producto: Producto): Promise<void>;
  porCodigo(codigo: string): Promise<Producto | null>;
  buscar(texto: string): Promise<Producto[]>;
}
