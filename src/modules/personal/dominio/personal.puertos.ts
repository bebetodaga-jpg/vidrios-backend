import { Especialidad, TipoPago } from './personal.calculos';

export interface NuevoPersonal {
  readonly nombre: string;
  readonly dni: string;
  readonly telefono?: string;
  readonly especialidad: Especialidad;
}

export interface PersonalResumen {
  readonly id: string;
  readonly nombre: string;
  readonly dni: string;
  readonly telefono: string | null;
  readonly especialidad: string;
  readonly hayActividad: boolean;
  readonly creadoEn: Date;
}

export interface IntegranteCuadrilla {
  readonly personalId: string;
  readonly nombre: string;
  readonly especialidad: string;
  readonly rol: string;
}

export interface CuadrillaResumen {
  readonly id: string;
  readonly nombre: string;
  readonly obraId: string;
  readonly obraCodigo: string;
  readonly integrantes: IntegranteCuadrilla[];
}

export interface PagoRegistrado {
  readonly id: string;
  readonly tipo: TipoPago;
  readonly concepto: string;
  readonly montoCentimos: number;
  readonly obraId: string | null;
  readonly creadoEn: Date;
}

export type ResultadoAsignacion = 'OK' | 'NO_EXISTE' | 'YA_ASIGNADO';

export const PERSONAL_REPOSITORIO = Symbol('PersonalRepositorio');
export interface PersonalRepositorio {
  dniExiste(dni: string): Promise<boolean>;
  crear(nuevo: NuevoPersonal): Promise<{ id: string }>;
  listar(buscar?: string): Promise<PersonalResumen[]>;
  existe(id: string): Promise<boolean>;

  obraExiste(obraId: string): Promise<boolean>;
  crearCuadrilla(obraId: string, nombre: string): Promise<{ id: string }>;
  listarCuadrillas(obraId?: string): Promise<CuadrillaResumen[]>;
  asignar(cuadrillaId: string, personalId: string, rol: string): Promise<ResultadoAsignacion>;
  desasignar(cuadrillaId: string, personalId: string): Promise<boolean>;

  /** La planilla es inmutable: los pagos solo se agregan, nunca se editan ni borran. */
  registrarPago(personalId: string, tipo: TipoPago, concepto: string, montoCentimos: number, obraId: string | null, registradoPorId: string): Promise<{ id: string }>;
  pagosDe(personalId: string): Promise<PagoRegistrado[]>;
}
