import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/module/app.module';
import { getLoggerLevels, getPort, loadEnvironmentFiles } from '@config';
import { setupSwagger } from '@/swagger';

async function bootstrap(): Promise<void> {
  loadEnvironmentFiles();
  const loggerLevels = getLoggerLevels();
  Logger.overrideLogger(loggerLevels);

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(new Logger('Bootstrap'));
  setupSwagger(app);

  const port: number = getPort();

  await app.listen(port);
  Logger.log(`Application started on port ${port}`, 'Bootstrap');
}

void bootstrap();
