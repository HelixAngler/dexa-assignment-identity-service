import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppException } from '../common/app.exception';
import {
  Public,
  SESSION_COOKIE,
  SessionGuard,
} from '../common/auth/session.guard';
import { PrismaService } from '../common/prisma.service';
import { FAILURE_LIMIT, LockoutStore } from './lockout.store';
import {
  ABSOLUTE_TTL_MS,
  SessionStore,
  type SessionRole,
} from './session.store';

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface LoginResponse {
  role: SessionRole;
  mustChangePassword: boolean;
}

/**
 * Hash of a random throwaway value. It is verified against whenever the email
 * matches no account, so an unknown address spends the same work as a known
 * one and the two cannot be told apart by response timing.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$NkCPCjedC766gS3mVLcESA$se08Y0YJQmZ6nJ6Pr2Qbg7Wyu+zOz/XSgmPGSFxI7zU';

async function passwordMatches(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Sign-in and sign-out.
 *
 * Sign-in refuses an account that is currently locked before any credential
 * work happens, so the lock holds even against the right password — otherwise
 * the counter would not slow an attacker down at all. Every other failure
 * (unknown address, wrong password, deactivated account) spends one attempt and
 * answers with the same body, and the first four failures say how many attempts
 * are left while the fifth one flips the key into its lock window.
 *
 * Sign-out is the exact inverse of the cookie the sign-in set: the record is
 * deleted and the cookie is emptied, so replaying the old token is no longer
 * authenticated.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionStore,
    private readonly lockout: LockoutStore,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body() body: LoginBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const email = (
      typeof body?.email === 'string' ? body.email : ''
    )
      .trim()
      .toLowerCase();
    const password = typeof body?.password === 'string' ? body.password : '';

    if ((await this.lockout.count(email)) >= FAILURE_LIMIT) {
      throw new AppException(423, 'AUTH_LOCKED');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { email },
    });
    const passwordOk = await passwordMatches(
      employee ? employee.passwordHash : DUMMY_PASSWORD_HASH,
      password,
    );

    if (employee && passwordOk && employee.status === 'active') {
      await this.lockout.clear(email);
      const token = randomBytes(32).toString('base64url');
      await this.sessions.create(token, {
        employeeId: employee.id,
        role: employee.role,
        mustChangePassword: employee.mustChangePassword,
      });
      response.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: request.secure,
        maxAge: ABSOLUTE_TTL_MS,
      });
      return {
        role: employee.role,
        mustChangePassword: employee.mustChangePassword,
      };
    }

    const failures = await this.lockout.registerFailure(email);
    if (failures >= FAILURE_LIMIT) {
      throw new AppException(423, 'AUTH_LOCKED');
    }
    throw new AppException(401, 'AUTH_INVALID', {
      attemptsRemaining: FAILURE_LIMIT - failures,
    });
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) {
      await this.sessions.delete(token);
    }
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: request.secure,
    });
  }
}
