import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, type Request, urlencoded } from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const isAuthRequest = (request: Request) => request.originalUrl.startsWith('/api/auth');

  app.use((request, response, next) => {
    if (isAuthRequest(request)) {
      next();
      return;
    }

    json()(request, response, next);
  });
  app.use((request, response, next) => {
    if (isAuthRequest(request)) {
      next();
      return;
    }

    urlencoded({ extended: true })(request, response, next);
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
