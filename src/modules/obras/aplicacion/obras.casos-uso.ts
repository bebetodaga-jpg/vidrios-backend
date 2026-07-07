import { Inject, Injectable } from '@nestjs/common';
import { validarMedida } from '@shared/dominio/medidas';
import { Resultado, fallo, ok } from '@shared/dominio/resultado';
import { RolMedidor, autorizarMedida, exigeFoto, tipoSiguienteMedida } from '../dominio/medida.calculos';
import { EstadoObra, avanzarEstadoObra } from '../dominio/obra-estado.calculos';
import {
  OBRAS_REPOSITORIO,
  ObraDetalle,
  ObraResumen,
  ObrasRepositorio,
  VanoSync,
} from '../dominio/obras.repositorio';

@Injectable()
export class CrearObraCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}

  async ejecutar(clienteId: string, direccion: string): Promise<Resultado<{ id: string; codigo: string }>> {
    if (direccion.trim().length < 3) {
      return fallo('DIRECCION_REQUERIDA', 'Indique la dirección de la obra.');
    }
    if (!(await this.obras.clienteExiste(clienteId))) {
      return fallo('CLIENTE_NO_EXISTE', 'El cliente indicado no existe.');
    }
    return ok(await this.obras.crearObra(clienteId, direccion.trim()));
  }
}

@Injectable()
export class ListarObrasCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}
  ejecutar(): Promise<ObraResumen[]> {
    return this.obras.listar();
  }
}

@Injectable()
export class DetalleObraCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}
  async ejecutar(obraId: string): Promise<Resultado<ObraDetalle>> {
    const detalle = await this.obras.detalle(obraId);
    return detalle ? ok(detalle) : fallo('OBRA_NO_EXISTE', 'No existe la obra.');
  }
}

@Injectable()
export class AgregarAmbienteCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}
  async ejecutar(obraId: string, nombre: string): Promise<Resultado<{ id: string }>> {
    if (nombre.trim().length < 2) {
      return fallo('NOMBRE_REQUERIDO', 'Indique el nombre del ambiente.');
    }
    const r = await this.obras.agregarAmbiente(obraId, nombre.trim());
    return r ? ok(r) : fallo('OBRA_NO_EXISTE', 'No existe la obra.');
  }
}

@Injectable()
export class RegistrarMedidaCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}

  async ejecutar(vanoId: string, anchoMm: number, altoMm: number, autorId: string, rol: RolMedidor): Promise<Resultado<{ tipo: string }>> {
    const previas = await this.obras.contarMedidas(vanoId);
    if (previas === null) {
      return fallo('VANO_NO_EXISTE', 'No existe el vano.');
    }
    const medida = validarMedida(anchoMm, altoMm);
    if (!medida.exito) {
      return medida;
    }
    const tipo = tipoSiguienteMedida(previas);
    const auth = autorizarMedida(tipo, rol);
    if (!auth.exito) {
      return auth;
    }
    await this.obras.registrarMedida(vanoId, tipo, anchoMm, altoMm, autorId);
    return ok({ tipo });
  }
}

@Injectable()
export class AvanzarEstadoObraCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}

  /** Avanza la obra una etapa (medición → remetreo → corte → … → entregada). */
  async ejecutar(obraId: string, nuevo: EstadoObra): Promise<Resultado<{ estado: EstadoObra }>> {
    const actual = await this.obras.estadoObra(obraId);
    if (!actual) {
      return fallo('OBRA_NO_EXISTE', 'No existe la obra.');
    }
    const transicion = avanzarEstadoObra(actual, nuevo);
    if (!transicion.exito) {
      return transicion;
    }
    await this.obras.cambiarEstadoObra(obraId, nuevo);
    return ok({ estado: nuevo });
  }
}

@Injectable()
export class SincronizarCasoUso {
  constructor(@Inject(OBRAS_REPOSITORIO) private readonly obras: ObrasRepositorio) {}

  /** Recibe el lote capturado offline. Idempotente y con la regla de remetreo aplicada. */
  async ejecutar(ambienteId: string, vanos: VanoSync[], autorId: string, rol: RolMedidor): Promise<Resultado<{ vanos: number; medidas: number }>> {
    // Idempotencia: las medidas ya sincronizadas no cuentan como remetreo nuevo.
    const existentes = await this.obras.medidasExistentes(vanos.flatMap((v) => v.medidas.map((m) => m.id)));
    for (const vano of vanos) {
      // Validación de cada medida y de la foto obligatoria del vano con detalle.
      const foto = exigeFoto(vano.tieneDetalle, !!vano.fotoUrl);
      if (!foto.exito) {
        return foto;
      }
      for (const m of vano.medidas) {
        const v = validarMedida(m.anchoMm, m.altoMm);
        if (!v.exito) {
          return v;
        }
      }
      // Si el vano ya tenía medidas y llegan medidas NUEVAS, eso es remetreo → exige autorización.
      const nuevas = vano.medidas.filter((m) => !existentes.has(m.id));
      const previas = (await this.obras.contarMedidas(vano.id)) ?? 0;
      if (previas > 0 && nuevas.length > 0) {
        const auth = autorizarMedida('REMETREO', rol);
        if (!auth.exito) {
          return auth;
        }
      }
    }
    const r = await this.obras.sincronizar(ambienteId, vanos, autorId);
    return r ? ok(r) : fallo('AMBIENTE_NO_EXISTE', 'No existe el ambiente.');
  }
}
