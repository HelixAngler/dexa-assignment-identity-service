import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { SessionStore } from '../src/auth/session.store';
import { PERMISSIONS_KEY } from '../src/common/auth/session.decorators';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { SessionGuard } from '../src/common/auth/session.guard';
import { config } from '../src/config';
import { PrismaClient } from '../src/generated/prisma';
import { ProfileController } from '../src/profile/profile.controller';

/**
 * The self-service profile endpoints: reading the five profile fields, and
 * writing only the phone number.
 *
 * Every assertion is scoped to the two accounts this suite creates and to the
 * outbox rows carrying their ids, so parallel suites sharing the database
 * cannot influence a result.
 */

const PROFILE_URL = '/api/identity/profile';
const EMAIL = 'profile-controller-spec@company.com';

/** Phone numbers accepted here: digits, spaces, `+ - . ( )` and at least 8 digits. */
const ACCEPTED_PHONE = '+62 (021) 5555-1234';
const SEVEN_DIGIT_PHONE = '0812-345';

const cookieFor = (token: string): string => `sid=${token}`;

describe('GET/PATCH /profile', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let store: SessionStore;
  let raw: Redis;
  let employeeId = '';
  const issuedTokens: string[] = [];

  const seedSession = async (role: 'employee' | 'hrd' = 'employee') => {
    const token = randomBytes(32).toString('base64url');
    await store.create(token, {
      employeeId,
      role,
      mustChangePassword: false,
    });
    issuedTokens.push(token);
    return token;
  };

  const eventsForSelf = () =>
    prisma.profileChangeEvent.findMany({ where: { employeeId } });

  const getProfile = (token?: string) => {
    const call = request(app.getHttpServer()).get(PROFILE_URL);
    return token === undefined ? call : call.set('Cookie', cookieFor(token));
  };

  const patchProfile = (
    token: string | undefined,
    payload: Record<string, unknown>,
  ) => {
    const call = request(app.getHttpServer()).patch(PROFILE_URL).send(payload);
    return token === undefined ? call : call.set('Cookie', cookieFor(token));
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    raw = new Redis(config.redisUrl);
    store = new SessionStore({ redisUrl: config.redisUrl });

    const row = await prisma.employee.upsert({
      where: { email: EMAIL },
      update: { phone: '+62-811-0000-5151', photoObjectKey: null },
      create: {
        email: EMAIL,
        name: 'Profile Controller Spec',
        position: 'QA Engineer',
        phone: '+62-811-0000-5151',
        photoObjectKey: null,
        passwordHash: '$argon2id$v=19$m=19456,p=1,t$2$not-used-by-this-suite',
        role: 'employee',
        status: 'active',
        mustChangePassword: false,
      },
    });
    employeeId = row.id;

    app = await createApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (employeeId !== '') {
      await prisma.profileChangeEvent.deleteMany({ where: { employeeId } });
      await prisma.employee.deleteMany({ where: { id: employeeId } });
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
    await prisma.employee.update({
      where: { id: employeeId },
      data: { phone: '+62-811-0000-5151', photoObjectKey: null },
    });
  });

  describe('route protection', () => {
    it('guards the read with the session guard and profile:read_own', () => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          ProfileController.prototype.getProfile,
          ProfileController,
        ]),
      ).toEqual([SessionGuard]);
      expect(
        reflector.get(PERMISSIONS_KEY, ProfileController.prototype.getProfile),
      ).toEqual(['profile:read_own']);
    });

    it('guards the write with the session guard and profile:update_own', () => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          ProfileController.prototype.updateProfile,
          ProfileController,
        ]),
      ).toEqual([SessionGuard]);
      expect(
        reflector.get(PERMISSIONS_KEY, ProfileController.prototype.updateProfile),
      ).toEqual(['profile:update_own']);
    });
  });

  describe('GET /profile', () => {
    it('answers 401 AUTH_REQUIRED without a session cookie', async () => {
      const response = await getProfile();

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
        message: ERROR_MESSAGES.id.AUTH_REQUIRED,
      });
    });

    it('returns the profile fields with photoUrl null while no photo exists', async () => {
      const token = await seedSession();

      const response = await getProfile(token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        name: 'Profile Controller Spec',
        email: EMAIL,
        position: 'QA Engineer',
        phone: '+62-811-0000-5151',
        photoUrl: null,
        role: 'employee',
      });
      expect(Object.keys(response.body).sort()).toEqual([
        'email',
        'name',
        'phone',
        'photoUrl',
        'position',
        'role',
      ]);
    });

    it('takes the role from the session payload rather than the stored row', async () => {
      // The account itself is an employee row; only the session claims HRD,
      // which is what the response has to report so a fresh browser tab can
      // pick its console from the cookie alone.
      const token = await seedSession('hrd');

      const response = await getProfile(token);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('hrd');
      expect(
        (await prisma.employee.findUnique({ where: { id: employeeId } }))?.role,
      ).toBe('employee');
    });

    it('points photoUrl at the authenticated photo route once a photo is stored', async () => {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { photoObjectKey: 'employees/whatever/portrait.jpg' },
      });
      const token = await seedSession();

      const response = await getProfile(token);

      expect(response.status).toBe(200);
      expect(response.body.photoUrl).toBe('/api/identity/profile/photo');
    });
  });

  describe('PATCH /profile', () => {
    it('answers 401 AUTH_REQUIRED without a session cookie', async () => {
      const response = await patchProfile(undefined, { phone: ACCEPTED_PHONE });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
      expect(await eventsForSelf()).toHaveLength(0);
    });

    it('stores a valid phone number and emits exactly one phone event', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, { phone: ACCEPTED_PHONE });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        name: 'Profile Controller Spec',
        email: EMAIL,
        position: 'QA Engineer',
        phone: ACCEPTED_PHONE,
        photoUrl: null,
        role: 'employee',
      });

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(employee?.phone).toBe(ACCEPTED_PHONE);

      const events = await eventsForSelf();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        employeeId,
        actorId: employeeId,
        actorRole: 'employee',
        changedFields: ['phone'],
        beforeValues: { phone: '+62-811-0000-5151' },
        afterValues: { phone: ACCEPTED_PHONE },
        publishedAt: null,
      });
    });

    it('accepts digits, spaces and + - . ( ) and ignores every other key in the body', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, {
        phone: '0812.3456.7890 (12)',
        name: 'Attempted Rename',
        email: 'attacker@company.com',
        position: 'Chief Officer',
        photoUrl: '/somewhere/else',
      });

      expect(response.status).toBe(200);
      expect(response.body.phone).toBe('0812.3456.7890 (12)');

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(employee).toMatchObject({
        name: 'Profile Controller Spec',
        email: EMAIL,
        position: 'QA Engineer',
        photoObjectKey: null,
      });
      expect(await eventsForSelf()).toHaveLength(1);
    });

    it('rejects a phone number carrying illegal characters with PHONE_INVALID', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, {
        phone: 'call-me-maybe',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'PHONE_INVALID',
        message: ERROR_MESSAGES.id.PHONE_INVALID,
      });
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(employee?.phone).toBe('+62-811-0000-5151');
      expect(await eventsForSelf()).toHaveLength(0);
    });

    it('rejects a phone number with fewer than eight digits with PHONE_INVALID', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, { phone: SEVEN_DIGIT_PHONE });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PHONE_INVALID',
      });
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(employee?.phone).toBe('+62-811-0000-5151');
      expect(await eventsForSelf()).toHaveLength(0);
    });

    it('rejects a body without a phone field with PHONE_INVALID', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, { name: 'Only A Name' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PHONE_INVALID',
      });
      expect(await eventsForSelf()).toHaveLength(0);
    });

    it('rejects a non-string phone with PHONE_INVALID', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, { phone: 62_811_0000_515 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'PHONE_INVALID',
      });
      expect(await eventsForSelf()).toHaveLength(0);
    });

    it('accepts an eight-digit number with no separators', async () => {
      const token = await seedSession();

      const response = await patchProfile(token, { phone: '08123456' });

      expect(response.status).toBe(200);
      expect(response.body.phone).toBe('08123456');
      expect(await eventsForSelf()).toHaveLength(1);
    });
  });
});
