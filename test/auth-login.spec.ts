import type { INestApplication } from '@nestjs/common';
import argon2 from 'argon2';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  ABSOLUTE_TTL_MS,
  IDLE_TTL_MS,
  SessionStore,
} from '../src/auth/session.store';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { config } from '../src/config';
import { PrismaClient } from '../src/generated/prisma';

/**
 * Sign-in behaviour: identical credential failures with no account
 * enumeration, a failure counter that locks an account, the counter reset on
 * success, the absolute session age and the exact shape of a successful
 * sign-in.
 *
 * Every account used here is created by this suite and dropped afterwards, and
 * the Redis state it touches (lockout counters and issued sessions) is cleared
 * around each test so the countdown always starts from a known state.
 */

const LOGIN_URL = '/api/identity/auth/login';
const LOGOUT_URL = '/api/identity/auth/logout';

/** Same argon2id parameters the demo accounts are hashed with. */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const FAILURE_LIMIT = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

interface TestAccount {
  email: string;
  password: string;
  role: 'employee' | 'hrd';
  status: 'active' | 'deactivated';
  mustChangePassword: boolean;
  id: string;
}

const ACCOUNTS: TestAccount[] = [
  {
    email: 'auth-login-active@company.com',
    password: 'Riverstone-Glass-7734',
    role: 'employee',
    status: 'active',
    mustChangePassword: false,
    id: '',
  },
  {
    email: 'auth-login-hrd@company.com',
    password: 'Harbour-Lantern-5521',
    role: 'hrd',
    status: 'active',
    mustChangePassword: false,
    id: '',
  },
  {
    email: 'auth-login-temporary@company.com',
    password: 'Willow-Kestrel-1908',
    role: 'employee',
    status: 'active',
    mustChangePassword: true,
    id: '',
  },
  {
    email: 'auth-login-deactivated@company.com',
    password: 'Cobalt-Meadow-6402',
    role: 'employee',
    status: 'deactivated',
    mustChangePassword: false,
    id: '',
  },
  {
    email: 'auth-login-lockout@company.com',
    password: 'Juniper-Anchor-3357',
    role: 'employee',
    status: 'active',
    mustChangePassword: false,
    id: '',
  },
  {
    email: 'auth-login-counter-reset@company.com',
    password: 'Maple-Cascade-8846',
    role: 'employee',
    status: 'active',
    mustChangePassword: false,
    id: '',
  },
];

const accountFor = (email: string): TestAccount => {
  const account = ACCOUNTS.find((candidate) => candidate.email === email);
  if (!account) {
    throw new Error(`unknown test account ${email}`);
  }
  return account;
};

const activeAccount = (): TestAccount =>
  accountFor('auth-login-active@company.com');
const hrdAccount = (): TestAccount => accountFor('auth-login-hrd@company.com');
const temporaryAccount = (): TestAccount =>
  accountFor('auth-login-temporary@company.com');
const deactivatedAccount = (): TestAccount =>
  accountFor('auth-login-deactivated@company.com');
const lockoutTarget = (): TestAccount =>
  accountFor('auth-login-lockout@company.com');
const counterResetTarget = (): TestAccount =>
  accountFor('auth-login-counter-reset@company.com');

/** An address no employee row will ever carry. */
const UNKNOWN_EMAIL = 'auth-login-nobody@company.com';

const lockoutKey = (email: string): string =>
  `lockout:${email.trim().toLowerCase()}`;
const sessionKey = (token: string): string => `sess:${token}`;

const allLockoutKeys = (): string[] => [
  ...ACCOUNTS.map((account) => lockoutKey(account.email)),
  lockoutKey(UNKNOWN_EMAIL),
];

/** Normalizes the shapes a Set-Cookie value arrives in: an object's
 * `set-cookie` field, one raw header line, or several of them at once. */
function setCookieList(headers: unknown): string[] {
  if (Array.isArray(headers)) {
    return headers.filter((line): line is string => typeof line === 'string');
  }
  if (typeof headers === 'string') {
    return [headers];
  }
  if (typeof headers === 'object' && headers !== null) {
    return setCookieList(
      (headers as Record<string, unknown>)['set-cookie'] ?? [],
    );
  }
  return [];
}

const issuedTokens: string[] = [];

/** Pulls the raw session token out of the `sid` cookie the login set. */
function sidFrom(headers: unknown): string {
  const cookie = setCookieList(headers).find((line) =>
    line.startsWith('sid='),
  );
  if (!cookie) {
    throw new Error('sign-in response did not set the sid cookie');
  }
  const token = cookie.slice('sid='.length).split(';')[0] ?? '';
  issuedTokens.push(token);
  return token;
}

async function readSession(
  raw: Redis,
  token: string,
): Promise<Record<string, unknown>> {
  const stored = await raw.get(sessionKey(token));
  if (stored === null) {
    throw new Error(`session key ${sessionKey(token)} is missing`);
  }
  return JSON.parse(stored) as Record<string, unknown>;
}

describe('POST /auth/login', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let raw: Redis;

  const postLogin = (payload: Record<string, unknown>) =>
    request(app.getHttpServer()).post(LOGIN_URL).send(payload);

  const postLogout = (token?: string) => {
    const call = request(app.getHttpServer()).post(LOGOUT_URL);
    return token === undefined
      ? call
      : call.set('Cookie', `sid=${token}`);
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    raw = new Redis(config.redisUrl);

    for (const account of ACCOUNTS) {
      const passwordHash = await argon2.hash(account.password, HASH_OPTIONS);
      const row = await prisma.employee.upsert({
        where: { email: account.email },
        update: {
          passwordHash,
          role: account.role,
          status: account.status,
          mustChangePassword: account.mustChangePassword,
        },
        create: {
          email: account.email,
          name: `Login Spec ${account.email}`,
          position: 'QA Engineer',
          phone: '+62-811-0000-0777',
          passwordHash,
          role: account.role,
          status: account.status,
          mustChangePassword: account.mustChangePassword,
        },
      });
      account.id = row.id;
    }

    app = await createApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    const employeeIds = ACCOUNTS.map((account) => account.id).filter(
      (id) => id !== '',
    );
    if (employeeIds.length > 0) {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: { in: employeeIds } },
      });
      await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }
    const keys = [...issuedTokens.map(sessionKey), ...allLockoutKeys()];
    await raw.del(...keys);
    await prisma.$disconnect();
    raw.disconnect();
  });

  beforeEach(async () => {
    await raw.del(...allLockoutKeys());
  });

  describe('credential failures', () => {
    it('answers an unknown email and a wrong password with the identical 401 body', async () => {
      const unknownEmail = await postLogin({
        email: UNKNOWN_EMAIL,
        password: 'Whatever-First-Attempt-1',
      });
      const wrongPassword = await postLogin({
        email: activeAccount().email,
        password: 'Whatever-Wrong-Password-1',
      });

      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.status).toBe(401);

      const expectedBody = {
        statusCode: 401,
        code: 'AUTH_INVALID',
        message: ERROR_MESSAGES.id.AUTH_INVALID,
        attemptsRemaining: FAILURE_LIMIT - 1,
      };
      expect(unknownEmail.body).toEqual(expectedBody);
      expect(wrongPassword.body).toEqual(expectedBody);

      // Byte-for-byte the same response: nothing distinguishes the two cases.
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(JSON.stringify(unknownEmail.body)).toBe(
        JSON.stringify(wrongPassword.body),
      );
    });

    it('reports a deactivated account with the same 401 body as an unknown email', async () => {
      const deactivated = await postLogin({
        email: deactivatedAccount().email,
        password: deactivatedAccount().password,
      });
      const unknownEmail = await postLogin({
        email: UNKNOWN_EMAIL,
        password: 'Whatever-First-Attempt-2',
      });

      expect(deactivated.status).toBe(401);
      expect(deactivated.body).toEqual(unknownEmail.body);
      expect(deactivated.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_INVALID',
      });
    });

    it('counts down attemptsRemaining over the first four failures and locks on the fifth', async () => {
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        const response = await postLogin({
          email: lockoutTarget().email,
          password: `Wrong-Passphrase-${attempt}`,
        });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          statusCode: 401,
          code: 'AUTH_INVALID',
          message: ERROR_MESSAGES.id.AUTH_INVALID,
          attemptsRemaining: FAILURE_LIMIT - attempt,
        });
        expect(Object.keys(response.body).sort()).toEqual([
          'attemptsRemaining',
          'code',
          'message',
          'statusCode',
        ]);
      }

      const fifth = await postLogin({
        email: lockoutTarget().email,
        password: 'Wrong-Passphrase-5',
      });

      expect(fifth.status).toBe(423);
      expect(fifth.body).toEqual({
        statusCode: 423,
        code: 'AUTH_LOCKED',
        message: ERROR_MESSAGES.id.AUTH_LOCKED,
      });
      expect(fifth.body).not.toHaveProperty('attemptsRemaining');

      const pttl = await raw.pttl(lockoutKey(lockoutTarget().email));
      expect(pttl).toBeGreaterThan(0);
      expect(pttl).toBeLessThanOrEqual(LOCK_WINDOW_MS);

      const sixth = await postLogin({
        email: lockoutTarget().email,
        password: 'Wrong-Passphrase-6',
      });
      expect(sixth.status).toBe(423);
      expect(sixth.body).not.toHaveProperty('attemptsRemaining');
    });

    it('resets the failure counter after a successful sign-in', async () => {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const response = await postLogin({
          email: counterResetTarget().email,
          password: `Wrong-Again-${attempt}`,
        });
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          statusCode: 401,
          code: 'AUTH_INVALID',
          attemptsRemaining: FAILURE_LIMIT - attempt,
        });
      }

      const signIn = await postLogin({
        email: counterResetTarget().email,
        password: counterResetTarget().password,
      });
      expect(signIn.status).toBe(200);
      expect(await raw.exists(lockoutKey(counterResetTarget().email))).toBe(0);

      // The countdown starts over: four fresh 401s before the lock returns.
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        const response = await postLogin({
          email: counterResetTarget().email,
          password: `Wrong-After-Reset-${attempt}`,
        });
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          statusCode: 401,
          code: 'AUTH_INVALID',
          attemptsRemaining: FAILURE_LIMIT - attempt,
        });
      }

      const lockedAgain = await postLogin({
        email: counterResetTarget().email,
        password: 'Wrong-After-Reset-5',
      });
      expect(lockedAgain.status).toBe(423);
      expect(lockedAgain.body).not.toHaveProperty('attemptsRemaining');
    });

    it('refuses every attempt, including a correct password, while the account is locked', async () => {
      for (let attempt = 1; attempt <= FAILURE_LIMIT; attempt += 1) {
        const response = await postLogin({
          email: lockoutTarget().email,
          password: `Wrong-Lock-${attempt}`,
        });
        expect(response.status).toBe(attempt === FAILURE_LIMIT ? 423 : 401);
      }

      const withCorrectPassword = await postLogin({
        email: lockoutTarget().email,
        password: lockoutTarget().password,
      });

      expect(withCorrectPassword.status).toBe(423);
      expect(withCorrectPassword.body).toEqual({
        statusCode: 423,
        code: 'AUTH_LOCKED',
        message: ERROR_MESSAGES.id.AUTH_LOCKED,
      });
      expect(setCookieList(withCorrectPassword.headers).some((line) =>
        line.startsWith('sid='),
      )).toBe(false);
    });
  });

  describe('successful sign-in', () => {
    it('sets an HttpOnly sid cookie and returns the role and password-change flag', async () => {
      const startedAt = Date.now();
      const response = await postLogin({
        email: activeAccount().email,
        password: activeAccount().password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        role: 'employee',
        mustChangePassword: false,
      });

      const cookies = setCookieList(response.headers);
      const sidCookie = cookies.find((line) => line.startsWith('sid='));
      expect(sidCookie).toBeDefined();
      expect(sidCookie).toContain('HttpOnly');
      expect(sidCookie).toContain('Path=/');
      expect(sidCookie).toContain('SameSite=Lax');

      const token = sidFrom(response.headers);
      // 32 random bytes rendered as base64url: 43 characters, no padding.
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const payload = await readSession(raw, token);
      expect(Object.keys(payload).sort()).toEqual([
        'employeeId',
        'issuedAt',
        'lastSeen',
        'mustChangePassword',
        'role',
      ]);
      expect(payload).toEqual({
        employeeId: activeAccount().id,
        role: 'employee',
        mustChangePassword: false,
        lastSeen: expect.any(Number),
        issuedAt: expect.any(Number),
      });
      expect(payload.issuedAt as number).toBeGreaterThanOrEqual(startedAt);
      expect(payload.issuedAt as number).toBeLessThanOrEqual(Date.now());
      expect(payload.lastSeen as number).toBeGreaterThanOrEqual(startedAt);
      expect(payload.lastSeen as number).toBeLessThanOrEqual(Date.now());
    });

    it('carries the hrd role and the forced-change flag into the response and the session', async () => {
      const temporary = await postLogin({
        email: temporaryAccount().email,
        password: temporaryAccount().password,
      });
      expect(temporary.status).toBe(200);
      expect(temporary.body).toEqual({
        role: 'employee',
        mustChangePassword: true,
      });
      sidFrom(temporary.headers);

      const hrd = await postLogin({
        email: hrdAccount().email,
        password: hrdAccount().password,
      });
      expect(hrd.status).toBe(200);
      expect(hrd.body).toEqual({
        role: 'hrd',
        mustChangePassword: false,
      });

      const payload = await readSession(raw, sidFrom(hrd.headers));
      expect(payload).toMatchObject({
        employeeId: hrdAccount().id,
        role: 'hrd',
        mustChangePassword: false,
      });
    });
  });

  describe('absolute session age', () => {
    it('honours the twelve-hour cap through the store clock without waiting in real time', async () => {
      expect(ABSOLUTE_TTL_MS).toBe(12 * 60 * 60 * 1000);
      expect(IDLE_TTL_MS).toBe(30 * 60 * 1000);

      const response = await postLogin({
        email: activeAccount().email,
        password: activeAccount().password,
      });
      const token = sidFrom(response.headers);
      const payload = await readSession(raw, token);
      const issuedAt = payload.issuedAt as number;

      // The store is handed the real lifetime limits and an injected clock, so
      // twelve hours are moved through in milliseconds instead of waited out.
      let nowMs = issuedAt;
      const store = new SessionStore({
        redisUrl: config.redisUrl,
        idleTtlMs: IDLE_TTL_MS,
        absoluteTtlMs: ABSOLUTE_TTL_MS,
        now: () => nowMs,
      });

      try {
        nowMs = issuedAt + ABSOLUTE_TTL_MS - 1_000;
        expect(await store.get(token)).not.toBeNull();

        nowMs = issuedAt + ABSOLUTE_TTL_MS;
        expect(await store.get(token)).toBeNull();
        expect(await raw.exists(sessionKey(token))).toBe(0);
      } finally {
        await store.quit();
      }
    });

    it('refuses a guarded request once the issued session is older than the cap', async () => {
      const response = await postLogin({
        email: activeAccount().email,
        password: activeAccount().password,
      });
      const token = sidFrom(response.headers);
      const payload = await readSession(raw, token);

      const expiredAt = Date.now() - ABSOLUTE_TTL_MS - 2_000;
      await raw.set(
        sessionKey(token),
        JSON.stringify({
          employeeId: payload.employeeId,
          role: payload.role,
          mustChangePassword: payload.mustChangePassword,
          issuedAt: expiredAt,
          lastSeen: expiredAt,
        }),
        'PX',
        60_000,
      );

      const logout = await postLogout(token);

      expect(logout.status).toBe(401);
      expect(logout.body).toEqual({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
        message: ERROR_MESSAGES.id.AUTH_REQUIRED,
      });
      expect(await raw.exists(sessionKey(token))).toBe(0);
    });
  });
});
