import type { INestApplication } from '@nestjs/common';
import argon2 from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { createApp } from '../src/app';
import { findPasswordProblem } from '../src/auth/password.policy';
import { SessionStore } from '../src/auth/session.store';
import type { ErrorCode } from '../src/common/app.exception';
import { PrismaService } from '../src/common/prisma.service';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { config } from '../src/config';
import { PrismaClient } from '../src/generated/prisma';

/**
 * Maker-checker approvals for HR accounts: an HRD maker files a proposal, a
 * different HRD checker approves it or rejects it with a reason, and the maker
 * may withdraw a proposal that is still pending. An `add_hr` approval mints
 * the account and reveals its one-time password exactly once; a `deactivate_hr`
 * approval takes the target's access away (row flipped, sessions dropped,
 * attendance told) while the row itself stays as history; a `reset_password`
 * approval mints a replacement one-time password for an existing HR account
 * and drops its sessions without ever flipping its status; an `update_hr`
 * approval writes the proposed profile fields (name, position, phone) onto
 * the target account, never touching its credential, role, status or
 * sessions; a `reactivate_hr` approval restores a deactivated HR account by
 * flipping its status back to active inside the decision transaction, minting
 * no password, creating no session and telling attendance nothing.
 *
 * Every account, proposal and address this suite touches is created here on a
 * unique value and removed again afterwards, so the shared development
 * database stays safe when other suites run beside it. The seeded demo
 * accounts are never read or written by this suite.
 */

const REQUESTS_URL = '/api/identity/hr-access-requests';
const LOGIN_URL = '/api/identity/auth/login';

/** Internal path the attendance service exposes for closing an open session. */
const CLOSE_OPEN_PATH = '/api/attendance/internal/sessions/close-open';

/** One close-open notification the deactivation flow sent to attendance. */
interface HookCall {
  path: string;
  employeeId: string | null;
}

interface HookServer {
  url: string;
  calls: HookCall[];
  close: () => Promise<void>;
}

/**
 * Local stand-in for the attendance service: it records every deactivation
 * notification so a test can prove an approval drives the very same close-open
 * call the plain status route drives, and answers 200 on the first attempt so
 * no retry loop ever stretches the suite.
 */
async function startHookServer(): Promise<HookServer> {
  const calls: HookCall[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      let employeeId: string | null = null;
      try {
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const id = (body as { employeeId?: unknown }).employeeId;
        employeeId = typeof id === 'string' ? id : null;
      } catch {
        employeeId = null;
      }
      calls.push({ path: req.url ?? '', employeeId });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ closed: 1 }));
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

const MAKER_NAME = 'Maker HR (hr-access suite)';
const CHECKER_NAME = 'Checker HR (hr-access suite)';

let emailSequence = 0;

/** A fresh company address no other row and no other run can carry. */
const uniqueEmail = (label: string): string =>
  `${label}-${Date.now().toString(36)}-${(emailSequence += 1)}-${randomUUID().slice(0, 8)}@company.test`;

/** Every field a proposal answer carries, in any order. */
const REQUEST_KEYS = [
  'id',
  'type',
  'state',
  'proposedName',
  'proposedEmail',
  'proposedPosition',
  'proposedPhone',
  'targetEmployeeId',
  'target',
  'maker',
  'checker',
  'decisionNote',
  'decidedAt',
  'createdAt',
  'updatedAt',
  'canDecide',
  'viewerIsTarget',
];

/** Keys of the maker/checker snapshot objects. */
const ACTOR_KEYS = ['id', 'name', 'email'];

describe('HR access proposals (maker-checker)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let store: SessionStore;
  /** The pool the application itself uses, so a test can patch one delegate. */
  let appPrisma: PrismaService;
  let hook: HookServer;
  let originalAttendanceUrl: string | undefined;

  let makerId = '';
  let makerEmail = '';
  let checkerId = '';
  let checkerEmail = '';
  let makerToken = '';
  let checkerToken = '';
  let employeeToken = '';
  let employeeFixtureId = '';

  const createdRequestIds: string[] = [];
  const createdEmployeeIds: string[] = [];
  const proposalEmails: string[] = [];

  const call = (method: 'get' | 'post', path: string, token?: string) => {
    const req = request(app.getHttpServer())[method](path);
    return token === undefined ? req : req.set('Cookie', `sid=${token}`);
  };

  const postJson = (
    path: string,
    token: string | undefined,
    body: Record<string, unknown>,
  ) => call('post', path, token).send(body);

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
    return token;
  };

  /** Asserts the uniform error body, localized to the default language. */
  const expectError = (
    response: request.Response,
    statusCode: number,
    code: ErrorCode,
  ): void => {
    expect(response.body).toEqual({
      statusCode,
      code,
      message: ERROR_MESSAGES.id[code],
    });
  };

  /**
   * Asserts a proposal answer carries exactly the documented field set, plus
   * any route-specific extras (the approve answer's one-time password).
   */
  const expectRequestShape = (
    body: Record<string, unknown>,
    extraKeys: string[] = [],
  ): void => {
    expect(Object.keys(body).sort()).toEqual(
      [...REQUEST_KEYS, ...extraKeys].sort(),
    );
    expect(Object.keys(body.maker as object).sort()).toEqual(
      [...ACTOR_KEYS].sort(),
    );
    const checker = body.checker;
    expect(checker === null || typeof checker === 'object').toBe(true);
    if (checker !== null) {
      expect(Object.keys(checker as object).sort()).toEqual(
        [...ACTOR_KEYS].sort(),
      );
    }
    const target = body.target;
    expect(target === null || typeof target === 'object').toBe(true);
    if (target !== null) {
      expect(Object.keys(target as object).sort()).toEqual(
        ['id', 'name', 'email', 'status'].sort(),
      );
    }
  };

  /** The create body every happy-path proposal uses, on a fresh address. */
  const proposalBody = (
    email: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    type: 'add_hr',
    name: 'Proposed Person',
    position: 'HR Officer',
    phone: '+62-811-0000-0707',
    ...overrides,
    email,
  });

  /** Files a proposal and fails loudly when the API refuses it. */
  const proposeOk = async (
    token: string,
  ): Promise<{ id: string; email: string }> => {
    const email = uniqueEmail('proposal');
    proposalEmails.push(email);
    const response = await postJson(
      REQUESTS_URL,
      token,
      proposalBody(email),
    );
    if (response.status !== 201) {
      throw new Error(
        `proposal refused with ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    createdRequestIds.push(response.body.id as string);
    return { id: response.body.id as string, email };
  };

  /** An address that already belongs to an account, written straight to the table. */
  const createAccountRow = async (email: string): Promise<string> => {
    const row = await prisma.employee.create({
      data: {
        email,
        name: 'Pre-existing Account',
        position: 'Support',
        phone: '+62-811-0000-0808',
        role: 'employee',
        status: 'active',
        passwordHash: 'unused-hash',
        mustChangePassword: false,
      },
      select: { id: true },
    });
    createdEmployeeIds.push(row.id);
    return row.id;
  };

  const loadRequest = (id: string) =>
    prisma.hrAccessRequest.findUnique({ where: { id } });

  /**
   * An HR account written straight to the table to act as a deactivation
   * target, in either state the create rules distinguish.
   */
  const createHrRow = async (
    label: string,
    status: 'active' | 'deactivated' = 'active',
  ): Promise<{ id: string; email: string }> => {
    const email = uniqueEmail(label);
    const row = await prisma.employee.create({
      data: {
        email,
        name: 'Deactivation Target',
        position: 'HR Officer',
        phone: '+62-811-0000-0909',
        role: 'hrd',
        status,
        passwordHash: 'unused-hash',
        mustChangePassword: false,
      },
      select: { id: true },
    });
    createdEmployeeIds.push(row.id);
    return { id: row.id, email };
  };

  /** Files a `deactivate_hr` proposal and fails loudly when it is refused. */
  const proposeDeactivate = async (
    targetId: string,
    token: string = makerToken,
  ): Promise<string> => {
    const response = await postJson(REQUESTS_URL, token, {
      type: 'deactivate_hr',
      targetEmployeeId: targetId,
    });
    if (response.status !== 201) {
      throw new Error(
        `deactivation proposal refused with ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    createdRequestIds.push(response.body.id as string);
    return response.body.id as string;
  };

  /**
   * Files an `update_hr` proposal carrying the given profile fields, and fails
   * loudly when the API refuses it.
   */
  const proposeUpdate = async (
    targetId: string,
    fields: Record<string, unknown>,
    token: string = makerToken,
  ): Promise<string> => {
    const response = await postJson(REQUESTS_URL, token, {
      type: 'update_hr',
      targetEmployeeId: targetId,
      ...fields,
    });
    if (response.status !== 201) {
      throw new Error(
        `update proposal refused with ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    createdRequestIds.push(response.body.id as string);
    return response.body.id as string;
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    store = new SessionStore({ redisUrl: config.redisUrl });

    // The attendance notification is part of every deactivation, so the suite
    // answers it itself instead of leaning on a service it does not control.
    hook = await startHookServer();
    originalAttendanceUrl = process.env.ATTENDANCE_INTERNAL_URL;
    process.env.ATTENDANCE_INTERNAL_URL = hook.url;

    makerEmail = uniqueEmail('maker');
    const maker = await prisma.employee.create({
      data: {
        email: makerEmail,
        name: MAKER_NAME,
        position: 'HR Manager',
        phone: '+62-811-0000-9101',
        role: 'hrd',
        status: 'active',
        passwordHash: 'unused-hash',
        mustChangePassword: false,
      },
      select: { id: true },
    });
    makerId = maker.id;
    createdEmployeeIds.push(maker.id);

    checkerEmail = uniqueEmail('checker');
    const checker = await prisma.employee.create({
      data: {
        email: checkerEmail,
        name: CHECKER_NAME,
        position: 'HR Officer',
        phone: '+62-811-0000-9102',
        role: 'hrd',
        status: 'active',
        passwordHash: 'unused-hash',
        mustChangePassword: false,
      },
      select: { id: true },
    });
    checkerId = checker.id;
    createdEmployeeIds.push(checker.id);

    makerToken = await seedSession(makerId, 'hrd');
    checkerToken = await seedSession(checkerId, 'hrd');
    employeeFixtureId = randomUUID();
    employeeToken = await seedSession(employeeFixtureId, 'employee');

    app = await createApp();
    appPrisma = app.get(PrismaService);
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
    if (hook) {
      await hook.close();
    }

    if (createdRequestIds.length > 0) {
      await prisma.hrAccessRequest.deleteMany({
        where: { id: { in: createdRequestIds } },
      });
    }

    // Accounts minted by an approval are known only by the address they were
    // proposed on, so the sweep below catches them even when a failed
    // assertion stopped the test from recording the id.
    const swept = await prisma.employee.findMany({
      where: { email: { in: proposalEmails } },
      select: { id: true },
    });
    const employeeIds = [
      ...new Set([
        ...createdEmployeeIds,
        ...swept.map((row) => row.id),
        makerId,
        checkerId,
      ]),
    ];
    if (employeeIds.length > 0) {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: { in: employeeIds } },
      });
      await prisma.employee.deleteMany({
        where: { id: { in: employeeIds } },
      });
    }

    for (const employeeId of [...employeeIds, employeeFixtureId]) {
      await store.deleteAllForEmployee(employeeId);
    }
    await store.quit();
    await prisma.$disconnect();
  });

  describe('POST /hr-access-requests', () => {
    it('files an add_hr proposal as pending with the session identity as its maker', async () => {
      const email = uniqueEmail('create');
      proposalEmails.push(email);

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'add_hr',
        name: 'Dewi Lestari',
        email,
        position: 'HR Officer',
        phone: '+62-811-0000-0009',
      });

      expect(response.status).toBe(201);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        type: 'add_hr',
        state: 'pending',
        proposedName: 'Dewi Lestari',
        proposedEmail: email,
        proposedPosition: 'HR Officer',
        proposedPhone: '+62-811-0000-0009',
        targetEmployeeId: null,
        target: null,
        maker: { id: makerId, name: MAKER_NAME, email: makerEmail },
        checker: null,
        decisionNote: null,
        decidedAt: null,
        canDecide: false,
      });
      createdRequestIds.push(response.body.id as string);

      const row = await loadRequest(response.body.id as string);
      expect(row).toMatchObject({
        type: 'add_hr',
        state: 'pending',
        makerEmployeeId: makerId,
        checkerEmployeeId: null,
        decidedAt: null,
        proposedEmail: email,
      });
    });

    it('refuses a body missing any required field with 400 BAD_REQUEST and writes nothing', async () => {
      const base = proposalBody(uniqueEmail('missing'));
      const before = await prisma.hrAccessRequest.count({
        where: { makerEmployeeId: makerId },
      });

      for (const field of ['name', 'email', 'position', 'phone', 'type']) {
        const body: Record<string, unknown> = { ...base };
        delete body[field];
        const response = await postJson(REQUESTS_URL, makerToken, body);
        expectError(response, 400, 'BAD_REQUEST');
      }

      const unknownType = await postJson(REQUESTS_URL, makerToken, {
        ...base,
        type: 'promote',
      });
      expectError(unknownType, 400, 'BAD_REQUEST');

      expect(
        await prisma.hrAccessRequest.count({
          where: { makerEmployeeId: makerId },
        }),
      ).toBe(before);
    });

    it('refuses a malformed address and an unusable phone the way employee creation does', async () => {
      const before = await prisma.hrAccessRequest.count({
        where: { makerEmployeeId: makerId },
      });

      const malformed = await postJson(
        REQUESTS_URL,
        makerToken,
        proposalBody('not-an-address'),
      );
      expectError(malformed, 400, 'BAD_REQUEST');

      const phoneEmail = uniqueEmail('bad-phone');
      proposalEmails.push(phoneEmail);
      const unusable = await postJson(
        REQUESTS_URL,
        makerToken,
        proposalBody(phoneEmail, { phone: 'not-a-phone' }),
      );
      expectError(unusable, 400, 'PHONE_INVALID');

      expect(
        await prisma.hrAccessRequest.count({
          where: { makerEmployeeId: makerId },
        }),
      ).toBe(before);
      expect(
        await prisma.hrAccessRequest.count({
          where: { proposedEmail: { in: ['not-an-address', phoneEmail] } },
        }),
      ).toBe(0);
    });

    it('refuses an address an account already holds with 409 EMAIL_TAKEN', async () => {
      const email = uniqueEmail('taken');
      await createAccountRow(email);

      const response = await postJson(
        REQUESTS_URL,
        makerToken,
        proposalBody(email),
      );
      expectError(response, 409, 'EMAIL_TAKEN');
      expect(
        await prisma.hrAccessRequest.count({ where: { proposedEmail: email } }),
      ).toBe(0);

      const mixedCase = await postJson(
        REQUESTS_URL,
        makerToken,
        proposalBody(email.toUpperCase()),
      );
      expectError(mixedCase, 409, 'EMAIL_TAKEN');
      expect(await prisma.employee.count({ where: { email } })).toBe(1);
    });
  });

  describe('GET /hr-access-requests', () => {
    it('answers newest first with resolved snapshots and no decide hint for the maker', async () => {
      const first = await proposeOk(makerToken);
      await new Promise((resolve) => setTimeout(resolve, 15));
      const second = await proposeOk(makerToken);

      const asMaker = await call('get', REQUESTS_URL, makerToken);
      expect(asMaker.status).toBe(200);
      expect(Array.isArray(asMaker.body.items)).toBe(true);
      expect(typeof asMaker.body.total).toBe('number');

      const items = asMaker.body.items as Record<string, unknown>[];
      const mine = items.filter(
        (item) => item.id === first.id || item.id === second.id,
      );
      expect(mine.map((item) => item.id)).toEqual([second.id, first.id]);
      for (const item of mine) {
        expectRequestShape(item);
        expect(item.canDecide).toBe(false);
        expect(item.maker).toEqual({
          id: makerId,
          name: MAKER_NAME,
          email: makerEmail,
        });
        expect(item.checker).toBeNull();
        expect(item.target).toBeNull();
        expect(item.state).toBe('pending');
      }

      const asChecker = await call('get', REQUESTS_URL, checkerToken);
      expect(asChecker.status).toBe(200);
      const theirs = (asChecker.body.items as Record<string, unknown>[]).filter(
        (item) => item.id === first.id || item.id === second.id,
      );
      expect(theirs).toHaveLength(2);
      expect(theirs.every((item) => item.canDecide === true)).toBe(true);
    });

    it('filters by state and type, and refuses an unknown filter value with 400', async () => {
      const pending = await proposeOk(makerToken);
      const cancelled = await proposeOk(makerToken);
      const withdrawn = await call(
        'post',
        `${REQUESTS_URL}/${cancelled.id}/withdraw`,
        makerToken,
      );
      expect(withdrawn.status).toBe(200);

      const pendingList = await call(
        'get',
        `${REQUESTS_URL}?state=pending`,
        makerToken,
      );
      expect(pendingList.status).toBe(200);
      const pendingIds = (pendingList.body.items as { id: string }[]).map(
        (item) => item.id,
      );
      expect(pendingIds).toContain(pending.id);
      expect(pendingIds).not.toContain(cancelled.id);
      expect(pendingList.body.total).toBe(pendingIds.length);

      const typeList = await call(
        'get',
        `${REQUESTS_URL}?type=add_hr`,
        makerToken,
      );
      expect(typeList.status).toBe(200);
      expect(
        (typeList.body.items as { id: string }[]).map((item) => item.id),
      ).toContain(pending.id);

      for (const query of ['state=bogus', 'type=bogus']) {
        const refused = await call('get', `${REQUESTS_URL}?${query}`, makerToken);
        expectError(refused, 400, 'BAD_REQUEST');
      }
    });
  });

  describe('POST /hr-access-requests/:id/approve', () => {
    it('creates the HR account, records the decision and reveals the password exactly once', async () => {
      const { id, email } = await proposeOk(makerToken);

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
      expect(response.status).toBe(200);
      expectRequestShape(response.body, ['temporaryPassword']);
      expect(response.body).toMatchObject({
        state: 'approved',
        type: 'add_hr',
        canDecide: false,
        checker: { id: checkerId, name: CHECKER_NAME, email: checkerEmail },
      });
      expect(typeof response.body.decidedAt).toBe('string');

      const temporaryPassword = response.body.temporaryPassword as string;
      expect(typeof temporaryPassword).toBe('string');
      expect(findPasswordProblem(temporaryPassword)).toBeNull();
      const payload = JSON.stringify(response.body);
      expect(payload.split(temporaryPassword).length - 1).toBe(1);
      expect(payload).not.toContain('$argon2');

      const account = await prisma.employee.findUnique({ where: { email } });
      expect(account).not.toBeNull();
      if (!account) {
        return;
      }
      createdEmployeeIds.push(account.id);
      expect(account.role).toBe('hrd');
      expect(account.status).toBe('active');
      expect(account.mustChangePassword).toBe(true);
      expect(
        account.passwordHash.startsWith('$argon2id$v=19$m=19456,p=1,t=2$'),
      ).toBe(true);
      expect(account.passwordHash).not.toBe(temporaryPassword);
      expect(await argon2.verify(account.passwordHash, temporaryPassword)).toBe(
        true,
      );

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        decisionNote: null,
      });
      expect(row?.decidedAt).not.toBeNull();

      // The password exists nowhere except this one response body.
      const listed = await call('get', REQUESTS_URL, checkerToken);
      expect(JSON.stringify(listed.body)).not.toContain(temporaryPassword);
    });

    it('refuses self-approval with 403 and changes nothing', async () => {
      const { id, email } = await proposeOk(makerToken);
      const before = await loadRequest(id);

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, makerToken, {});
      expectError(response, 403, 'FORBIDDEN');

      expect(await loadRequest(id)).toEqual(before);
      expect(await prisma.employee.count({ where: { email } })).toBe(0);
    });

    it('refuses a self-rejection with 403 and changes nothing', async () => {
      const { id, email } = await proposeOk(makerToken);
      const before = await loadRequest(id);

      const response = await postJson(`${REQUESTS_URL}/${id}/reject`, makerToken, {
        note: 'changed my mind',
      });
      expectError(response, 403, 'FORBIDDEN');

      expect(await loadRequest(id)).toEqual(before);
      expect(await prisma.employee.count({ where: { email } })).toBe(0);
    });

    it('answers 404 NOT_FOUND for an id no proposal carries, on every decision route', async () => {
      const unknownId = randomUUID();

      const approve = await postJson(
        `${REQUESTS_URL}/${unknownId}/approve`,
        checkerToken,
        {},
      );
      const reject = await postJson(
        `${REQUESTS_URL}/${unknownId}/reject`,
        checkerToken,
        { note: 'no such proposal' },
      );
      const withdraw = await postJson(
        `${REQUESTS_URL}/${unknownId}/withdraw`,
        makerToken,
        {},
      );

      for (const response of [approve, reject, withdraw]) {
        expectError(response, 404, 'NOT_FOUND');
      }
    });

    it('refuses every later decision on a decided proposal with 409 and keeps the row', async () => {
      const { id, email } = await proposeOk(makerToken);
      const approved = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
      expect(approved.status).toBe(200);
      const before = await loadRequest(id);

      const again = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
      expectError(again, 409, 'CONFLICT');
      const rejected = await postJson(`${REQUESTS_URL}/${id}/reject`, checkerToken, {
        note: 'too late',
      });
      expectError(rejected, 409, 'CONFLICT');
      const withdrawn = await postJson(`${REQUESTS_URL}/${id}/withdraw`, makerToken, {});
      expectError(withdrawn, 409, 'CONFLICT');

      expect(await loadRequest(id)).toEqual(before);
      expect(await prisma.employee.count({ where: { email } })).toBe(1);
    });

    it('refuses approval when the address was claimed meanwhile and leaves the proposal pending', async () => {
      const { id, email } = await proposeOk(makerToken);
      const before = await loadRequest(id);
      expect(before?.state).toBe('pending');
      await createAccountRow(email);

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
      expectError(response, 409, 'CONFLICT');

      const after = await loadRequest(id);
      expect(after).toEqual(before);
      expect(after?.state).toBe('pending');
      expect(after?.checkerEmployeeId).toBeNull();
      expect(after?.decidedAt).toBeNull();
      expect(await prisma.employee.count({ where: { email } })).toBe(1);
    });
  });

  describe('POST /hr-access-requests/:id/reject', () => {
    it('refuses a rejection without a reason with 400 and keeps the proposal pending', async () => {
      const { id, email } = await proposeOk(makerToken);

      const missing = await postJson(`${REQUESTS_URL}/${id}/reject`, checkerToken, {});
      expectError(missing, 400, 'BAD_REQUEST');
      const blank = await postJson(`${REQUESTS_URL}/${id}/reject`, checkerToken, {
        note: '   ',
      });
      expectError(blank, 400, 'BAD_REQUEST');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'pending',
        checkerEmployeeId: null,
        decidedAt: null,
      });
      expect(await prisma.employee.count({ where: { email } })).toBe(0);
    });

    it('records the rejection with reason, checker and time without creating an account', async () => {
      const { id, email } = await proposeOk(makerToken);

      const response = await postJson(`${REQUESTS_URL}/${id}/reject`, checkerToken, {
        note: 'Position band not approved',
      });
      expect(response.status).toBe(200);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        state: 'rejected',
        decisionNote: 'Position band not approved',
        canDecide: false,
        checker: { id: checkerId, name: CHECKER_NAME, email: checkerEmail },
      });
      expect(typeof response.body.decidedAt).toBe('string');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'rejected',
        checkerEmployeeId: checkerId,
        decisionNote: 'Position band not approved',
      });
      expect(row?.decidedAt).not.toBeNull();
      expect(await prisma.employee.count({ where: { email } })).toBe(0);
    });
  });

  describe('POST /hr-access-requests/:id/withdraw', () => {
    it('refuses a withdrawal by anyone but the maker with 403', async () => {
      const { id, email } = await proposeOk(makerToken);
      const before = await loadRequest(id);

      const response = await postJson(`${REQUESTS_URL}/${id}/withdraw`, checkerToken, {});
      expectError(response, 403, 'FORBIDDEN');

      expect(await loadRequest(id)).toEqual(before);
      expect(await prisma.employee.count({ where: { email } })).toBe(0);
    });

    it('lets the maker cancel a pending proposal and blocks every later decision', async () => {
      const { id, email } = await proposeOk(makerToken);

      const response = await postJson(`${REQUESTS_URL}/${id}/withdraw`, makerToken, {});
      expect(response.status).toBe(200);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        state: 'withdrawn',
        checker: null,
        decisionNote: null,
        decidedAt: null,
        canDecide: false,
      });

      const approve = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
      expectError(approve, 409, 'CONFLICT');
      const reject = await postJson(`${REQUESTS_URL}/${id}/reject`, checkerToken, {
        note: 'too late',
      });
      expectError(reject, 409, 'CONFLICT');
      const withdrawAgain = await postJson(`${REQUESTS_URL}/${id}/withdraw`, makerToken, {});
      expectError(withdrawAgain, 409, 'CONFLICT');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'withdrawn',
        checkerEmployeeId: null,
        decidedAt: null,
      });
      expect(await prisma.employee.count({ where: { email } })).toBe(0);
    });

    it('refuses withdrawal once the proposal has been decided', async () => {
      const { id, email } = await proposeOk(makerToken);
      const approved = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
      expect(approved.status).toBe(200);
      const before = await loadRequest(id);

      const response = await postJson(`${REQUESTS_URL}/${id}/withdraw`, makerToken, {});
      expectError(response, 409, 'CONFLICT');

      expect(await loadRequest(id)).toEqual(before);
      expect(await prisma.employee.count({ where: { email } })).toBe(1);
    });
  });

  describe('deactivate_hr proposals', () => {
    it('files a deactivation proposal as pending with a resolved target snapshot', async () => {
      const target = await createHrRow('deact-create');

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'deactivate_hr',
        targetEmployeeId: target.id,
      });

      expect(response.status).toBe(201);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        type: 'deactivate_hr',
        state: 'pending',
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
        targetEmployeeId: target.id,
        target: { id: target.id, email: target.email, status: 'active' },
        maker: { id: makerId, name: MAKER_NAME, email: makerEmail },
        checker: null,
        decisionNote: null,
        decidedAt: null,
        canDecide: false,
      });
      createdRequestIds.push(response.body.id as string);

      const row = await loadRequest(response.body.id as string);
      expect(row).toMatchObject({
        type: 'deactivate_hr',
        state: 'pending',
        targetEmployeeId: target.id,
        makerEmployeeId: makerId,
        checkerEmployeeId: null,
        proposedEmail: null,
      });
    });

    it('answers 404 NOT_FOUND for an unknown deactivation target and writes nothing', async () => {
      const before = await prisma.hrAccessRequest.count({
        where: { type: 'deactivate_hr' },
      });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'deactivate_hr',
        targetEmployeeId: randomUUID(),
      });

      expectError(response, 404, 'NOT_FOUND');
      expect(
        await prisma.hrAccessRequest.count({ where: { type: 'deactivate_hr' } }),
      ).toBe(before);
    });

    it('answers 409 CONFLICT for a target that is not an HR account and writes nothing', async () => {
      const employeeId = await createAccountRow(uniqueEmail('deact-plain'));
      const where = { type: 'deactivate_hr' as const, targetEmployeeId: employeeId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'deactivate_hr',
        targetEmployeeId: employeeId,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: employeeId } }))?.role,
      ).toBe('employee');
    });

    it('answers 409 CONFLICT for a target HR account that is already deactivated', async () => {
      const target = await createHrRow('deact-inactive', 'deactivated');
      const where = { type: 'deactivate_hr' as const, targetEmployeeId: target.id };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'deactivate_hr',
        targetEmployeeId: target.id,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('deactivated');
    });

    it('answers 409 CONFLICT when the maker names their own account as the target', async () => {
      const where = { type: 'deactivate_hr' as const, makerEmployeeId: makerId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'deactivate_hr',
        targetEmployeeId: makerId,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: makerId } }))?.status,
      ).toBe('active');
    });

    it('approves: deactivates the target, ends its session and keeps the row as history', async () => {
      const target = await createHrRow('deact-approve');
      const targetToken = await seedSession(target.id, 'hrd');
      // The target is a working HR session right up to the decision.
      expect((await call('get', REQUESTS_URL, targetToken)).status).toBe(200);

      const id = await proposeDeactivate(target.id);
      const beforeCalls = hook.calls.length;

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {
        note: 'role handed to a peer',
      });

      expect(response.status).toBe(200);
      // A deactivation mints no account, so no one-time password travels.
      expect(Object.keys(response.body).sort()).toEqual([...REQUEST_KEYS].sort());
      expect(response.body).toMatchObject({
        type: 'deactivate_hr',
        state: 'approved',
        targetEmployeeId: target.id,
        decisionNote: 'role handed to a peer',
        canDecide: false,
        checker: { id: checkerId, name: CHECKER_NAME, email: checkerEmail },
        target: { id: target.id, email: target.email, status: 'deactivated' },
      });
      expect(typeof response.body.decidedAt).toBe('string');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        decisionNote: 'role handed to a peer',
        targetEmployeeId: target.id,
      });
      expect(row?.decidedAt).not.toBeNull();

      // History is retained: the row is flipped in place, never deleted.
      const targetRow = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(targetRow).not.toBeNull();
      expect(targetRow).toMatchObject({
        email: target.email,
        role: 'hrd',
        status: 'deactivated',
      });

      // The session the target held is refused on the very next request ...
      expectError(await call('get', REQUESTS_URL, targetToken), 401, 'AUTH_REQUIRED');
      expect(await store.get(targetToken)).toBeNull();
      // ... while the checker who decided stays signed in.
      expect((await call('get', REQUESTS_URL, checkerToken)).status).toBe(200);

      // One close-open notification, carrying exactly this target.
      expect(hook.calls.slice(beforeCalls)).toEqual([
        { path: CLOSE_OPEN_PATH, employeeId: target.id },
      ]);
    });

    it('refuses the approval that would leave no active HR — twice — and keeps every row put', async () => {
      // The shared database always holds other active HR accounts, so the
      // "only the target would remain" world is forced on the one delegate the
      // approval counts through, for the duration of the approve call only.
      for (let round = 1; round <= 2; round += 1) {
        const target = await createHrRow(`deact-last-hr-${round}`);
        const id = await proposeDeactivate(target.id);
        const before = await loadRequest(id);

        const originalCount = appPrisma.employee.count;
        const probes: { where?: { id?: { not?: string } } }[] = [];
        appPrisma.employee.count = (async (args?: {
          where?: { id?: { not?: string } };
        }) => {
          probes.push(args ?? {});
          return args?.where?.id?.not !== undefined
            ? 0
            : originalCount.call(appPrisma.employee, args);
        }) as unknown as typeof appPrisma.employee.count;

        try {
          const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});
          expectError(response, 409, 'CONFLICT');
        } finally {
          appPrisma.employee.count = originalCount;
        }

        // The refusal rolled the decision back: still pending, target untouched.
        expect(await loadRequest(id)).toEqual(before);
        expect((await loadRequest(id))?.state).toBe('pending');
        expect(
          (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
        ).toBe('active');
        // The approval really did count active HRs, and it excluded the target.
        expect(probes.length).toBeGreaterThan(0);
        expect(probes.some((args) => args.where?.id?.not === target.id)).toBe(true);
      }
    });

    it('refuses an approval whose target was deactivated meanwhile, leaving the proposal untouched', async () => {
      const target = await createHrRow('deact-stale');
      const id = await proposeDeactivate(target.id);
      const before = await loadRequest(id);

      // Somebody takes the access away out of band, before any checker looks.
      await prisma.employee.update({
        where: { id: target.id },
        data: { status: 'deactivated', updatedAt: new Date() },
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});

      expectError(response, 409, 'CONFLICT');
      expect(await loadRequest(id)).toEqual(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('deactivated');
    });

    it('refuses a checker approving the removal of their own account, keeping everything put', async () => {
      // The maker files the removal the checker would be the target of; the
      // checker's own session then tries to approve it.
      const id = await proposeDeactivate(checkerId);
      const before = await loadRequest(id);
      const checkerBefore = await prisma.employee.findUnique({
        where: { id: checkerId },
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});

      expectError(response, 403, 'FORBIDDEN');
      const after = await loadRequest(id);
      expect(after).toEqual(before);
      expect(after?.state).toBe('pending');
      expect(after?.checkerEmployeeId).toBeNull();
      expect(after?.decidedAt).toBeNull();
      expect(await prisma.employee.findUnique({ where: { id: checkerId } })).toEqual(
        checkerBefore,
      );
      expect(checkerBefore?.status).toBe('active');
    });

    it('lets exactly one of two simultaneous approvals decide, with a single transition', async () => {
      const target = await createHrRow('deact-race');
      const targetToken = await seedSession(target.id, 'hrd');
      const id = await proposeDeactivate(target.id);
      const beforeCalls = hook.calls.length;

      const [first, second] = await Promise.all([
        postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {}),
        postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {}),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      const winner = first.status === 200 ? first : second;
      const loser = first.status === 200 ? second : first;
      expect(Object.keys(winner.body).sort()).toEqual([...REQUEST_KEYS].sort());
      expectError(loser, 409, 'CONFLICT');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        targetEmployeeId: target.id,
      });
      expect(row?.decidedAt).not.toBeNull();

      const targetRow = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(targetRow).toMatchObject({ role: 'hrd', status: 'deactivated' });

      // Nothing else moved: no second row, no second effect, no new account.
      expect(await prisma.employee.count({ where: { email: target.email } })).toBe(1);
      expect(hook.calls.slice(beforeCalls)).toEqual([
        { path: CLOSE_OPEN_PATH, employeeId: target.id },
      ]);
      expectError(await call('get', REQUESTS_URL, targetToken), 401, 'AUTH_REQUIRED');
    });

    it('lets a peer reject and the maker withdraw a deactivation proposal, touching no account', async () => {
      const kept = await createHrRow('deact-reject');
      const rejectedId = await proposeDeactivate(kept.id);
      const rejected = await postJson(`${REQUESTS_URL}/${rejectedId}/reject`, checkerToken, {
        note: 'target still covers the shift',
      });
      expect(rejected.status).toBe(200);
      expect(rejected.body).toMatchObject({
        type: 'deactivate_hr',
        state: 'rejected',
        decisionNote: 'target still covers the shift',
        checker: { id: checkerId },
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: kept.id } }))?.status,
      ).toBe('active');

      const cancelled = await createHrRow('deact-withdraw');
      const withdrawnId = await proposeDeactivate(cancelled.id);
      const withdrawn = await postJson(`${REQUESTS_URL}/${withdrawnId}/withdraw`, makerToken, {});
      expect(withdrawn.status).toBe(200);
      expect(withdrawn.body).toMatchObject({
        type: 'deactivate_hr',
        state: 'withdrawn',
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: cancelled.id } }))?.status,
      ).toBe('active');
    });
  });

  describe('reset_password proposals', () => {
    /** A known plaintext the target can sign in with until the reset lands. */
    const OLD_PASSWORD = 'Old-Master-7788';

    /**
     * An HR account written straight to the table with a real password, so a
     * test can prove the old credential stops working after an approval.
     */
    const createResetTarget = async (
      label: string,
      status: 'active' | 'deactivated' = 'active',
    ): Promise<{ id: string; email: string }> => {
      const email = uniqueEmail(label);
      const row = await prisma.employee.create({
        data: {
          email,
          name: 'Reset Target',
          position: 'HR Officer',
          phone: '+62-811-0000-0911',
          role: 'hrd',
          status,
          passwordHash: await argon2.hash(OLD_PASSWORD),
          mustChangePassword: false,
        },
        select: { id: true },
      });
      createdEmployeeIds.push(row.id);
      return { id: row.id, email };
    };

    /** Files a `reset_password` proposal and fails loudly when it is refused. */
    const proposeReset = async (
      targetId: string,
      token: string = makerToken,
    ): Promise<string> => {
      const response = await postJson(REQUESTS_URL, token, {
        type: 'reset_password',
        targetEmployeeId: targetId,
      });
      if (response.status !== 201) {
        throw new Error(
          `reset proposal refused with ${response.status}: ${JSON.stringify(response.body)}`,
        );
      }
      createdRequestIds.push(response.body.id as string);
      return response.body.id as string;
    };

    it('files a reset proposal as pending with the target set and no proposed fields', async () => {
      const target = await createResetTarget('reset-create');

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reset_password',
        targetEmployeeId: target.id,
      });

      expect(response.status).toBe(201);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        type: 'reset_password',
        state: 'pending',
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
        targetEmployeeId: target.id,
        target: { id: target.id, email: target.email, status: 'active' },
        maker: { id: makerId, name: MAKER_NAME, email: makerEmail },
        checker: null,
        decisionNote: null,
        decidedAt: null,
        canDecide: false,
        // The maker is not the target, so no answer flatters them as either.
        viewerIsTarget: false,
      });
      createdRequestIds.push(response.body.id as string);

      const row = await loadRequest(response.body.id as string);
      expect(row).toMatchObject({
        type: 'reset_password',
        state: 'pending',
        targetEmployeeId: target.id,
        makerEmployeeId: makerId,
        checkerEmployeeId: null,
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
      });
    });

    it('answers 404 NOT_FOUND for an unknown reset target and writes nothing', async () => {
      const before = await prisma.hrAccessRequest.count({
        where: { type: 'reset_password' },
      });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reset_password',
        targetEmployeeId: randomUUID(),
      });

      expectError(response, 404, 'NOT_FOUND');
      expect(
        await prisma.hrAccessRequest.count({ where: { type: 'reset_password' } }),
      ).toBe(before);
    });

    it('answers 409 CONFLICT for a non-HRD target and writes nothing', async () => {
      const employeeId = await createAccountRow(uniqueEmail('reset-plain'));
      const where = { type: 'reset_password' as const, targetEmployeeId: employeeId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reset_password',
        targetEmployeeId: employeeId,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
    });

    it('answers 409 CONFLICT for a target HR account that is already deactivated', async () => {
      const target = await createResetTarget('reset-inactive', 'deactivated');
      const where = { type: 'reset_password' as const, targetEmployeeId: target.id };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reset_password',
        targetEmployeeId: target.id,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
    });

    it('answers 409 CONFLICT when the maker names their own account as the target', async () => {
      const where = { type: 'reset_password' as const, makerEmployeeId: makerId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reset_password',
        targetEmployeeId: makerId,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
    });

    it('approves: mints a one-time password, keeps the account active and revokes its sessions', async () => {
      const target = await createResetTarget('reset-approve');
      const targetToken = await seedSession(target.id, 'hrd');
      // The old credential works right up to the decision.
      const beforeHash = (
        await prisma.employee.findUnique({
          where: { id: target.id },
          select: { passwordHash: true },
        })
      )?.passwordHash;
      expect(
        (await signIn(target.email, OLD_PASSWORD)).status,
      ).toBe(200);
      expect((await call('get', REQUESTS_URL, targetToken)).status).toBe(200);

      const id = await proposeReset(target.id);
      const beforeCalls = hook.calls.length;

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {
        note: 'credential handed back',
      });

      expect(response.status).toBe(200);
      expectRequestShape(response.body, ['temporaryPassword']);
      expect(response.body).toMatchObject({
        type: 'reset_password',
        state: 'approved',
        targetEmployeeId: target.id,
        decisionNote: 'credential handed back',
        canDecide: false,
        checker: { id: checkerId, name: CHECKER_NAME, email: checkerEmail },
        target: { id: target.id, email: target.email, status: 'active' },
        // The checker is not the target of this reset.
        viewerIsTarget: false,
      });
      expect(typeof response.body.decidedAt).toBe('string');

      const temporaryPassword = response.body.temporaryPassword as string;
      expect(typeof temporaryPassword).toBe('string');
      expect(findPasswordProblem(temporaryPassword)).toBeNull();
      const payload = JSON.stringify(response.body);
      // Exactly once in this body, and no hash anywhere in it.
      expect(payload.split(temporaryPassword).length - 1).toBe(1);
      expect(payload).not.toContain('$argon2');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        decisionNote: 'credential handed back',
        targetEmployeeId: target.id,
      });
      expect(row?.decidedAt).not.toBeNull();

      // The account stays an active HR one; only its credential moved.
      const targetRow = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(targetRow).toMatchObject({ role: 'hrd', status: 'active' });
      expect(targetRow?.mustChangePassword).toBe(true);
      expect(targetRow?.passwordHash).not.toBe(beforeHash);
      expect(
        await argon2.verify(targetRow?.passwordHash ?? '', temporaryPassword),
      ).toBe(true);
      // The old password no longer verifies against the rewritten hash.
      expect(
        await argon2.verify(targetRow?.passwordHash ?? '', OLD_PASSWORD),
      ).toBe(false);

      // The sessions the target held are refused on the very next request ...
      expectError(await call('get', REQUESTS_URL, targetToken), 401, 'AUTH_REQUIRED');
      expect(await store.get(targetToken)).toBeNull();
      // ... the old password no longer signs in, the new one does ...
      expect((await signIn(target.email, OLD_PASSWORD)).status).toBe(401);
      const fresh = await signIn(target.email, temporaryPassword);
      expect(fresh.status).toBe(200);
      await store.deleteAllForEmployee(target.id);
      // ... while the checker who decided stays signed in.
      expect((await call('get', REQUESTS_URL, checkerToken)).status).toBe(200);

      // A reset is not a deactivation: attendance is never told anything.
      expect(hook.calls.slice(beforeCalls)).toEqual([]);

      // The password exists nowhere except this one response body.
      const listed = await call('get', REQUESTS_URL, checkerToken);
      expect(JSON.stringify(listed.body)).not.toContain(temporaryPassword);
    });

    it('refuses the approval when the target stopped being an active HR while pending', async () => {
      const target = await createResetTarget('reset-stale');
      const id = await proposeReset(target.id);
      const before = await loadRequest(id);

      await prisma.employee.update({
        where: { id: target.id },
        data: { status: 'deactivated', updatedAt: new Date() },
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});

      expectError(response, 409, 'CONFLICT');
      expect(await loadRequest(id)).toEqual(before);
      expect((await loadRequest(id))?.state).toBe('pending');
      const targetRow = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(targetRow?.status).toBe('deactivated');
      // The password was never minted: the old credential still verifies.
      expect(await argon2.verify(targetRow?.passwordHash ?? '', OLD_PASSWORD)).toBe(
        true,
      );
    });

    it('refuses a self-approval with 403 and changes nothing', async () => {
      const target = await createResetTarget('reset-self-approve');
      const id = await proposeReset(target.id);
      const before = await loadRequest(id);

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, makerToken, {});

      expectError(response, 403, 'FORBIDDEN');
      expect(await loadRequest(id)).toEqual(before);
      const targetRow = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(await argon2.verify(targetRow?.passwordHash ?? '', OLD_PASSWORD)).toBe(
        true,
      );
    });

    it('lets a peer reject and the maker withdraw a reset proposal, changing no credential', async () => {
      const kept = await createResetTarget('reset-reject');
      const rejectedId = await proposeReset(kept.id);
      const rejected = await postJson(`${REQUESTS_URL}/${rejectedId}/reject`, checkerToken, {
        note: 'target still has the paper credential',
      });
      expect(rejected.status).toBe(200);
      expect(rejected.body).toMatchObject({
        type: 'reset_password',
        state: 'rejected',
        decisionNote: 'target still has the paper credential',
        checker: { id: checkerId },
      });
      expect(
        await argon2.verify(
          (
            await prisma.employee.findUnique({
              where: { id: kept.id },
              select: { passwordHash: true },
            })
          )?.passwordHash ?? '',
          OLD_PASSWORD,
        ),
      ).toBe(true);

      const cancelled = await createResetTarget('reset-withdraw');
      const withdrawnId = await proposeReset(cancelled.id);
      const withdrawn = await postJson(`${REQUESTS_URL}/${withdrawnId}/withdraw`, makerToken, {});
      expect(withdrawn.status).toBe(200);
      expect(withdrawn.body).toMatchObject({
        type: 'reset_password',
        state: 'withdrawn',
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: cancelled.id } }))?.status,
      ).toBe('active');
    });

    it('marks viewerIsTarget for the target viewing the row and false for everyone else', async () => {
      const target = await createResetTarget('reset-viewer');
      const targetToken = await seedSession(target.id, 'hrd');
      const id = await proposeReset(target.id);

      const asTarget = await call('get', REQUESTS_URL, targetToken);
      expect(asTarget.status).toBe(200);
      const forTarget = (asTarget.body.items as Record<string, unknown>[]).find(
        (item) => item.id === id,
      );
      expect(forTarget?.viewerIsTarget).toBe(true);

      const asMaker = await call('get', REQUESTS_URL, makerToken);
      const forMaker = (asMaker.body.items as Record<string, unknown>[]).find(
        (item) => item.id === id,
      );
      expect(forMaker?.viewerIsTarget).toBe(false);

      const asChecker = await call('get', REQUESTS_URL, checkerToken);
      const forChecker = (asChecker.body.items as Record<string, unknown>[]).find(
        (item) => item.id === id,
      );
      expect(forChecker?.viewerIsTarget).toBe(false);

      // A row targeting nobody can never flag any viewer as its target.
      const addHr = await proposeOk(makerToken);
      const makerListAgain = await call('get', REQUESTS_URL, makerToken);
      const addRow = (makerListAgain.body.items as Record<string, unknown>[]).find(
        (item) => item.id === addHr.id,
      );
      expect(addRow?.viewerIsTarget).toBe(false);

      await store.deleteAllForEmployee(target.id);
    });
  });

  describe('update_hr proposals', () => {
    it('files an update proposal as pending with the trimmed fields it was given and no email', async () => {
      const target = await createHrRow('update-create');

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: target.id,
        name: '  Rahmi Wijaya  ',
        position: 'HR Lead',
      });

      expect(response.status).toBe(201);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        type: 'update_hr',
        state: 'pending',
        proposedName: 'Rahmi Wijaya',
        proposedEmail: null,
        proposedPosition: 'HR Lead',
        proposedPhone: null,
        targetEmployeeId: target.id,
        target: { id: target.id, email: target.email, status: 'active' },
        maker: { id: makerId, name: MAKER_NAME, email: makerEmail },
        checker: null,
        decisionNote: null,
        decidedAt: null,
        canDecide: false,
        // The maker is not the target of this update.
        viewerIsTarget: false,
      });
      createdRequestIds.push(response.body.id as string);

      const row = await loadRequest(response.body.id as string);
      expect(row).toMatchObject({
        type: 'update_hr',
        state: 'pending',
        targetEmployeeId: target.id,
        makerEmployeeId: makerId,
        checkerEmployeeId: null,
        proposedName: 'Rahmi Wijaya',
        proposedEmail: null,
        proposedPosition: 'HR Lead',
        proposedPhone: null,
      });
    });

    it('answers 404 NOT_FOUND for an unknown update target and writes nothing', async () => {
      const before = await prisma.hrAccessRequest.count({
        where: { type: 'update_hr' },
      });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: randomUUID(),
        name: 'Anyone',
      });

      expectError(response, 404, 'NOT_FOUND');
      expect(
        await prisma.hrAccessRequest.count({ where: { type: 'update_hr' } }),
      ).toBe(before);
    });

    it('answers 409 CONFLICT for an update target that is not an HR account and writes nothing', async () => {
      const employeeId = await createAccountRow(uniqueEmail('update-plain'));
      const where = { type: 'update_hr' as const, targetEmployeeId: employeeId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: employeeId,
        name: 'Anyone',
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: employeeId } }))?.name,
      ).toBe('Pre-existing Account');
    });

    it('answers 409 CONFLICT for an update target HR account that is already deactivated', async () => {
      const target = await createHrRow('update-inactive', 'deactivated');
      const where = { type: 'update_hr' as const, targetEmployeeId: target.id };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: target.id,
        name: 'Anyone',
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('deactivated');
    });

    it('answers 409 CONFLICT when the maker names their own account as the update target', async () => {
      const where = { type: 'update_hr' as const, makerEmployeeId: makerId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: makerId,
        name: 'Self-promotion',
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: makerId } }))?.name,
      ).toBe(MAKER_NAME);
    });

    it('refuses an update proposal carrying no non-blank field with 400 BAD_REQUEST and writes nothing', async () => {
      const target = await createHrRow('update-no-fields');
      const where = { type: 'update_hr' as const, targetEmployeeId: target.id };
      const before = await prisma.hrAccessRequest.count({ where });

      const noFields = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: target.id,
      });
      expectError(noFields, 400, 'BAD_REQUEST');

      const blankOnly = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        targetEmployeeId: target.id,
        name: '   ',
        position: '',
        phone: '\t',
      });
      expectError(blankOnly, 400, 'BAD_REQUEST');

      const missingTarget = await postJson(REQUESTS_URL, makerToken, {
        type: 'update_hr',
        name: 'Anyone',
      });
      expectError(missingTarget, 400, 'BAD_REQUEST');

      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.name,
      ).toBe('Deactivation Target');
    });

    it('approves: writes exactly the proposed fields and leaves every other column of the target alone', async () => {
      const target = await createHrRow('update-approve');
      const targetToken = await seedSession(target.id, 'hrd');
      const before = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      const id = await proposeUpdate(target.id, {
        name: '  Rahmi Wijaya  ',
        phone: '+62-811-0000-4242',
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {
        note: 'title band approved',
      });

      expect(response.status).toBe(200);
      // An update mints no account, so no one-time password travels.
      expect(Object.keys(response.body).sort()).toEqual([...REQUEST_KEYS].sort());
      expect(response.body).toMatchObject({
        type: 'update_hr',
        state: 'approved',
        targetEmployeeId: target.id,
        proposedName: 'Rahmi Wijaya',
        proposedEmail: null,
        proposedPhone: '+62-811-0000-4242',
        decisionNote: 'title band approved',
        canDecide: false,
        checker: { id: checkerId, name: CHECKER_NAME, email: checkerEmail },
        target: { id: target.id, email: target.email, status: 'active' },
        viewerIsTarget: false,
      });
      expect(typeof response.body.decidedAt).toBe('string');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        decisionNote: 'title band approved',
        targetEmployeeId: target.id,
      });
      expect(row?.decidedAt).not.toBeNull();

      const after = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(after).toMatchObject({
        id: target.id,
        email: target.email,
        name: 'Rahmi Wijaya',
        // The proposal carried no position, so the stored one stays put.
        position: before?.position,
        phone: '+62-811-0000-4242',
        role: 'hrd',
        status: 'active',
        passwordHash: before?.passwordHash,
        mustChangePassword: false,
      });
      // An update never re-addresses an account ...
      expect(after?.email).toBe(before?.email);
      // ... and never drops the target's live sessions the way a reset does.
      expect((await call('get', REQUESTS_URL, targetToken)).status).toBe(200);
      await store.deleteAllForEmployee(target.id);
    });

    it('refuses the approval that would let a checker edit their own account, keeping the proposal pending', async () => {
      const id = await proposeUpdate(checkerId, { name: 'Checker Renamed' });
      const before = await loadRequest(id);
      const checkerBefore = await prisma.employee.findUnique({
        where: { id: checkerId },
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});

      expectError(response, 403, 'FORBIDDEN');
      const after = await loadRequest(id);
      expect(after).toEqual(before);
      expect(after?.state).toBe('pending');
      expect(after?.checkerEmployeeId).toBeNull();
      expect(after?.decidedAt).toBeNull();
      expect(await prisma.employee.findUnique({ where: { id: checkerId } })).toEqual(
        checkerBefore,
      );
      expect(checkerBefore?.name).toBe(CHECKER_NAME);
    });

    it('refuses an approval whose target stopped being an active HR while pending, leaving the proposal untouched', async () => {
      const target = await createHrRow('update-stale');
      const id = await proposeUpdate(target.id, { name: 'Never Applied' });
      const before = await loadRequest(id);

      // Somebody takes the access away out of band, before any checker looks.
      await prisma.employee.update({
        where: { id: target.id },
        data: { status: 'deactivated', updatedAt: new Date() },
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});

      expectError(response, 409, 'CONFLICT');
      expect(await loadRequest(id)).toEqual(before);
      expect((await loadRequest(id))?.state).toBe('pending');
      const targetRow = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(targetRow?.status).toBe('deactivated');
      // The proposed rename never reached the account.
      expect(targetRow?.name).toBe('Deactivation Target');
    });

    it('lets a peer reject and the maker withdraw an update proposal, changing no account field', async () => {
      const kept = await createHrRow('update-reject');
      const rejectedId = await proposeUpdate(kept.id, { name: 'Rejected Rename' });
      const rejected = await postJson(`${REQUESTS_URL}/${rejectedId}/reject`, checkerToken, {
        note: 'org chart still changing',
      });
      expect(rejected.status).toBe(200);
      expect(rejected.body).toMatchObject({
        type: 'update_hr',
        state: 'rejected',
        decisionNote: 'org chart still changing',
        checker: { id: checkerId },
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: kept.id } }))?.name,
      ).toBe('Deactivation Target');

      const cancelled = await createHrRow('update-withdraw');
      const withdrawnId = await proposeUpdate(cancelled.id, { name: 'Cancelled Rename' });
      const withdrawn = await postJson(`${REQUESTS_URL}/${withdrawnId}/withdraw`, makerToken, {});
      expect(withdrawn.status).toBe(200);
      expect(withdrawn.body).toMatchObject({
        type: 'update_hr',
        state: 'withdrawn',
      });

      const approve = await postJson(`${REQUESTS_URL}/${withdrawnId}/approve`, checkerToken, {});
      expectError(approve, 409, 'CONFLICT');
      expect(
        (await prisma.employee.findUnique({ where: { id: cancelled.id } }))?.name,
      ).toBe('Deactivation Target');
    });

    it('marks viewerIsTarget for the target viewing the update row and false for everyone else', async () => {
      const target = await createHrRow('update-viewer');
      const targetToken = await seedSession(target.id, 'hrd');
      const id = await proposeUpdate(target.id, { name: 'Viewed Rename' });

      const asTarget = await call('get', REQUESTS_URL, targetToken);
      expect(asTarget.status).toBe(200);
      const forTarget = (asTarget.body.items as Record<string, unknown>[]).find(
        (item) => item.id === id,
      );
      expect(forTarget?.type).toBe('update_hr');
      expect(forTarget?.viewerIsTarget).toBe(true);

      const asMaker = await call('get', REQUESTS_URL, makerToken);
      const forMaker = (asMaker.body.items as Record<string, unknown>[]).find(
        (item) => item.id === id,
      );
      expect(forMaker?.viewerIsTarget).toBe(false);

      const asChecker = await call('get', REQUESTS_URL, checkerToken);
      const forChecker = (asChecker.body.items as Record<string, unknown>[]).find(
        (item) => item.id === id,
      );
      expect(forChecker?.viewerIsTarget).toBe(false);

      await store.deleteAllForEmployee(target.id);
    });
  });

  describe('reactivate_hr proposals', () => {
    /** Files a `reactivate_hr` proposal and fails loudly when it is refused. */
    const proposeReactivate = async (
      targetId: string,
      token: string = makerToken,
    ): Promise<string> => {
      const response = await postJson(REQUESTS_URL, token, {
        type: 'reactivate_hr',
        targetEmployeeId: targetId,
      });
      if (response.status !== 201) {
        throw new Error(
          `reactivation proposal refused with ${response.status}: ${JSON.stringify(response.body)}`,
        );
      }
      createdRequestIds.push(response.body.id as string);
      return response.body.id as string;
    };

    it('files a reactivation proposal as pending with the deactivated target and no proposed fields', async () => {
      const target = await createHrRow('reactivate-create', 'deactivated');

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reactivate_hr',
        targetEmployeeId: target.id,
      });

      expect(response.status).toBe(201);
      expectRequestShape(response.body);
      expect(response.body).toMatchObject({
        type: 'reactivate_hr',
        state: 'pending',
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
        targetEmployeeId: target.id,
        target: { id: target.id, email: target.email, status: 'deactivated' },
        maker: { id: makerId, name: MAKER_NAME, email: makerEmail },
        checker: null,
        decisionNote: null,
        decidedAt: null,
        canDecide: false,
        // The maker holds an active session, so they can never be the
        // deactivated account this proposal would restore.
        viewerIsTarget: false,
      });
      createdRequestIds.push(response.body.id as string);

      const row = await loadRequest(response.body.id as string);
      expect(row).toMatchObject({
        type: 'reactivate_hr',
        state: 'pending',
        targetEmployeeId: target.id,
        makerEmployeeId: makerId,
        checkerEmployeeId: null,
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
      });
    });

    it('answers 404 NOT_FOUND for an unknown reactivation target and writes nothing', async () => {
      const before = await prisma.hrAccessRequest.count({
        where: { type: 'reactivate_hr' },
      });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reactivate_hr',
        targetEmployeeId: randomUUID(),
      });

      expectError(response, 404, 'NOT_FOUND');
      expect(
        await prisma.hrAccessRequest.count({ where: { type: 'reactivate_hr' } }),
      ).toBe(before);
    });

    it('answers 409 CONFLICT for a target HR account that is still active and writes nothing', async () => {
      const target = await createHrRow('reactivate-active');
      const where = { type: 'reactivate_hr' as const, targetEmployeeId: target.id };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reactivate_hr',
        targetEmployeeId: target.id,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('active');
    });

    it('answers 409 CONFLICT for a target that is not an HR account and writes nothing', async () => {
      const employeeId = await createAccountRow(uniqueEmail('reactivate-plain'));
      const where = { type: 'reactivate_hr' as const, targetEmployeeId: employeeId };
      const before = await prisma.hrAccessRequest.count({ where });

      const response = await postJson(REQUESTS_URL, makerToken, {
        type: 'reactivate_hr',
        targetEmployeeId: employeeId,
      });

      expectError(response, 409, 'CONFLICT');
      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
      expect(
        (await prisma.employee.findUnique({ where: { id: employeeId } }))?.role,
      ).toBe('employee');
    });

    it('refuses a body missing the target with 400 BAD_REQUEST and writes nothing', async () => {
      const where = { type: 'reactivate_hr' as const };
      const before = await prisma.hrAccessRequest.count({ where });

      const missing = await postJson(REQUESTS_URL, makerToken, {
        type: 'reactivate_hr',
      });
      expectError(missing, 400, 'BAD_REQUEST');

      const nonUuid = await postJson(REQUESTS_URL, makerToken, {
        type: 'reactivate_hr',
        targetEmployeeId: 'not-a-uuid',
      });
      expectError(nonUuid, 400, 'BAD_REQUEST');

      expect(await prisma.hrAccessRequest.count({ where })).toBe(before);
    });

    it('approves: restores the target to active and mints nothing', async () => {
      const target = await createHrRow('reactivate-approve', 'deactivated');
      const before = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      const id = await proposeReactivate(target.id);
      const beforeCalls = hook.calls.length;

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {
        note: 'cover restored',
      });

      expect(response.status).toBe(200);
      // A reactivation mints no account, so no one-time password travels.
      expect(Object.keys(response.body).sort()).toEqual([...REQUEST_KEYS].sort());
      expect(response.body).not.toHaveProperty('temporaryPassword');
      expect(response.body).toMatchObject({
        type: 'reactivate_hr',
        state: 'approved',
        targetEmployeeId: target.id,
        decisionNote: 'cover restored',
        canDecide: false,
        checker: { id: checkerId, name: CHECKER_NAME, email: checkerEmail },
        target: { id: target.id, email: target.email, status: 'active' },
        viewerIsTarget: false,
      });
      expect(typeof response.body.decidedAt).toBe('string');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        decisionNote: 'cover restored',
        targetEmployeeId: target.id,
      });
      expect(row?.decidedAt).not.toBeNull();

      // Only the status moved: every other column of the account stays put.
      const after = await prisma.employee.findUnique({
        where: { id: target.id },
      });
      expect(after).toMatchObject({
        id: target.id,
        email: target.email,
        role: 'hrd',
        status: 'active',
        passwordHash: before?.passwordHash,
        mustChangePassword: before?.mustChangePassword,
      });

      // Reactivation restores the right to sign in; it mints no session.
      expect(await store.deleteAllForEmployee(target.id)).toBe(0);
      // It ends nothing either: attendance is never told anything.
      expect(hook.calls.slice(beforeCalls)).toEqual([]);
      // The checker who decided stays signed in.
      expect((await call('get', REQUESTS_URL, checkerToken)).status).toBe(200);
    });

    it('refuses an approval whose target was reactivated meanwhile, leaving the proposal untouched', async () => {
      const target = await createHrRow('reactivate-stale', 'deactivated');
      const id = await proposeReactivate(target.id);
      const before = await loadRequest(id);

      // Somebody restores the access out of band, before any checker looks.
      await prisma.employee.update({
        where: { id: target.id },
        data: { status: 'active', updatedAt: new Date() },
      });

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {});

      expectError(response, 409, 'CONFLICT');
      expect(await loadRequest(id)).toEqual(before);
      const after = await loadRequest(id);
      expect(after?.state).toBe('pending');
      expect(after?.checkerEmployeeId).toBeNull();
      expect(after?.decidedAt).toBeNull();
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('active');
    });

    it('refuses a maker approving their own reactivation with 403 and keeps it pending', async () => {
      const target = await createHrRow('reactivate-four-eyes', 'deactivated');
      const id = await proposeReactivate(target.id);
      const before = await loadRequest(id);

      const response = await postJson(`${REQUESTS_URL}/${id}/approve`, makerToken, {});

      expectError(response, 403, 'FORBIDDEN');
      expect(await loadRequest(id)).toEqual(before);
      const after = await loadRequest(id);
      expect(after?.state).toBe('pending');
      expect(after?.checkerEmployeeId).toBeNull();
      expect(after?.decidedAt).toBeNull();
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('deactivated');
    });

    it('lets exactly one of two simultaneous approvals decide, with a single transition', async () => {
      const target = await createHrRow('reactivate-race', 'deactivated');
      const id = await proposeReactivate(target.id);
      const beforeCalls = hook.calls.length;

      const [first, second] = await Promise.all([
        postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {}),
        postJson(`${REQUESTS_URL}/${id}/approve`, checkerToken, {}),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      const winner = first.status === 200 ? first : second;
      const loser = first.status === 200 ? second : first;
      expect(Object.keys(winner.body).sort()).toEqual([...REQUEST_KEYS].sort());
      expectError(loser, 409, 'CONFLICT');

      const row = await loadRequest(id);
      expect(row).toMatchObject({
        state: 'approved',
        checkerEmployeeId: checkerId,
        targetEmployeeId: target.id,
      });
      expect(row?.decidedAt).not.toBeNull();
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('active');

      // Nothing else moved: no second transition, no session, no notification.
      expect(hook.calls.slice(beforeCalls)).toEqual([]);
      expect(await store.deleteAllForEmployee(target.id)).toBe(0);
    });

    it('lets a peer reject and the maker withdraw a reactivation proposal, leaving the account deactivated', async () => {
      const kept = await createHrRow('reactivate-reject', 'deactivated');
      const rejectedId = await proposeReactivate(kept.id);
      const rejected = await postJson(`${REQUESTS_URL}/${rejectedId}/reject`, checkerToken, {
        note: 'cover still disputed',
      });
      expect(rejected.status).toBe(200);
      expect(rejected.body).toMatchObject({
        type: 'reactivate_hr',
        state: 'rejected',
        decisionNote: 'cover still disputed',
        checker: { id: checkerId },
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: kept.id } }))?.status,
      ).toBe('deactivated');

      const cancelled = await createHrRow('reactivate-withdraw', 'deactivated');
      const withdrawnId = await proposeReactivate(cancelled.id);
      const withdrawn = await postJson(`${REQUESTS_URL}/${withdrawnId}/withdraw`, makerToken, {});
      expect(withdrawn.status).toBe(200);
      expect(withdrawn.body).toMatchObject({
        type: 'reactivate_hr',
        state: 'withdrawn',
      });
      expect(
        (await prisma.employee.findUnique({ where: { id: cancelled.id } }))?.status,
      ).toBe('deactivated');
    });

    it('answers 401 without a session and 403 for an employee-role session on create', async () => {
      const target = await createHrRow('reactivate-guards', 'deactivated');
      const body = { type: 'reactivate_hr', targetEmployeeId: target.id };

      expectError(await postJson(REQUESTS_URL, undefined, body), 401, 'AUTH_REQUIRED');
      expectError(await postJson(REQUESTS_URL, employeeToken, body), 403, 'FORBIDDEN');
      expect(
        (await prisma.employee.findUnique({ where: { id: target.id } }))?.status,
      ).toBe('deactivated');
    });
  });

  describe('route protection', () => {
    const routes = (id: string): { method: 'get' | 'post'; path: string }[] => [
      { method: 'get', path: REQUESTS_URL },
      { method: 'post', path: REQUESTS_URL },
      { method: 'post', path: `${REQUESTS_URL}/${id}/approve` },
      { method: 'post', path: `${REQUESTS_URL}/${id}/reject` },
      { method: 'post', path: `${REQUESTS_URL}/${id}/withdraw` },
    ];

    const callRoute = async (
      route: { method: 'get' | 'post'; path: string },
      token?: string,
    ): Promise<request.Response> =>
      route.method === 'get'
        ? call('get', route.path, token)
        : call('post', route.path, token).send({});

    it('answers 401 AUTH_REQUIRED on every proposal route without a session', async () => {
      const id = randomUUID();

      for (const route of routes(id)) {
        const response = await callRoute(route);
        expectError(response, 401, 'AUTH_REQUIRED');
      }
    });

    it('answers 403 FORBIDDEN on every proposal route for an employee-role session', async () => {
      const id = randomUUID();

      for (const route of routes(id)) {
        const response = await callRoute(route, employeeToken);
        expectError(response, 403, 'FORBIDDEN');
      }
    });

    it('keeps the HRD callers signed in across proposal calls', async () => {
      expect((await call('get', REQUESTS_URL, makerToken)).status).toBe(200);
      expect((await call('get', REQUESTS_URL, checkerToken)).status).toBe(200);
    });
  });
});
