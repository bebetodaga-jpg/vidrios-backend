import { Resultado, fallo, ok } from '@shared/dominio/resultado';

export type TipoDocumento = 'DNI' | 'RUC' | 'SIN_DOCUMENTO';

export interface PropsCliente {
  readonly id: string;
  readonly tipoDoc: TipoDocumento;
  readonly numeroDoc?: string;
  readonly nombre: string;
  readonly telefono?: string;
}

const esDni = (n: string | undefined): n is string => !!n && /^\d{8}$/.test(n);
const esRuc = (n: string | undefined): n is string => !!n && /^(10|20)\d{9}$/.test(n);

/** Cliente del negocio (compras en tienda, obras y crédito). Valida el documento según su tipo. */
export class Cliente {
  private constructor(readonly props: PropsCliente) {}

  static crear(props: PropsCliente): Resultado<Cliente> {
    if (props.nombre.trim().length < 3) {
      return fallo('NOMBRE_INVALIDO', 'El nombre del cliente debe tener al menos 3 caracteres.');
    }
    if (props.tipoDoc === 'DNI' && !esDni(props.numeroDoc)) {
      return fallo('DNI_INVALIDO', 'El DNI debe tener 8 dígitos.');
    }
    if (props.tipoDoc === 'RUC' && !esRuc(props.numeroDoc)) {
      return fallo('RUC_INVALIDO', 'El RUC debe tener 11 dígitos y empezar con 10 o 20.');
    }
    return ok(new Cliente({ ...props, nombre: props.nombre.trim() }));
  }
}
