import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type RolUsuario = 'CAJERA' | 'VENDEDORA' | 'CORTADOR' | 'AYUDANTE' | 'MAESTRO' | 'GERENTE';

const ROLES_KEY = 'roles';

/** @Roles('GERENTE', 'MAESTRO') — declara qué roles pueden ejecutar el endpoint. */
export const Roles = (...roles: RolUsuario[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);

/**
 * Autorización por rol (regla del dueño: cada trabajador ve y toca solo lo suyo).
 * Los permisos finos por área se amplían en el Sprint 10 sobre esta misma base.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[] | undefined>(ROLES_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true; // endpoint sin restricción de rol: basta estar autenticado
    }
    const peticion = contexto.switchToHttp().getRequest<{ user?: { rol?: RolUsuario } }>();
    const rol = peticion.user?.rol;
    return rol !== undefined && rolesRequeridos.includes(rol);
  }
}
