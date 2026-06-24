import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/module/app.module';
import { getCorsOrigin, getLoggerLevels, getPort, getSwaggerPath, loadEnvironmentFiles } from '@config';
import { AppLoggerService } from '@common/logger';
import { setupSwagger } from '@/swagger';

async function bootstrap(): Promise<void> {
  loadEnvironmentFiles();

  // Bootstrap a temporary logger using the configured levels so that startup
  // messages respect LOG_LEVEL before the DI container is ready.
  getLoggerLevels(); // validates LOG_LEVEL env var eagerly

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Hand off logging to the DI-managed AppLoggerService which backs all
  // structured output (console + optional file transport).
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.enableCors({
    origin: getCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  setupSwagger(app);

  const port: number = getPort();

  await app.listen(port);
  logger.log(`Application started on port ${port}`, 'Bootstrap');
  logger.log(
    `Swagger docs available at http://localhost:${port}/${getSwaggerPath()}`,
    'Bootstrap',
  );
}

void bootstrap();
