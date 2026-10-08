import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AuthController } from './auth/auth.controller';
import { LockoutStore } from './auth/lockout.store';
import { PasswordController } from './auth/password.controller';
import { SessionStore } from './auth/session.store';
import { SessionGuard } from './common/auth/session.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { PrismaService } from './common/prisma.service';
import { HealthController } from './health.controller';

export const GLOBAL_PREFIX = 'api/identity';

@Module({
  controllers: [HealthController, AuthController, PasswordController],
  providers: [
    HttpExceptionFilter,
    { provide: APP_FILTER, useExisting: HttpExceptionFilter },
    PrismaService,
    SessionStore,
    LockoutStore,
    SessionGuard,
  ],
})
class AppModule {}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  // Parses the HttpOnly `sid` session cookie so request guards can read it.
  app.use(cookieParser());
  // Express only believes X-Forwarded-* headers from a proxy it is told to
  // trust. Trusting the first hop is what makes `req.secure` — and therefore
  // the Secure flag on the session cookie — correct behind the TLS-terminating
  // edge while leaving plain local traffic unchanged.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  await app.init();
  return app;
}
