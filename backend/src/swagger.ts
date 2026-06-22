import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getAppName, getAppVersion, getPort, getSwaggerPath } from './configs/environment';

export function setupSwagger(app: INestApplication): void {
  const appName = getAppName();
  const appVersion = getAppVersion();
  const swaggerPath = getSwaggerPath();
  const port = getPort();

  const config = new DocumentBuilder()
    .setTitle('Tutorly API')
    .setDescription(
      `## Student–Tutor Matchmaking Platform\n\n` +
        `REST API powering the **Tutorly** platform — handles authentication, user management, ` +
        `availability scheduling, and intelligent tutor–student matchmaking.\n\n` +
        `### Authentication\n` +
        `Most endpoints require a valid **Bearer access token**. To authenticate:\n` +
        `1. Call \`POST /auth/signup\` or \`POST /auth/login\` to receive an \`accessToken\`.\n` +
        `2. Click the **Authorize 🔒** button above and paste the token (without the "Bearer " prefix).\n` +
        `3. All protected endpoints will then include the token automatically.\n\n` +
        `Access tokens expire in **1 hour**. Use \`POST /auth/refresh\` with your \`refreshToken\` to obtain a new pair.`,
    )
    .setVersion(appVersion)
    .setContact('Tutorly Team', '', 'support@tutorly.dev')
    .setLicense('UNLICENSED', '')
    .addServer(`http://localhost:${port}`, 'Local Development Server')
    // Named Bearer scheme — referenced by @ApiBearerAuth('access-token') on controllers
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your **access token** (without the "Bearer " prefix)',
        in: 'header',
      },
      'access-token',
    )
    // Separate scheme for the refresh token endpoint
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your **refresh token** (without the "Bearer " prefix)',
        in: 'header',
      },
      'refresh-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: `${appName} API Docs`,
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    swaggerOptions: {
      // Persist the token across browser reloads
      persistAuthorization: true,
      // Deep-link tab state into the URL so you can share/bookmark a specific endpoint
      deepLinking: true,
      // Show the request duration on each response
      displayRequestDuration: true,
      // Collapse all tag groups by default for a cleaner first view
      docExpansion: 'none',
      // Show the full model schemas with all enum values visible
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 3,
      // Always show the "Try it out" button expanded
      tryItOutEnabled: false,
      // Sort tags (controller groups) alphabetically
      tagsSorter: 'alpha',
      // Sort operations within each tag alphabetically
      operationsSorter: 'alpha',
      // Render enum values as a drop-down
      showExtensions: true,
      showCommonExtensions: true,
    },
  });
}
