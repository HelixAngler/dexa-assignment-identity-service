import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import argon2 from 'argon2';
import { findPasswordProblem, passwordProblemMessage, PASSWORD_HASH_OPTIONS } from '../auth/password.policy';
import { SessionStore } from '../auth/session.store';
import { AppException } from '../common/app.exception';
import {
  RequirePermission,
  type GuardedRequest,
  SESSION_COOKIE,
  SessionGuard,
} from '../common/auth/session.guard';
import { resolveLanguage } from '../common/http-exception.filter';
import { PrismaService } from '../common/prisma.service';
import { ProfileService } from './profile.service';

interface ChangeBody {
  currentPassword?: unknown;
  newPassword?: unknown;
}

/** What this route reads: the guarded session, the cookie jar and the language. */
interface ChangeRequest extends GuardedRequest {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Verifies a candidate password against the stored hash. A hash this service
 * did not write is treated as a mismatch rather than an error, so a damaged
 * row answers the same way a wrong password does.
 */
async function currentPasswordMatches(
  hash: string,
  candidate: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, candidate);
  } catch {
    return false;
  }
}

/**
 * Self-service password change.
 *
 * The route insists on the current password first: without it there is nothing
 * to discuss, and the caller gets the same answer a wrong password always
 * gets. Only then does the new password face the shared strength rule, which
 * answers 400 with a reason-specific sentence in the active language.
 *
 * Saving runs through the shared profile write, so the new hash and exactly
 * one redacted outbox event commit together — the event records only that the
 * password changed. Afterwards the caller's own session is rewritten so its
 * forced-change flag matches the row just written, and every other session of
 * the same person is dropped: this device stays signed in, every other device
 * has to sign in again with the new password.
 */
@Controller('auth/password')
@UseGuards(SessionGuard)
export class PasswordChangeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profile: ProfileService,
    private readonly sessions: SessionStore,
  ) {}

  @Post('change')
  @RequirePermission('password:change_own')
  @HttpCode(200)
  async change(
    @Body() body: ChangeBody,
    @Req() request: ChangeRequest,
  ): Promise<void> {
    const session = request.session;
    if (!session) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }

    const currentPassword =
      typeof body?.currentPassword === 'string' ? body.currentPassword : null;
    if (currentPassword === null) {
      throw new AppException(401, 'AUTH_INVALID');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: session.employeeId },
    });
    if (!employee) {
      // The account behind this session is gone, so the session is worthless.
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    if (!(await currentPasswordMatches(employee.passwordHash, currentPassword))) {
      throw new AppException(401, 'AUTH_INVALID');
    }

    const language = resolveLanguage(request.headers?.['accept-language']);
    const newPassword =
      typeof body?.newPassword === 'string' ? body.newPassword : null;
    if (newPassword === null) {
      throw new AppException(400, 'PASSWORD_WEAK');
    }
    const problem = findPasswordProblem(newPassword);
    if (problem) {
      throw new AppException(400, 'PASSWORD_WEAK', {
        message: passwordProblemMessage(problem, language),
      });
    }

    const passwordHash = await argon2.hash(newPassword, PASSWORD_HASH_OPTIONS);
    await this.profile.changePassword(employee.id, passwordHash, session.role);

    await this.sessions.update(token, { mustChangePassword: false });
    await this.sessions.deleteOthersForEmployee(employee.id, token);
  }
}
