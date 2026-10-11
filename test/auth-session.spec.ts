import type { INestApplication } from '@nestjs/common';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { SessionStore } from '../src/auth/session.store';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { config } from '../src/config';
import { PrismaClient } from '../src/generated/prisma';

/**
 * Session lifecycle beyond sign-in: ending a session on logout, and the forced
 * first password change that owns its own route. Sessions are seeded straight
 * into the shared store so each case controls exactly one thing, and every
 * account these tests create is removed together with the events it wrote.
 */

const LOGOUT_URL = '/api/identity/auth/logout';
const SET_FIRST_URL = '/api/identity/auth/password/set-first';

const FORCED_EMAIL = 'auth-session-forced@company.com';
const PLAIN_EMAIL = 'auth-session-plain@company.com';
const CHANGING_EMAIL = 'auth-session-changing@company.com';

const FORCED_PASSWORD = 'Sunflower-Vault-3391';

/** Passwords that must be refused even though they clear every other rule. */
const BREACHED_SAMPLES = [
  'password',
  'Password',
  '12345678',
  'qwerty123',
  'iloveyou',
  'football',
  'trustno1',
  'welcome1',
  'admin123',
  'sunshine',
  'princess',
  'abcd1234',
];

describe('authenticated session routes', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let raw: Redis;
  let store: SessionStore;

  let forcedId = '';
  let plainId = '';
  let changingId = '';
  const issuedTokens: string[] = [];

  const sessionKey = (token: string): string => `sess:${token}`;

  const seedSession = async (
    employeeId: string,
    mustChangePassword: boolean,
    role: 'employee' | 'hrd' = 'employee',
  ): Promise<string> => {
    const token = randomBytes(32).toString('base64url');
    await store.create(token, { employeeId, role, mustChangePassword });
    issuedTokens.push(token);
    return token;
  };

  /** Restores the forced-change flag so a boundary case starts from scratch. */
  const rearmForcedFlag = async (): Promise<string> => {
    await prisma.employee.update({
      where: { id: forcedId },
      data: { mustChangePassword: true },
    });
    return seedSession(forcedId, true);
  };

  const postLogout = (token?: string) => {
    const call = request(app.getHttpServer()).post(LOGOUT_URL);
    return token === undefined ? call : call.set('Cookie', `sid=${token}`);
  };

  const postSetFirst = (
    token: string,
    payload: Record<string, unknown>,
    acceptLanguage?: string,
  ) => {
    const call = request(app.getHttpServer())
      .post(SET_FIRST_URL)
      .set('Cookie', `sid=${token}`)
      .send(payload);
    return acceptLanguage === undefined
      ? call
      : call.set('Accept-Language', acceptLanguage);
  };

  const upsertAccount = async (
    email: string,
    mustChangePassword: boolean,
    password: string,
  ): Promise<string> => {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const row = await prisma.employee.upsert({
      where: { email },
      update: { passwordHash, mustChangePassword },
      create: {
        email,
        name: `Session Spec ${email}`,
        position: 'QA Engineer',
        phone: '+62-811-0000-0888',
        passwordHash,
        role: 'employee',
        status: 'active',
        mustChangePassword,
      },
    });
    return row.id;
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    raw = new Redis(config.redisUrl);
    store = new SessionStore({ redisUrl: config.redisUrl });

    forcedId = await upsertAccount(FORCED_EMAIL, true, FORCED_PASSWORD);
    plainId = await upsertAccount(PLAIN_EMAIL, false, 'Copper-Ledger-2048');
    changingId = await upsertAccount(CHANGING_EMAIL, true, FORCED_PASSWORD);

    app = await createApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    const employeeIds = [forcedId, plainId, changingId].filter(
      (id) => id !== '',
    );
    if (employeeIds.length > 0) {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: { in: employeeIds } },
      });
      await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }
    if (issuedTokens.length > 0) {
      await raw.del(...issuedTokens.map(sessionKey));
    }
    await store.quit();
    await prisma.$disconnect();
    raw.disconnect();
  });

  describe('POST /auth/logout', () => {
    it('answers 401 AUTH_REQUIRED when no session cookie is sent', async () => {
      const response = await postLogout();

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
        message: ERROR_MESSAGES.id.AUTH_REQUIRED,
      });
    });

    it('answers 401 AUTH_REQUIRED for a token that is not in the store', async () => {
      const response = await postLogout(randomBytes(32).toString('base64url'));

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    it('deletes the session, clears the cookie and answers 204', async () => {
      const token = await seedSession(plainId, false);
      expect(await raw.exists(sessionKey(token))).toBe(1);

      const response = await postLogout(token);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect(await raw.exists(sessionKey(token))).toBe(0);

      const header: unknown = response.headers['set-cookie'];
      const cleared = Array.isArray(header)
        ? header.filter((line): line is string => typeof line === 'string')
        : typeof header === 'string'
          ? [header]
          : [];
      const sidClear = cleared.find((line) => line.startsWith('sid='));
      expect(sidClear).toBeDefined();
      expect(sidClear).toContain('sid=;');
      expect(sidClear).toContain('Path=/');
      expect(sidClear).toContain('Expires=Thu, 01 Jan 1970');
      expect(sidClear).toContain('HttpOnly');

      // The token is gone, so reusing it is no longer authenticated.
      const replay = await postLogout(token);
      expect(replay.status).toBe(401);
      expect(replay.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    });
  });

  describe('POST /auth/password/set-first', () => {
    it('answers 401 AUTH_REQUIRED when no session cookie is sent', async () => {
      const response = await request(app.getHttpServer())
        .post(SET_FIRST_URL)
        .send({
          newPassword: FORCED_PASSWORD,
          confirmPassword: FORCED_PASSWORD,
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
        message: ERROR_MESSAGES.id.AUTH_REQUIRED,
      });
    });

    it('answers 403 FORBIDDEN when the session has no forced password change', async () => {
      const token = await seedSession(plainId, false);

      const response = await postSetFirst(token, {
        newPassword: FORCED_PASSWORD,
        confirmPassword: FORCED_PASSWORD,
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: ERROR_MESSAGES.id.FORBIDDEN,
      });
    });

    it('refuses a password shorter than eight characters', async () => {
      const token = await rearmForcedFlag();

      const response = await postSetFirst(token, {
        newPassword: 'Q7!wL2p',
        confirmPassword: 'Q7!wL2p',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
      expect(response.body.message).not.toBe(ERROR_MESSAGES.id.PASSWORD_WEAK);
    });

    it('refuses a password longer than 128 characters', async () => {
      const token = await rearmForcedFlag();
      const tooLong = `A1!${'x'.repeat(126)}`;
      expect(tooLong).toHaveLength(129);

      const response = await postSetFirst(token, {
        newPassword: tooLong,
        confirmPassword: tooLong,
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
    });

    it('refuses a password containing a control character', async () => {
      const token = await rearmForcedFlag();
      const withControl = `Valid-Pass${String.fromCharCode(7)}Word-99`;

      const response = await postSetFirst(token, {
        newPassword: withControl,
        confirmPassword: withControl,
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
    });

    it('refuses well-known breached passwords, ignoring letter case', async () => {
      for (const breached of BREACHED_SAMPLES) {
        const token = await rearmForcedFlag();

        const response = await postSetFirst(token, {
          newPassword: breached,
          confirmPassword: breached,
        });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          statusCode: 400,
          code: 'PASSWORD_WEAK',
        });
      }
    });

    it('answers a confirmation mismatch with PASSWORD_WEAK and its own message', async () => {
      const token = await rearmForcedFlag();

      const response = await postSetFirst(token, {
        newPassword: 'Sunflower-Vault-3391',
        confirmPassword: 'Sunflower-Vault-3392',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
      expect(response.body.message).toBe('Konfirmasi kata sandi tidak cocok.');
      expect(response.body.message).not.toBe(ERROR_MESSAGES.id.PASSWORD_WEAK);
    });

    it('localizes the rejection message through Accept-Language', async () => {
      const token = await rearmForcedFlag();

      const response = await postSetFirst(
        token,
        { newPassword: 'password', confirmPassword: 'password' },
        'en',
      );

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
      expect(response.body.message).toBe(
        'This password appears in a list of breached passwords and cannot be used.',
      );
      expect(response.body.message).not.toBe(ERROR_MESSAGES.en.PASSWORD_WEAK);
    });

    it('accepts passwords at the eight, sixty-four and 128 character bounds', async () => {
      const accepted = [
        'Q7!wL2pX',
        `Z9#${'z'.repeat(61)}`,
        `B4$${'y'.repeat(125)}`,
      ];
      expect(accepted.map((value) => value.length)).toEqual([8, 64, 128]);

      for (const newPassword of accepted) {
        const token = await rearmForcedFlag();

        const response = await postSetFirst(token, {
          newPassword,
          confirmPassword: newPassword,
        });

        expect(response.status).toBe(200);
      }
    });

    it('saves the hash, clears the flag, writes a redacted event and revokes the other sessions', async () => {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: changingId },
      });
      await prisma.employee.update({
        where: { id: changingId },
        data: { mustChangePassword: true },
      });

      const currentToken = await seedSession(changingId, true);
      const otherTokenOne = await seedSession(changingId, true);
      const otherTokenTwo = await seedSession(changingId, true, 'hrd');
      const bystanderToken = await seedSession(forcedId, true);
      const newPassword = 'Cobalt-Lantern-7305';

      const response = await postSetFirst(currentToken, {
        newPassword,
        confirmPassword: newPassword,
      });
      expect(response.status).toBe(200);

      const events = await prisma.profileChangeEvent.findMany({
        where: { employeeId: changingId },
      });
      expect(events).toHaveLength(1);
      const event = events[0];
      expect(event.changedFields).toEqual(['password']);
      expect(event.actorId).toBe(changingId);
      expect(event.actorRole).toBe('employee');
      expect(event.beforeValues).toEqual({ password: '[redacted]' });
      expect(event.afterValues).toEqual({ password: '[redacted]' });
      expect(event.publishedAt).toBeNull();

      // Neither the plaintext nor the stored hash may leak into the outbox.
      const serialized = JSON.stringify(event);
      expect(serialized).not.toContain(newPassword);
      expect(serialized).not.toContain('$argon2');

      const employee = await prisma.employee.findUnique({
        where: { id: changingId },
      });
      expect(employee).not.toBeNull();
      expect(employee?.mustChangePassword).toBe(false);
      expect(employee?.passwordHash.startsWith('$argon2id$')).toBe(true);
      await expect(
        argon2.verify(String(employee?.passwordHash), newPassword),
      ).resolves.toBe(true);
      await expect(
        argon2.verify(String(employee?.passwordHash), FORCED_PASSWORD),
      ).resolves.toBe(false);

      const currentPayload = JSON.parse(
        String(await raw.get(sessionKey(currentToken))),
      ) as Record<string, unknown>;
      expect(currentPayload.mustChangePassword).toBe(false);
      expect(currentPayload.employeeId).toBe(changingId);

      expect(await raw.exists(sessionKey(otherTokenOne))).toBe(0);
      expect(await raw.exists(sessionKey(otherTokenTwo))).toBe(0);
      expect(await raw.exists(sessionKey(bystanderToken))).toBe(1);
      expect(await raw.exists(sessionKey(currentToken))).toBe(1);

      // The rewritten flag reaches the next request: the route now refuses.
      const replay = await postSetFirst(currentToken, {
        newPassword,
        confirmPassword: newPassword,
      });
      expect(replay.status).toBe(403);
      expect(replay.body).toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('ships an offline breach list with several hundred lowercase entries', () => {
      const listPath = join(
        __dirname,
        '..',
        'src',
        'auth',
        'password-denylist',
        'breached-passwords.txt',
      );
      const entries = readFileSync(listPath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');

      expect(entries.length).toBeGreaterThanOrEqual(300);
      expect(new Set(entries).size).toBe(entries.length);
      for (const entry of entries) {
        expect(entry).toBe(entry.toLowerCase());
      }
      for (const sample of BREACHED_SAMPLES) {
        expect(entries).toContain(sample.toLowerCase());
      }
    });
  });
});
