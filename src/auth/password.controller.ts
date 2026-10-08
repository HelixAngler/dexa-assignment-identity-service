import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import argon2 from 'argon2';
import { AppException } from '../common/app.exception';
import type { GuardedRequest } from '../common/auth/session.guard';
import { SESSION_COOKIE, SessionGuard } from '../common/auth/session.guard';
import { resolveLanguage } from '../common/http-exception.filter';
import { PrismaService } from '../common/prisma.service';
import {
  findPasswordProblem,
  passwordMismatchMessage,
  passwordProblemMessage,
  PASSWORD_HASH_OPTIONS,
} from './password.policy';
import { SessionStore } from './session.store';

interface SetFirstBody {
  newPassword?: unknown;
  confirmPassword?: unknown;
}

interface SetFirstResponse {
  mustChangePassword: boolean;
}

/** What this route reads: the session the guard attached plus the language header. */
interface SetFirstRequest extends GuardedRequest {
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * The forced first password change: reachable only while the session still
 * carries the forced-change flag, which the guard has already loaded.
 *
 * Field types are checked before anything else so a non-string input is refused
 * with the shared weak-password answer instead of reaching the hash step. The
 * strength rule and the confirmation check both answer 400 with the machine
 * code `PASSWORD_WEAK` and a reason-specific sentence chosen from the active
 * language, so the client can show the user exactly what to fix.
 *
 * Saving writes the new hash and the cleared flag together with one outbox row
 * in a single database transaction, then rewrites the caller's own session and
 * drops every other session of the same person: the change takes effect on the
 * next request of this device while every other device has to sign in again.
 */
@Controller('auth/password')
@UseGuards(SessionGuard)
export class PasswordController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionStore,
  ) {}

  @Post('set-first')
  @HttpCode(200)
  async setFirst(
    @Body() body: SetFirstBody,
    @Req() request: SetFirstRequest,
  ): Promise<SetFirstResponse> {
    const session = request.session;
    if (!session) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    if (!session.mustChangePassword) {
      throw new AppException(403, 'FORBIDDEN');
    }

    const language = resolveLanguage(request.headers?.['accept-language']);
    const newPassword = body?.newPassword;
    const confirmPassword = body?.confirmPassword;
    if (typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
      throw new AppException(400, 'PASSWORD_WEAK');
    }

    const problem = findPasswordProblem(newPassword);
    if (problem) {
      throw new AppException(400, 'PASSWORD_WEAK', {
        message: passwordProblemMessage(problem, language),
      });
    }
    if (newPassword !== confirmPassword) {
      throw new AppException(400, 'PASSWORD_WEAK', {
        message: passwordMismatchMessage(language),
      });
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: session.employeeId },
    });
    if (!employee) {
      // The account behind this session is gone, so the session is worthless.
      throw new AppException(401, 'AUTH_REQUIRED');
    }

    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }

    const passwordHash = await argon2.hash(newPassword, PASSWORD_HASH_OPTIONS);
    await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id: employee.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      }),
      this.prisma.profileChangeEvent.create({
        data: {
          employeeId: employee.id,
          actorId: employee.id,
          actorRole: employee.role,
          changedFields: ['password'],
          beforeValues: { password: '[redacted]' },
          afterValues: { password: '[redacted]' },
        },
      }),
    ]);

    await this.sessions.update(token, { mustChangePassword: false });
    await this.sessions.deleteOthersForEmployee(employee.id, token);

    return { mustChangePassword: false };
  }
}
