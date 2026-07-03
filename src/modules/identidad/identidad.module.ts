import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '@shared/infraestructura/prisma.service';
import { AuthController } from './infraestructura/auth.controller';
import { JwtEstrategia } from './infraestructura/jwt.estrategia';
import { RolesGuard } from './infraestructura/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // La librería tipa expiresIn como duración de `ms` ("8h", "30m"); env entrega string plano.
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRA') ?? '8h') as JwtSignOptions['expiresIn'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [PrismaService, JwtEstrategia, RolesGuard],
  exports: [RolesGuard],
})
export class IdentidadModule {}
