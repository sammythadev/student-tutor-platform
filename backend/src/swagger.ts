import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const appName = process.env.APP_NAME ?? 'student-tutor-matchmaking-backend';
  const appVersion = process.env.APP_VERSION ?? '0.0.0';
  const swaggerPath = process.env.SWAGGER_PATH ?? 'api-docs';

  const documentBuilder = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('Backend API for the student tutor matchmaking platform')
    .setVersion(appVersion);

  const document = SwaggerModule.createDocument(app, documentBuilder.build());

  SwaggerModule.setup(swaggerPath, app, document);
}
