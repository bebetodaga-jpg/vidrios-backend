import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString, MinLength } from 'class-validator';
import { compare } from 'bcrypt';
import { PrismaService } from '@shared/infraestructura/prisma.service';

class LoginDto {
  @IsString()
  usuario!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

/**
 * Login mínimo del Sprint 0. Nota de deuda registrada: en el Sprint 10 (personal y permisos)
 * este módulo se refactoriza a hexagonal completo con auditoría y bloqueo por intentos.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ token: string; nombre: string; rol: string }> {
    const usuario = await this.prisma.usuario.findUnique({ where: { usuario: dto.usuario } });
    const mensajeGenerico = 'Usuario o contraseña incorrectos.'; // no revelar cuál falló

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(mensajeGenerico);
    }
    const esPasswordValida = await compare(dto.password, usuario.hashPassword);
    if (!esPasswordValida) {
      throw new UnauthorizedException(mensajeGenerico);
    }

    const token = await this.jwt.signAsync({ sub: usuario.id, usuario: usuario.usuario, rol: usuario.rol });
    return { token, nombre: usuario.nombre, rol: usuario.rol };
  }
}
