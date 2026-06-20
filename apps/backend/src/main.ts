import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnv } from './common/utils/env-validator';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const allowedOrigins = [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'tauri://localhost',
    'https://tauri.localhost',
    'tauri://tauri.localhost',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Sin origin = app nativa, Postman, curl → permitir
      if (!origin) return callback(null, true);
      // Orígenes explícitos
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Electron local server (cualquier puerto en localhost/127.0.0.1)
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}

bootstrap();
