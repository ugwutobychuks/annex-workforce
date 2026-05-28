import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('v1', { exclude: ['health', 'health/(.*)'] });
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ─── OpenAPI / Swagger ─────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Annex Workforce API')
    .setDescription('Trusted talent infrastructure for Africa')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & sessions')
    .addTag('candidates', 'Talent profiles & marketplace')
    .addTag('employers', 'Employer accounts')
    .addTag('jobs', 'Job postings')
    .addTag('applications', 'Job applications')
    .addTag('verification', 'Identity & credential verification')
    .addTag('eor', 'Employer-of-Record contracts')
    .addTag('payroll', 'Payroll & compliance')
    .addTag('hrms', 'HR management')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });

  const port = parseInt(process.env.API_PORT ?? '4000', 10);
  const host = process.env.API_HOST ?? '0.0.0.0';
  await app.listen(port, host);

  Logger.log(`🚀 Annex API running on http://${host}:${port}`, 'Bootstrap');
  Logger.log(`📚 API docs at  http://${host}:${port}/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
