import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Middleware: Helmet Security Headers
  app.use(helmet());

  // Security Middleware: Cookie Parser for HTTP-Only Refresh Token Cookies
  app.use(cookieParser());

  // Security Middleware: CORS Policy
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global Input Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Exception Filter for Standard JSON Error Response
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger OpenAPI Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Recommendation Traveller Lampung - REST API Gateway')
    .setDescription(
      'Enterprise NestJS REST API Gateway Documentation covering Auth, ML Recommendations Proxy, PostGIS Spatial Radius Search, User Bookmarks, Planner, Reviews NLP, and Raden Gajah AI Concierge Chatbot.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter Access Token obtained from /api/v1/auth/login or /api/v1/auth/register',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[INFO] NestJS Backend Gateway running on http://localhost:${port}/api/v1/health`);
  console.log(`[INFO] Interactive Swagger OpenAPI Documentation available on http://localhost:${port}/docs`);
}
bootstrap();
