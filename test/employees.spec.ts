import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import argon2 from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { findPasswordProblem } from '../src/auth/password.policy';
import { SessionStore } from '../src/auth/session.store';
import { PERMISSIONS_KEY } from '../src/common/auth/session.decorators';
import { SessionGuard } from '../src/common/auth/session.guard';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { config } from '../src/config';
import { EmployeesController } from '../src/employees/employees.controller';
import { PrismaClient } from '../src/generated/prisma';

/**
 * Employee management performed by an HRD session: creating an account with a
 * one-time temporary password, listing the directory, editing fields, issuing
 * a password reset and flipping an account between active and deactivated.
 *
 * Every account this suite touches is created here on a unique address and
 * removed again afterwards, and every assertion about "how many rows exist"
 * is scoped to a single address, so the shared development database stays
 * safe when other suites run beside this one.
 *
 * The attendance service's close-open notification is observed through a local
 * HTTP server this suite starts itself: that proves the exact path, header and
 * body, proves a failing answer is retried, and proves an unreachable
 * attendance service never fails the deactivation itself.
 */

const EMPLOYEES_URL = '/api/identity/employees';
const LOGIN_URL = '/api/identity/auth/login';

/** Path the attendance service exposes for the deactivation notification. */
const CLOSE_OPEN_PATH = '/api/attendance/internal/sessions/close-open';

let emailSequence = 0;

/** A fresh company address no other row and no other run can carry. */
const uniqueEmail = (label: string): string =>
  `${label}-${Date.now().toString(36)}-${(emailSequence += 1)}-${randomUUID().slice(0, 8)}@company.test`;

const sessionKey = (token: string): string => `sess:${token}`;
const employeeIndexKey = (employeeId: string): string => `emp-sess:${employeeId}`;
const lockoutKey = (email: string): string =>
  `lockout:${email.trim().toLowerCase()}`;

/** Normalizes the shapes a Set-Cookie value arrives in. */
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

/** Pulls the raw session token out of the `sid` cookie a sign-in set. */
function sidFrom(headers: unknown): string {
  const cookie = setCookieList(headers).find((line) =>
    line.startsWith('sid='),
  );
  if (!cookie) {
    throw new Error('sign-in response did not set the sid cookie');
  }
  return cookie.slice('sid='.length).split(';')[0] ?? '';
}

/** One request the attendance service received from the deactivation flow. */
interface HookCall {
  method: string;
  path: string;
  tokenHeader: string | undefined;
  rawBody: string;
  /** Account status read the moment the notification arrived. */
  dbStatus: string | null;
  /** Session keys of the target employee still alive on arrival. */
  liveTargetSessions: number;
}

interface HookServer {
  url: string;
  calls: HookCall[];
  close: () => Promise<void>;
}

/**
 * Local stand-in for the attendance service: records every request (plus the
 * database and Redis state at the moment it arrived) and answers with a
 * status chosen per attempt, so a suite can provoke a retried failure, a
 * permanently failing hook, or a clean first-time success.
 */
async function startHookServer(options: {
  statusForAttempt: (attempt: number) => number;
  observe?: () => Promise<{
    dbStatus: string | null;
    liveTargetSessions: number;
  }>;
}): Promise<HookServer> {
  const calls: HookCall[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      void (async () => {
        const call: HookCall = {
          method: req.method ?? '',
          path: req.url ?? '',
          tokenHeader:
            typeof req.headers['x-internal-token'] === 'string'
              ? req.headers['x-internal-token']
              : undefined,
          rawBody: Buffer.concat(chunks).toString('utf8'),
          dbStatus: null,
          liveTargetSessions: -1,
        };
        calls.push(call);
        try {
          if (options.observe) {
            const observed = await options.observe();
            call.dbStatus = observed.dbStatus;
            call.liveTargetSessions = observed.liveTargetSessions;
          }
          const status = options.statusForAttempt(calls.length);
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ closed: 1 }));
        } catch {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ closed: 0 }));
        }
      })();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/** A loopback URL whose port nothing listens on, so a call is refused. */
async function refusedUrl(): Promise<string> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}

interface ProvisionedEmployee {
  id: string;
  email: string;
  temporaryPassword: string;
}

describe('employee management (HRD)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let raw: Redis;
  let store: SessionStore;
  let hrdToken = '';
  let employeeRoleToken = '';
  let hrdEmployeeId = '';
  let employeeRoleFixtureId = '';
  let defaultHook: HookServer;
  let originalAttendanceUrl: string | undefined;

  const createdEmployeeIds: string[] = [];
  const createdEmails: string[] = [];
  const issuedTokens: string[] = [];
  const attendanceRowIds: string[] = [];

  const call = (method: 'get' | 'post' | 'patch', path: string, token?: string) => {
    const req = request(app.getHttpServer())[method](path);
    return token === undefined ? req : req.set('Cookie', `sid=${token}`);
  };

  const postJson = (
    method: 'post' | 'patch',
    path: string,
    token: string | undefined,
    body: Record<string, unknown>,
  ) => call(method, path, token).send(body);

  const signIn = (email: string, password: string) =>
    call('post', LOGIN_URL).send({ email, password });

  const seedSession = async (
    employeeId: string,
    role: 'employee' | 'hrd',
  ): Promise<string> => {
    const token = randomBytes(32).toString('base64url');
    await store.create(token, {
      employeeId,
      role,
      mustChangePassword: false,
    });
    issuedTokens.push(token);
    return token;
  };

  /** Creates an employee through the API on a fresh address and tracks it. */
  const provision = async (
    label: string,
    overrides: Record<string, unknown> = {},
  ): Promise<ProvisionedEmployee> => {
    const email = uniqueEmail(label);
    createdEmails.push(email);
    const response = await postJson('post', EMPLOYEES_URL, hrdToken, {
      name: 'Spec Person',
      position: 'QA Engineer',
      phone: '+62-811-0000-0101',
      ...overrides,
      email,
    });
    if (response.status !== 201) {
      throw new Error(
        `provisioning failed with ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    const body = response.body as {
      id: string;
      temporaryPassword: string;
      mustChangePassword: boolean;
    };
    createdEmployeeIds.push(body.id);
    return { id: body.id, email, temporaryPassword: body.temporaryPassword };
  };

  /** Runs one deactivation call against a chosen notification endpoint. */
  const deactivate = async (employeeId: string, url: string) => {
    process.env.ATTENDANCE_INTERNAL_URL = url;
    try {
      return await postJson('patch', `${EMPLOYEES_URL}/${employeeId}/status`, hrdToken, {
        status: 'deactivated',
      });
    } finally {
      process.env.ATTENDANCE_INTERNAL_URL = defaultHook.url;
    }
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    raw = new Redis(config.redisUrl);
    store = new SessionStore({ redisUrl: config.redisUrl });

    const ownerEmail = uniqueEmail('hrd-owner');
    const owner = await prisma.employee.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        email: ownerEmail,
        name: 'HRD Owner (employees suite)',
        position: 'HRD Manager',
        phone: '+62-811-0000-9001',
        role: 'hrd',
        status: 'active',
        passwordHash: 'unused-hash',
        mustChangePassword: false,
      },
    });
    hrdEmployeeId = owner.id;
    employeeRoleFixtureId = randomUUID();
    hrdToken = await seedSession(hrdEmployeeId, 'hrd');
    employeeRoleToken = await seedSession(employeeRoleFixtureId, 'employee');

    defaultHook = await startHookServer({ statusForAttempt: () => 200 });
    originalAttendanceUrl = process.env.ATTENDANCE_INTERNAL_URL;
    process.env.ATTENDANCE_INTERNAL_URL = defaultHook.url;

    app = await createApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (originalAttendanceUrl === undefined) {
      delete process.env.ATTENDANCE_INTERNAL_URL;
    } else {
      process.env.ATTENDANCE_INTERNAL_URL = originalAttendanceUrl;
    }
    if (defaultHook) {
      await defaultHook.close();
    }

    const redisKeys = [
      ...issuedTokens.map(sessionKey),
      employeeIndexKey(hrdEmployeeId),
      employeeIndexKey(employeeRoleFixtureId),
      ...createdEmployeeIds.map(employeeIndexKey),
      ...createdEmails.map(lockoutKey),
    ];
    if (redisKeys.length > 0) {
      await raw.del(...redisKeys);
    }
    await store.quit();
    raw.disconnect();

    if (attendanceRowIds.length > 0) {
      await prisma.attendanceSession.deleteMany({
        where: { id: { in: attendanceRowIds } },
      });
    }
    if (createdEmployeeIds.length > 0) {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: { in: createdEmployeeIds } },
      });
      await prisma.employee.deleteMany({
        where: { id: { in: [...createdEmployeeIds, hrdEmployeeId] } },
      });
    } else {
      await prisma.employee.deleteMany({ where: { id: hrdEmployeeId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /employees', () => {
    it('answers with the id, a one-time temporary password and the forced-change flag', async () => {
      const email = uniqueEmail('create');
      createdEmails.push(email);

      const response = await postJson('post', EMPLOYEES_URL, hrdToken, {
        name: 'Nadia Prameswari',
        email,
        position: 'Backend Engineer',
        phone: '+62-812-0000-0202',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        temporaryPassword: expect.any(String),
        mustChangePassword: true,
      });
      createdEmployeeIds.push(response.body.id);

      const temporaryPassword = response.body.temporaryPassword as string;
      expect(temporaryPassword.length).toBeGreaterThanOrEqual(8);
      // The one-time password satisfies the very rule every password path uses.
      expect(findPasswordProblem(temporaryPassword)).toBeNull();

      const row = await prisma.employee.findUnique({ where: { email } });
      expect(row).not.toBeNull();
      if (!row) {
        return;
      }
      expect(row.id).toBe(response.body.id);
      expect(row.role).toBe('employee');
      expect(row.status).toBe('active');
      expect(row.mustChangePassword).toBe(true);
      expect(row.passwordHash.startsWith('$argon2id$v=19$m=19456,p=1,t=2$')).toBe(
        true,
      );
      expect(row.passwordHash).not.toBe(temporaryPassword);
      expect(JSON.stringify(row)).not.toContain(temporaryPassword);
      expect(await argon2.verify(row.passwordHash, temporaryPassword)).toBe(
        true,
      );
      expect(
        await argon2.verify(row.passwordHash, `${temporaryPassword}x`),
      ).toBe(false);

      // Administrative CRUD is not an employee self-service change: no event.
      expect(
        await prisma.profileChangeEvent.count({ where: { employeeId: row.id } }),
      ).toBe(0);
    });

    it('refuses a duplicate address with 409 EMAIL_TAKEN and writes no second row', async () => {
      const email = uniqueEmail('duplicate');
      createdEmails.push(email);
      const payload = {
        name: 'Duplicate Person',
        email,
        position: 'Support',
        phone: '+62-813-0000-0303',
      };

      const first = await postJson('post', EMPLOYEES_URL, hrdToken, payload);
      expect(first.status).toBe(201);
      createdEmployeeIds.push(first.body.id);

      const second = await postJson('post', EMPLOYEES_URL, hrdToken, payload);
      expect(second.status).toBe(409);
      expect(second.body).toEqual({
        statusCode: 409,
        code: 'EMAIL_TAKEN',
        message: ERROR_MESSAGES.id.EMAIL_TAKEN,
      });

      const english = await call('post', EMPLOYEES_URL, hrdToken)
        .set('Accept-Language', 'en')
        .send(payload);
      expect(english.status).toBe(409);
      expect(english.body.message).toBe(ERROR_MESSAGES.en.EMAIL_TAKEN);

      // Same address in another spelling still maps to the one existing row.
      const mixedCase = await postJson('post', EMPLOYEES_URL, hrdToken, {
        ...payload,
        email: email.toUpperCase(),
      });
      expect(mixedCase.status).toBe(409);

      expect(await prisma.employee.count({ where: { email } })).toBe(1);
    });

    it('refuses missing or malformed fields instead of saving a broken row', async () => {
      const missingEmail = uniqueEmail('missing-name');
      const missingName = await postJson('post', EMPLOYEES_URL, hrdToken, {
        email: missingEmail,
        position: 'Support',
        phone: '+62-814-0000-0404',
      });
      expect(missingName.status).toBe(400);
      expect(missingName.body).toEqual({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: ERROR_MESSAGES.id.BAD_REQUEST,
      });

      const badPhoneEmail = uniqueEmail('bad-phone');
      const badPhone = await postJson('post', EMPLOYEES_URL, hrdToken, {
        name: 'Bad Phone',
        email: badPhoneEmail,
        position: 'Support',
        phone: 'not-a-phone',
      });
      expect(badPhone.status).toBe(400);
      expect(badPhone.body).toMatchObject({
        statusCode: 400,
        code: 'PHONE_INVALID',
      });

      expect(await prisma.employee.count({ where: { email: missingEmail } })).toBe(0);
      expect(await prisma.employee.count({ where: { email: badPhoneEmail } })).toBe(0);
    });
  });

  describe('GET /employees', () => {
    it('returns the documented fields, ordered by name and free of secrets', async () => {
      const later = await provision('list-zeta', { name: 'Zeta Directory Name' });
      const earlier = await provision('list-alpha', { name: 'Alpha Directory Name' });

      const response = await call('get', EMPLOYEES_URL, hrdToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const mine = (response.body as Record<string, unknown>[]).filter(
        (row) => row.email === earlier.email || row.email === later.email,
      );
      expect(mine).toHaveLength(2);
      expect(mine.map((row) => row.name)).toEqual([
        'Alpha Directory Name',
        'Zeta Directory Name',
      ]);
      for (const row of mine) {
        expect(Object.keys(row).sort()).toEqual([
          'email',
          'id',
          'name',
          'position',
          'status',
        ]);
        expect(row.status).toBe('active');
        expect(typeof row.position).toBe('string');
      }

      const wholeList = response.body as Record<string, unknown>[];
      expect(
        wholeList.every(
          (row) => !('passwordHash' in row) && !('mustChangePassword' in row),
        ),
      ).toBe(true);
    });
  });

  describe('POST /employees/:id/reset-password', () => {
    it('issues a fresh temporary password, kills live sessions and refuses the old one', async () => {
      const employee = await provision('reset');

      const firstSignIn = await signIn(employee.email, employee.temporaryPassword);
      expect(firstSignIn.status).toBe(200);
      const firstToken = sidFrom(firstSignIn.headers);
      const secondSignIn = await signIn(employee.email, employee.temporaryPassword);
      expect(secondSignIn.status).toBe(200);
      const secondToken = sidFrom(secondSignIn.headers);
      expect(await raw.exists(sessionKey(firstToken))).toBe(1);
      expect(await raw.exists(sessionKey(secondToken))).toBe(1);

      const reset = await call(
        'post',
        `${EMPLOYEES_URL}/${employee.id}/reset-password`,
        hrdToken,
      );
      expect(reset.status).toBe(200);
      expect(reset.body).toEqual({
        temporaryPassword: expect.any(String),
      });
      const nextPassword = reset.body.temporaryPassword as string;
      expect(nextPassword).not.toBe(employee.temporaryPassword);
      expect(findPasswordProblem(nextPassword)).toBeNull();

      // Both devices are signed out the moment the reset lands.
      expect(await raw.exists(sessionKey(firstToken))).toBe(0);
      expect(await raw.exists(sessionKey(secondToken))).toBe(0);

      const stale = await signIn(employee.email, employee.temporaryPassword);
      expect(stale.status).toBe(401);

      const row = await prisma.employee.findUnique({
        where: { id: employee.id },
      });
      expect(row).not.toBeNull();
      if (!row) {
        return;
      }
      expect(row.mustChangePassword).toBe(true);
      expect(await argon2.verify(row.passwordHash, nextPassword)).toBe(true);
      expect(await argon2.verify(row.passwordHash, employee.temporaryPassword)).toBe(
        false,
      );

      const fresh = await signIn(employee.email, nextPassword);
      expect(fresh.status).toBe(200);
      issuedTokens.push(sidFrom(fresh.headers));
    });
  });

  describe('PATCH /employees/:id/status', () => {
    it('deactivates: blocks sign-in, revokes every session and drives the close-open hook', async () => {
      const employee = await provision('deactivate');
      const firstSignIn = await signIn(employee.email, employee.temporaryPassword);
      const firstToken = sidFrom(firstSignIn.headers);
      const secondSignIn = await signIn(employee.email, employee.temporaryPassword);
      const secondToken = sidFrom(secondSignIn.headers);
      expect(firstSignIn.status).toBe(200);
      expect(secondSignIn.status).toBe(200);

      // The first answer fails on purpose; the retry that follows must succeed.
      const hook = await startHookServer({
        statusForAttempt: (attempt) => (attempt === 1 ? 500 : 200),
        observe: async () => ({
          dbStatus:
            (
              await prisma.employee.findUnique({
                where: { id: employee.id },
                select: { status: true },
              })
            )?.status ?? null,
          liveTargetSessions: await raw.exists(
            sessionKey(firstToken),
            sessionKey(secondToken),
          ),
        }),
      });

      try {
        const response = await deactivate(employee.id, hook.url);

        expect(response.status).toBe(200);
        expect(Object.keys(response.body).sort()).toEqual([
          'email',
          'id',
          'name',
          'position',
          'status',
        ]);
        expect(response.body).toMatchObject({
          id: employee.id,
          status: 'deactivated',
        });
      } finally {
        await hook.close();
      }

      // The retry proves the hook is called again with the same request.
      expect(hook.calls).toHaveLength(2);
      for (const observed of hook.calls) {
        expect(observed.method).toBe('POST');
        expect(observed.path).toBe(CLOSE_OPEN_PATH);
        expect(observed.tokenHeader).toBe(process.env.INTERNAL_API_TOKEN);
        expect(observed.tokenHeader).not.toBe('');
        expect(JSON.parse(observed.rawBody)).toEqual({
          employeeId: employee.id,
        });
        // The row was already committed and the sessions already gone.
        expect(observed.dbStatus).toBe('deactivated');
        expect(observed.liveTargetSessions).toBe(0);
      }

      expect(await raw.exists(sessionKey(firstToken))).toBe(0);
      expect(await raw.exists(sessionKey(secondToken))).toBe(0);
      // The HRD caller's own session survives the employee's revocation.
      expect(await raw.exists(sessionKey(hrdToken))).toBe(1);

      const refused = await signIn(employee.email, employee.temporaryPassword);
      expect(refused.status).toBe(401);
      expect(refused.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_INVALID',
      });
    });

    it('gives up after three retries when the hook keeps failing, and still answers 200', async () => {
      const employee = await provision('hook-always-down');
      const hook = await startHookServer({ statusForAttempt: () => 500 });

      try {
        const response = await deactivate(employee.id, hook.url);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ status: 'deactivated' });
      } finally {
        await hook.close();
      }

      // One first attempt plus exactly three retries, then silence.
      expect(hook.calls).toHaveLength(4);

      const row = await prisma.employee.findUnique({
        where: { id: employee.id },
      });
      expect(row?.status).toBe('deactivated');
    });

    it('still deactivates when the attendance service cannot be reached at all', async () => {
      const employee = await provision('hook-refused');
      const signInBefore = await signIn(
        employee.email,
        employee.temporaryPassword,
      );
      expect(signInBefore.status).toBe(200);
      const liveToken = sidFrom(signInBefore.headers);

      const unreachable = await refusedUrl();
      const response = await deactivate(employee.id, unreachable);

      expect(response.status).toBe(200);

      const row = await prisma.employee.findUnique({
        where: { id: employee.id },
      });
      expect(row?.status).toBe('deactivated');
      expect(await raw.exists(sessionKey(liveToken))).toBe(0);

      const refusedSignIn = await signIn(employee.email, employee.temporaryPassword);
      expect(refusedSignIn.status).toBe(401);
    });

    it('reactivates the same row: sign-in works again and history stays attached', async () => {
      const employee = await provision('reactivate');

      const history = await prisma.attendanceSession.create({
        data: {
          employeeId: employee.id,
          workDate: new Date(Date.UTC(2026, 8, 1)),
          clockInAt: new Date(Date.UTC(2026, 8, 1, 1, 0, 0)),
          clockInKey: randomUUID(),
        },
      });
      attendanceRowIds.push(history.id);

      const down = await deactivate(employee.id, defaultHook.url);
      expect(down.status).toBe(200);
      const blocked = await signIn(employee.email, employee.temporaryPassword);
      expect(blocked.status).toBe(401);

      const up = await postJson(
        'patch',
        `${EMPLOYEES_URL}/${employee.id}/status`,
        hrdToken,
        { status: 'active' },
      );
      expect(up.status).toBe(200);
      expect(up.body).toMatchObject({ id: employee.id, status: 'active' });

      const row = await prisma.employee.findUnique({
        where: { email: employee.email },
      });
      expect(row?.id).toBe(employee.id);
      expect(row?.status).toBe('active');
      // The row was updated in place: still exactly one record for the address.
      expect(await prisma.employee.count({ where: { email: employee.email } })).toBe(1);

      const attendance = await prisma.attendanceSession.findUnique({
        where: { id: history.id },
      });
      expect(attendance).not.toBeNull();
      expect(attendance?.employeeId).toBe(employee.id);
      expect(attendance?.clockInKey).toBe(history.clockInKey);
      expect(attendance?.closedBySystem).toBe(false);

      const allowedAgain = await signIn(
        employee.email,
        employee.temporaryPassword,
      );
      expect(allowedAgain.status).toBe(200);
      issuedTokens.push(sidFrom(allowedAgain.headers));
    });

    it('refuses a status value outside the two allowed ones', async () => {
      const employee = await provision('bad-status');

      const response = await postJson(
        'patch',
        `${EMPLOYEES_URL}/${employee.id}/status`,
        hrdToken,
        { status: 'archived' },
      );

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });

      const row = await prisma.employee.findUnique({
        where: { id: employee.id },
      });
      expect(row?.status).toBe('active');
    });
  });

  describe('PATCH /employees/:id', () => {
    it('applies field changes, refuses a colliding address and ignores privileged keys', async () => {
      const target = await provision('update');
      const other = await provision('update-other');
      const before = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(before).not.toBeNull();

      const collision = await postJson(
        'patch',
        `${EMPLOYEES_URL}/${target.id}`,
        hrdToken,
        { email: other.email },
      );
      expect(collision.status).toBe(409);
      expect(collision.body).toMatchObject({
        statusCode: 409,
        code: 'EMAIL_TAKEN',
      });

      const renamed = uniqueEmail('update-renamed');
      createdEmails.push(renamed);
      const updated = await postJson(
        'patch',
        `${EMPLOYEES_URL}/${target.id}`,
        hrdToken,
        {
          name: 'Renamed Person',
          position: 'Data Engineer',
          phone: '+62-815-7777-8888',
          email: renamed,
          role: 'hrd',
          status: 'deactivated',
          mustChangePassword: false,
        },
      );
      expect(updated.status).toBe(200);
      expect(Object.keys(updated.body).sort()).toEqual([
        'email',
        'id',
        'name',
        'position',
        'status',
      ]);
      expect(updated.body).toEqual({
        id: target.id,
        name: 'Renamed Person',
        email: renamed,
        position: 'Data Engineer',
        status: 'active',
      });

      const row = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(row).not.toBeNull();
      if (!row) {
        return;
      }
      expect(row.name).toBe('Renamed Person');
      expect(row.position).toBe('Data Engineer');
      expect(row.phone).toBe('+62-815-7777-8888');
      expect(row.email).toBe(renamed);
      // Status and credentials are only reachable through their own routes.
      expect(row.role).toBe('employee');
      expect(row.status).toBe('active');
      expect(row.mustChangePassword).toBe(true);
      expect(await argon2.verify(row.passwordHash, target.temporaryPassword)).toBe(
        true,
      );
    });

    it('answers 404 for an id no employee carries, on every mutating route', async () => {
      const unknownId = randomUUID();

      const update = await postJson(
        'patch',
        `${EMPLOYEES_URL}/${unknownId}`,
        hrdToken,
        { name: 'Ghost' },
      );
      const reset = await call(
        'post',
        `${EMPLOYEES_URL}/${unknownId}/reset-password`,
        hrdToken,
      );
      const status = await postJson(
        'patch',
        `${EMPLOYEES_URL}/${unknownId}/status`,
        hrdToken,
        { status: 'deactivated' },
      );

      for (const response of [update, reset, status]) {
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: ERROR_MESSAGES.id.NOT_FOUND,
        });
      }
    });
  });

  describe('route protection', () => {
    type EmployeeRoute = { method: 'get' | 'post' | 'patch'; path: string };

    const employeeRoutes = (id: string): EmployeeRoute[] => [
      { method: 'get', path: EMPLOYEES_URL },
      { method: 'post', path: EMPLOYEES_URL },
      { method: 'patch', path: `${EMPLOYEES_URL}/${id}` },
      { method: 'post', path: `${EMPLOYEES_URL}/${id}/reset-password` },
      { method: 'patch', path: `${EMPLOYEES_URL}/${id}/status` },
    ];

    const callRoute = (route: EmployeeRoute, token?: string) =>
      route.method === 'get'
        ? call(route.method, route.path, token)
        : call(route.method, route.path, token).send({});

    it('answers 401 AUTH_REQUIRED on every employee route without a session', async () => {
      const id = randomUUID();

      for (const route of employeeRoutes(id)) {
        const response = await callRoute(route);
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          statusCode: 401,
          code: 'AUTH_REQUIRED',
          message: ERROR_MESSAGES.id.AUTH_REQUIRED,
        });
      }
    });

    it('answers 403 FORBIDDEN on every employee route for an employee-role session', async () => {
      const id = randomUUID();

      for (const route of employeeRoutes(id)) {
        const response = await callRoute(route, employeeRoleToken);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({
          statusCode: 403,
          code: 'FORBIDDEN',
          message: ERROR_MESSAGES.id.FORBIDDEN,
        });
      }
    });

    it('keeps the HRD caller signed in across employee management calls', async () => {
      const response = await call('get', EMPLOYEES_URL, hrdToken);
      expect(response.status).toBe(200);
      expect(await raw.exists(sessionKey(hrdToken))).toBe(1);
    });

    it('declares the session guard plus one distinct permission code per route', () => {
      const reflector = new Reflector();

      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          EmployeesController.prototype.list,
          EmployeesController,
        ]),
      ).toEqual([SessionGuard]);

      expect(
        reflector.get(PERMISSIONS_KEY, EmployeesController.prototype.list),
      ).toEqual(['employee:read']);
      expect(
        reflector.get(PERMISSIONS_KEY, EmployeesController.prototype.create),
      ).toEqual(['employee:create']);
      expect(
        reflector.get(PERMISSIONS_KEY, EmployeesController.prototype.update),
      ).toEqual(['employee:update']);
      expect(
        reflector.get(
          PERMISSIONS_KEY,
          EmployeesController.prototype.resetPassword,
        ),
      ).toEqual(['employee:update']);
      expect(
        reflector.get(PERMISSIONS_KEY, EmployeesController.prototype.setStatus),
      ).toEqual(['employee:update']);
    });
  });
});
