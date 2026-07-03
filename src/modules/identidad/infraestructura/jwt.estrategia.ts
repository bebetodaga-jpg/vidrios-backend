import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface PayloadJwt {
  sub: string; // id del usuario
  usuario: string;
  rol: string;
}

@Injectable()
export class JwtEstrategia extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Lo retornado aquí queda disponible como `request.user` para RolesGuard. */
  validate(payload: PayloadJwt): { id: string; usuario: string; rol: string } {
    return { id: payload.sub, usuario: payload.usuario, rol: payload.rol };
  }
}
