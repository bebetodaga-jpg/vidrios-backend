import { Inject, Injectable } from '@nestjs/common';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { Especialidad, ResumenPagos, TipoPago, calcularResumenPagos, validarPago, validarPersonal } from '../dominio/personal.calculos';
import {
  CuadrillaResumen,
  PERSONAL_REPOSITORIO,
  PagoRegistrado,
  PersonalRepositorio,
  PersonalResumen,
} from '../dominio/personal.puertos';

@Injectable()
export class RegistrarPersonalCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}

  async ejecutar(nombre: string, dni: string, especialidad: string, telefono?: string): Promise<Resultado<{ id: string }>> {
    const valido = validarPersonal(nombre, dni, especialidad);
    if (!valido.exito) {
      return valido;
    }
    if (await this.repo.dniExiste(dni)) {
      return fallo('DNI_DUPLICADO', 'Ya hay personal registrado con ese DNI.');
    }
    return ok(await this.repo.crear({ nombre: nombre.trim(), dni, telefono, especialidad: especialidad as Especialidad }));
  }
}

@Injectable()
export class ListarPersonalCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}
  ejecutar(buscar?: string): Promise<PersonalResumen[]> {
    return this.repo.listar(buscar);
  }
}

@Injectable()
export class CrearCuadrillaCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}

  async ejecutar(obraId: string, nombre: string): Promise<Resultado<{ id: string }>> {
    if (nombre.trim().length < 3) {
      return fallo('NOMBRE_INVALIDO', 'El nombre de la cuadrilla debe tener al menos 3 caracteres.');
    }
    if (!(await this.repo.obraExiste(obraId))) {
      return fallo('OBRA_NO_EXISTE', 'No existe la obra para la cuadrilla.');
    }
    return ok(await this.repo.crearCuadrilla(obraId, nombre.trim()));
  }
}

@Injectable()
export class ListarCuadrillasCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}
  ejecutar(obraId?: string): Promise<CuadrillaResumen[]> {
    return this.repo.listarCuadrillas(obraId);
  }
}

@Injectable()
export class AsignarCuadrillaCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}

  async ejecutar(cuadrillaId: string, personalId: string, rol: string): Promise<Resultado<void>> {
    const r = await this.repo.asignar(cuadrillaId, personalId, rol);
    if (r === 'NO_EXISTE') {
      return fallo('NO_EXISTE', 'No existe la cuadrilla o el personal.');
    }
    if (r === 'YA_ASIGNADO') {
      return fallo('YA_ASIGNADO', 'Esa persona ya está asignada a la cuadrilla.');
    }
    return ok(undefined);
  }
}

@Injectable()
export class DesasignarCuadrillaCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}

  async ejecutar(cuadrillaId: string, personalId: string): Promise<Resultado<void>> {
    if (!(await this.repo.desasignar(cuadrillaId, personalId))) {
      return fallo('NO_ASIGNADO', 'Esa persona no está asignada a la cuadrilla.');
    }
    return ok(undefined);
  }
}

@Injectable()
export class RegistrarPagoPersonalCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}

  async ejecutar(
    personalId: string,
    tipo: string,
    concepto: string,
    montoCentimos: number,
    registradoPorId: string,
    obraId?: string,
  ): Promise<Resultado<{ id: string }>> {
    const valido = validarPago(montoCentimos, tipo, concepto);
    if (!valido.exito) {
      return valido;
    }
    if (!(await this.repo.existe(personalId))) {
      return fallo('PERSONAL_NO_EXISTE', 'No existe esa persona en el registro de personal.');
    }
    if (obraId && !(await this.repo.obraExiste(obraId))) {
      return fallo('OBRA_NO_EXISTE', 'No existe la obra indicada en el pago.');
    }
    return ok(await this.repo.registrarPago(personalId, tipo as TipoPago, concepto.trim(), montoCentimos, obraId ?? null, registradoPorId));
  }
}

@Injectable()
export class PagosPersonalCasoUso {
  constructor(@Inject(PERSONAL_REPOSITORIO) private readonly repo: PersonalRepositorio) {}

  async ejecutar(personalId: string): Promise<Resultado<{ pagos: PagoRegistrado[]; resumen: ResumenPagos }>> {
    if (!(await this.repo.existe(personalId))) {
      return fallo('PERSONAL_NO_EXISTE', 'No existe esa persona en el registro de personal.');
    }
    const pagos = await this.repo.pagosDe(personalId);
    return ok({ pagos, resumen: calcularResumenPagos(pagos) });
  }
}
