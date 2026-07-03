import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege todo endpoint que no sea login. Se aplica por controlador (S0); global en S10. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
