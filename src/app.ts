import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { HealthController } from './health.controller';

export const GLOBAL_PREFIX = 'api/identity';

@Module({
  controllers: [HealthController],
  providers: [
    HttpExceptionFilter,
    { provide: APP_FILTER, useExisting: HttpExceptionFilter },
  ],
})
class AppModule {}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  // Parses the HttpOnly `sid` session cookie so request guards can read it.
  app.use(cookieParser());
  await app.init();
  return app;
}
