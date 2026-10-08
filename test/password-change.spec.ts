import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { PASSWORD_HASH_OPTIONS } from '../src/auth/password.policy';
import { SessionStore } from '../src/auth/session.store';
import { PERMISSIONS_KEY } from '../src/common/auth/session.decorators';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { SessionGuard } from '../src/common/auth/session.guard';
import { config } from '../src/config';
import { PrismaClient } from '../src/generated/prisma';
import { PasswordChangeController } from '../src/profile/password.controller';

/**
 * Self-service password change: the current password is required, the new one
 * goes through the shared strength rule, the write and its outbox event land
 * together, and the change keeps this session while ending every other session
 * of the same person.
 *
 * All accounts, sessions and outbox rows are created by this suite and
 * removed afterwards; assertions only ever look at rows carrying this suite's
 * employee ids.
 */

const CHANGE_URL = '/api/identity/auth/password/change';
const PROFILE_URL = '/api/identity/profile';
const EMAIL = 'password-change-spec@company.com';
const BYSTANDER_EMAIL = 'password-change-bystander@company.com';

const CURRENT_PASSWORD = 'Willow-Kestrel-1908';
const NEW_PASSWORD = 'Harbour-Lantern-5521';

/** Passwords that clear every other rule yet must still be refused. */
const BREACHED_SAMPLES = ['password', '12345678', 'qwerty123', 'welcome1'];

const cookieFor = (token: string): string => `sid=${token}`;

describe('POST /auth/password/change', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let store: SessionStore;
  let raw: Redis;
  let employeeId = '';
  let bystanderId = '';
  const issuedTokens: string[] = [];

  const seedSession = async (
    targetEmployeeId: string,
    role: 'employee' | 'hrd' = 'employee',
  ): Promise<string> => {
    const token = randomBytes(32).toString('base64url');
    await store.create(token, {
      employeeId: targetEmployeeId,
      role,
      mustChangePassword: false,
    });
    issuedTokens.push(token);
    return token;
  };

  const eventsFor = (targetEmployeeId: string) =>
    prisma.profileChangeEvent.findMany({
      where: { employeeId: targetEmployeeId },
    });

  const postChange = (
    token: string | undefined,
    payload: Record<string, unknown>,
  ) => {
    const call = request(app.getHttpServer()).post(CHANGE_URL).send(payload);
    return token === undefined ? call : call.set('Cookie', cookieFor(token));
  };

  const getProfile = (token: string) =>
    request(app.getHttpServer())
      .get(PROFILE_URL)
      .set('Cookie', cookieFor(token));

  const upsertAccount = async (
    email: string,
    password: string,
    mustChangePassword: boolean,
  ): Promise<string> => {
    const passwordHash = await argon2.hash(password, PASSWORD_HASH_OPTIONS);
    const row = await prisma.employee.upsert({
      where: { email },
      update: { passwordHash, mustChangePassword },
      create: {
        email,
        name: `Password Change Spec ${email}`,
        position: 'QA Engineer',
        phone: '+62-811-0000-0606',
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

    employeeId = await upsertAccount(EMAIL, CURRENT_PASSWORD, true);
    bystanderId = await upsertAccount(BYSTANDER_EMAIL, CURRENT_PASSWORD, false);

    app = await createApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    const employeeIds = [employeeId, bystanderId].filter((id) => id !== '');
    if (employeeIds.length > 0) {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: { in: employeeIds } },
      });
      await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }
    if (issuedTokens.length > 0) {
      await raw.del(...issuedTokens.map((token) => `sess:${token}`));
    }
    await store.quit();
    await prisma.$disconnect();
    raw.disconnect();
  });

  beforeEach(async () => {
    await prisma.profileChangeEvent.deleteMany({ where: { employeeId } });
    // Restores the starting password so every case begins from the same row.
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        mustChangePassword: true,
        passwordHash: await argon2.hash(CURRENT_PASSWORD, PASSWORD_HASH_OPTIONS),
      },
    });
  });

  describe('route protection', () => {
    it('guards the route with the session guard and password:change_own', () => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          PasswordChangeController.prototype.change,
          PasswordChangeController,
        ]),
      ).toEqual([SessionGuard]);
      expect(
        reflector.get(
          PERMISSIONS_KEY,
          PasswordChangeController.prototype.change,
        ),
      ).toEqual(['password:change_own']);
    });

    it('answers 401 AUTH_REQUIRED without a session cookie', async () => {
      const response = await postChange(undefined, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
        message: ERROR_MESSAGES.id.AUTH_REQUIRED,
      });
      expect(await eventsFor(employeeId)).toHaveLength(0);
    });
  });

  describe('refusals', () => {
    it('answers a wrong current password with 401 AUTH_INVALID and changes nothing', async () => {
      const token = await seedSession(employeeId);
      const before = (
        await prisma.employee.findUnique({ where: { id: employeeId } })
      )?.passwordHash;

      const response = await postChange(token, {
        currentPassword: 'Not-The-Right-One-77',
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        code: 'AUTH_INVALID',
        message: ERROR_MESSAGES.id.AUTH_INVALID,
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: employeeId } }))
          ?.passwordHash,
      ).toBe(before);
      expect(await eventsFor(employeeId)).toHaveLength(0);
    });

    it('answers a missing current password with the same 401 body', async () => {
      const token = await seedSession(employeeId);

      const response = await postChange(token, { newPassword: NEW_PASSWORD });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_INVALID',
      });
      expect(await eventsFor(employeeId)).toHaveLength(0);
    });

    it('checks the current password before the strength rule', async () => {
      const token = await seedSession(employeeId);

      const response = await postChange(token, {
        currentPassword: 'Still-Wrong-4410',
        newPassword: 'short',
      });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_INVALID',
      });
    });

    it('refuses a new password shorter than eight characters with PASSWORD_WEAK', async () => {
      const token = await seedSession(employeeId);

      const response = await postChange(token, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: 'Q7!wL2p',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
      expect(response.body.message).not.toBe(ERROR_MESSAGES.id.PASSWORD_WEAK);
      expect(await eventsFor(employeeId)).toHaveLength(0);
    });

    it('refuses a missing or non-string new password with PASSWORD_WEAK', async () => {
      const token = await seedSession(employeeId);

      const missing = await postChange(token, {
        currentPassword: CURRENT_PASSWORD,
      });
      expect(missing.status).toBe(400);
      expect(missing.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });

      const nonString = await postChange(token, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: 12_345_678,
      });
      expect(nonString.status).toBe(400);
      expect(nonString.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_WEAK',
      });
      expect(await eventsFor(employeeId)).toHaveLength(0);
    });

    it('refuses well-known breached new passwords', async () => {
      for (const breached of BREACHED_SAMPLES) {
        const token = await seedSession(employeeId);

        const response = await postChange(token, {
          currentPassword: CURRENT_PASSWORD,
          newPassword: breached,
        });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          statusCode: 400,
          code: 'PASSWORD_WEAK',
        });
      }
      expect(await eventsFor(employeeId)).toHaveLength(0);
    });

    it('localizes the weak-password message through Accept-Language', async () => {
      const token = await seedSession(employeeId);

      const response = await request(app.getHttpServer())
        .post(CHANGE_URL)
        .set('Cookie', cookieFor(token))
        .set('Accept-Language', 'en')
        .send({
          currentPassword: CURRENT_PASSWORD,
          newPassword: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Password must be between 8 and 128 characters long.',
      );
    });
  });

  describe('successful change', () => {
    it('stores the new hash, writes one redacted event and swaps the sessions', async () => {
      const currentToken = await seedSession(employeeId);
      const otherTokenOne = await seedSession(employeeId);
      const otherTokenTwo = await seedSession(employeeId);
      const bystanderToken = await seedSession(bystanderId);

      const response = await postChange(currentToken, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(response.status).toBe(200);

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(employee).not.toBeNull();
      expect(employee?.passwordHash.startsWith('$argon2id$')).toBe(true);
      await expect(
        argon2.verify(String(employee?.passwordHash), NEW_PASSWORD),
      ).resolves.toBe(true);
      await expect(
        argon2.verify(String(employee?.passwordHash), CURRENT_PASSWORD),
      ).resolves.toBe(false);
      expect(employee?.mustChangePassword).toBe(false);

      const events = await eventsFor(employeeId);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        employeeId,
        actorId: employeeId,
        actorRole: 'employee',
        changedFields: ['password'],
        beforeValues: { password: '[redacted]' },
        afterValues: { password: '[redacted]' },
        publishedAt: null,
      });
      const serialized = JSON.stringify(events[0]);
      expect(serialized).not.toContain(NEW_PASSWORD);
      expect(serialized).not.toContain(CURRENT_PASSWORD);
      expect(serialized).not.toContain('$argon2');

      // This session keeps working, every other session of the same person is gone.
      expect((await getProfile(currentToken)).status).toBe(200);
      expect((await getProfile(otherTokenOne)).status).toBe(401);
      expect((await getProfile(otherTokenTwo)).status).toBe(401);
      expect((await getProfile(bystanderToken)).status).toBe(200);

      const currentPayload = JSON.parse(
        String(await raw.get(`sess:${currentToken}`)),
      ) as Record<string, unknown>;
      expect(currentPayload.mustChangePassword).toBe(false);
      expect(currentPayload.employeeId).toBe(employeeId);
    });

    it('refuses the previous password as the current one on the next change', async () => {
      const currentToken = await seedSession(employeeId);

      const first = await postChange(currentToken, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      });
      expect(first.status).toBe(200);

      const second = await postChange(currentToken, {
        currentPassword: CURRENT_PASSWORD,
        newPassword: 'Cobalt-Meadow-6402',
      });

      expect(second.status).toBe(401);
      expect(second.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_INVALID',
      });
      // Exactly one event for the one change that actually succeeded.
      const events = await eventsFor(employeeId);
      expect(events).toHaveLength(1);
      expect(events[0].changedFields).toEqual(['password']);
    });
  });
});
