import { Cliente } from './cliente';

export interface ClienteVista {
  readonly id: string;
  readonly tipoDoc: string;
  readonly numeroDoc: string | null;
  readonly nombre: string;
  readonly telefono: string | null;
}

export const CLIENTE_REPOSITORIO = Symbol('ClienteRepositorio');

export interface ClienteRepositorio {
  guardar(cliente: Cliente): Promise<void>;
  buscar(texto: string): Promise<ClienteVista[]>;
  porDocumento(numeroDoc: string): Promise<ClienteVista | null>;
}
