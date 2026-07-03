import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Resultado, ok } from '@shared/dominio/resultado';
import { Cliente, TipoDocumento } from '../dominio/cliente';
import { CLIENTE_REPOSITORIO, ClienteRepositorio, ClienteVista } from '../dominio/cliente.repositorio';

export interface ComandoCrearCliente {
  readonly tipoDoc: TipoDocumento;
  readonly numeroDoc?: string;
  readonly nombre: string;
  readonly telefono?: string;
}

@Injectable()
export class CrearClienteCasoUso {
  constructor(@Inject(CLIENTE_REPOSITORIO) private readonly clientes: ClienteRepositorio) {}

  async ejecutar(comando: ComandoCrearCliente): Promise<Resultado<{ id: string }>> {
    // Si ya existe por documento, se reutiliza (evita duplicados al re-registrar en el POS/obras).
    if (comando.numeroDoc) {
      const existente = await this.clientes.porDocumento(comando.numeroDoc);
      if (existente) {
        return ok({ id: existente.id });
      }
    }
    const id = randomUUID();
    const cliente = Cliente.crear({ id, ...comando });
    if (!cliente.exito) {
      return cliente;
    }
    await this.clientes.guardar(cliente.valor);
    return ok({ id });
  }
}

@Injectable()
export class BuscarClientesCasoUso {
  constructor(@Inject(CLIENTE_REPOSITORIO) private readonly clientes: ClienteRepositorio) {}

  ejecutar(texto: string): Promise<ClienteVista[]> {
    return this.clientes.buscar(texto.trim());
  }
}
