import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function arrancar(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors(); // el frontend PWA vive en otro origen en desarrollo

  // Render/host inyectan PORT; en local usamos PUERTO (o 3000). Escuchar en 0.0.0.0 para el hosting.
  const puerto = Number(process.env.PORT ?? process.env.PUERTO ?? 3000);
  await app.listen(puerto, '0.0.0.0');
}

void arrancar();
