import { ErrorNegocio } from '@shared/dominio/resultado';

/**
 * Permite ABORTAR una transacción Prisma con un error de negocio tipado:
 * el adaptador lanza, la transacción hace rollback, el caso de uso lo
 * traduce de vuelta a Resultado (el dominio sigue sin conocer excepciones).
 */
export class ErrorNegocioException extends Error {
  constructor(readonly detalle: ErrorNegocio) {
    super(detalle.mensaje);
    this.name = 'ErrorNegocioException';
  }
}
