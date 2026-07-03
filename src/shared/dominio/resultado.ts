/**
 * Resultado<T>: los flujos de negocio esperables NO lanzan excepciones (estándar §5).
 * El que llama está obligado por el tipo a manejar ambos caminos.
 */
export interface ErrorNegocio {
  readonly codigo: string;
  /** Mensaje en español, listo para mostrarse al usuario. */
  readonly mensaje: string;
}

export type Resultado<T> = { readonly exito: true; readonly valor: T } | { readonly exito: false; readonly error: ErrorNegocio };

export const ok = <T>(valor: T): Resultado<T> => ({ exito: true, valor });

export const fallo = <T = never>(codigo: string, mensaje: string): Resultado<T> => ({
  exito: false,
  error: { codigo, mensaje },
});
