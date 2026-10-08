import type { INestApplication } from '@nestjs/common';
import { Logger, Module } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AuthController } from './auth/auth.controller';
import { LockoutStore } from './auth/lockout.store';
import { PasswordController } from './auth/password.controller';
import { SessionStore } from './auth/session.store';
import { SessionGuard } from './common/auth/session.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { PrismaService } from './common/prisma.service';
import { GLOBAL_PREFIX } from './config';
import { CloseOpenClient } from './employees/close-open.client';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { HealthController } from './health.controller';
import { PasswordChangeController } from './profile/password.controller';
import { PhotoController } from './profile/photo.controller';
import { PhotoStorage } from './profile/photo.storage';
import { ProfileController } from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';

// Kept re-exported: this used to be where the prefix constant lived.
export { GLOBAL_PREFIX };

@Module({
  controllers: [
    HealthController,
    AuthController,
    PasswordController,
    PasswordChangeController,
    ProfileController,
    PhotoController,
    EmployeesController,
  ],
  providers: [
    HttpExceptionFilter,
    { provide: APP_FILTER, useExisting: HttpExceptionFilter },
    PrismaService,
    ProfileService,
    SessionStore,
    LockoutStore,
    SessionGuard,
    PhotoStorage,
    EmployeesService,
    CloseOpenClient,
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
  // The photo bucket only matters once somebody uploads, so a store that is
  // not reachable yet is reported instead of holding up the whole boot.
  try {
    await app.get(PhotoStorage).ensureBucket();
  } catch (error) {
    Logger.warn(`photo storage is not ready yet: ${String(error)}`);
  }
  return app;
}
