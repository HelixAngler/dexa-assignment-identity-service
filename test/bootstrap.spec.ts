import { PrismaClient } from '../src/generated/prisma';
import {
  type BootstrapPrisma,
  readAccountsFromEnv,
  runBootstrap,
} from '../src/bootstrap/bootstrap';

type FakeEmployee = {
  count: jest.Mock;
  create: jest.Mock;
};

function fakePrisma(opts: { hrCount: number; failCreateAt?: number }) {
  const created: Array<Record<string, unknown>> = [];
  const employee: FakeEmployee = {
    count: jest.fn().mockResolvedValue(opts.hrCount),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (opts.failCreateAt !== undefined && created.length >= opts.failCreateAt) {
        throw new Error('simulated create failure');
      }
      created.push({ ...data });
      return { id: `generated-${created.length}`, ...data };
    }),
  };
  const prisma = {
    employee,
    // Mirrors a real transaction: on any throw inside fn, roll back writes.
    $transaction: async <T>(fn: (tx: BootstrapPrisma) => Promise<T>): Promise<T> => {
      const snapshot = created.length;
      try {
        return await fn(prisma as unknown as BootstrapPrisma);
      } catch (error) {
        created.length = snapshot;
        throw error;
      }
    },
  } as unknown as BootstrapPrisma;
  return { prisma, created, employee };
}

function captureLog() {
  const lines: string[] = [];
  return { lines, log: (line: string) => lines.push(line) };
}

const CONFIG = {
  BOOTSTRAP_HR_1_EMAIL: 'boot.one@e2e.test',
  BOOTSTRAP_HR_1_NAME: 'Boot One',
  BOOTSTRAP_HR_1_POSITION: 'HR Manager',
  BOOTSTRAP_HR_1_PHONE: '+62-811-0000-0901',
  BOOTSTRAP_HR_1_INITIAL_PASSWORD: 'BootSecret!003',
  BOOTSTRAP_HR_2_EMAIL: 'boot.two@e2e.test',
  BOOTSTRAP_HR_2_NAME: 'Boot Two',
  BOOTSTRAP_HR_2_POSITION: 'HR Staff',
  BOOTSTRAP_HR_2_PHONE: '+62-811-0000-0902',
  BOOTSTRAP_HR_2_INITIAL_PASSWORD: 'AlsoBootSecret!003',
};

describe('first-deploy bootstrap runner', () => {
  it('creates every configured HR account when the database has none', async () => {
    const { prisma, created } = fakePrisma({ hrCount: 0 });
    const { lines, log } = captureLog();

    const code = await runBootstrap({ prisma, env: { ...CONFIG }, log });

    expect(code).toBe(0);
    expect(created).toHaveLength(2);
    for (const row of created) {
      expect(row.role).toBe('hrd');
      expect(row.status).toBe('active');
      expect(row.mustChangePassword).toBe(true);
      expect(String(row.passwordHash)).toMatch(/^\$argon2/);
      expect(String(row.passwordHash)).not.toContain('BootSecret');
    }
    expect(created.map((r) => r.email)).toEqual([
      'boot.one@e2e.test',
      'boot.two@e2e.test',
    ]);
    const output = lines.join('\n');
    expect(output).toContain(
      'bootstrap: created boot.one@e2e.test (role=hrd, forced password change)',
    );
    expect(output).toContain(
      'bootstrap: created boot.two@e2e.test (role=hrd, forced password change)',
    );
    expect(output).toContain('bootstrap: done — 2 account(s) created');
  });

  it('never logs initial passwords or hash material (SC-002)', async () => {
    const { prisma } = fakePrisma({ hrCount: 0 });
    const { lines, log } = captureLog();

    await runBootstrap({ prisma, env: { ...CONFIG }, log });

    const output = lines.join('\n');
    expect(output).not.toContain('BootSecret');
    expect(output).not.toContain('AlsoBootSecret');
    expect(output).not.toContain('$argon2');
    expect(output).not.toMatch(/\$2[aby]\$/);
  });

  it('skips without consulting config when HR accounts already exist', async () => {
    const { prisma, employee } = fakePrisma({ hrCount: 4 });
    const { lines, log } = captureLog();

    const code = await runBootstrap({ prisma, env: {}, log });

    expect(code).toBe(0);
    expect(employee.create).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain(
      'bootstrap: skipped — 4 HR account(s) already exist',
    );
  });

  it('exits 2 with no rows when no configuration is present on an empty DB', async () => {
    const { prisma, created, employee } = fakePrisma({ hrCount: 0 });
    const { lines, log } = captureLog();

    const code = await runBootstrap({ prisma, env: {}, log });

    expect(code).toBe(2);
    expect(created).toHaveLength(0);
    expect(employee.create).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain('BOOTSTRAP_HR');
  });

  it('exits 2 when an index is missing a required field', async () => {
    const { prisma, created } = fakePrisma({ hrCount: 0 });
    const { log } = captureLog();
    const incomplete: Record<string, string> = { ...CONFIG };
    delete incomplete.BOOTSTRAP_HR_1_PHONE;

    const code = await runBootstrap({ prisma, env: incomplete, log });

    expect(code).toBe(2);
    expect(created).toHaveLength(0);
  });

  it('exits 2 on a malformed email and echoes nothing secret', async () => {
    const { prisma, created } = fakePrisma({ hrCount: 0 });
    const { lines, log } = captureLog();

    const code = await runBootstrap({
      prisma,
      env: { ...CONFIG, BOOTSTRAP_HR_1_EMAIL: 'not-an-email' },
      log,
    });

    expect(code).toBe(2);
    expect(created).toHaveLength(0);
    expect(lines.join('\n')).not.toContain('BootSecret');
  });

  it('re-checks the guard inside the transaction (double-run race)', async () => {
    const { prisma, created, employee } = fakePrisma({ hrCount: 0 });
    // First count (pre-transaction guard) sees an empty DB; the in-transaction
    // re-check sees a concurrent bootstrap already finished.
    let calls = 0;
    employee.count.mockImplementation(async () => (calls++ === 0 ? 0 : 5));
    const { lines, log } = captureLog();

    const code = await runBootstrap({ prisma, env: { ...CONFIG }, log });

    expect(code).toBe(0);
    expect(created).toHaveLength(0);
    expect(employee.create).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain(
      'bootstrap: skipped — 5 HR account(s) already exist',
    );
  });

  it('exits 1 and rolls back when a create fails mid-way', async () => {
    const { prisma, created } = fakePrisma({ hrCount: 0, failCreateAt: 1 });
    const { lines, log } = captureLog();

    const code = await runBootstrap({ prisma, env: { ...CONFIG }, log });

    expect(code).toBe(1);
    expect(created).toHaveLength(0);
    expect(lines.join('\n')).not.toContain('bootstrap: done');
    expect(lines.join('\n')).not.toContain('simulated create failure:');
  });

  it('readAccountsFromEnv stops at the first index without an email', () => {
    const accounts = readAccountsFromEnv({
      ...CONFIG,
      // Index 3 exists but has no EMAIL: an empty/absent email ends the
      // contiguous list rather than being treated as an error.
      BOOTSTRAP_HR_3_NAME: 'Boot Three',
      BOOTSTRAP_HR_3_POSITION: 'HR Staff',
      BOOTSTRAP_HR_3_PHONE: '+62-811-0000-0903',
      BOOTSTRAP_HR_3_INITIAL_PASSWORD: 'ThirdBootSecret!003',
    });
    expect(accounts).toHaveLength(2);
  });

  it('never mutates the live database (skip when HRDs exist, exit 2 when empty)', async () => {
    const prisma = new PrismaClient() as unknown as BootstrapPrisma;
    const { lines, log } = captureLog();
    try {
      const code = await runBootstrap({ prisma, env: {}, log });
      expect([0, 2]).toContain(code);
      if (code === 0) {
        expect(lines.join('\n')).toMatch(
          /skipped — \d+ HR account\(s\) already exist/,
        );
      }
    } finally {
      await (prisma as unknown as PrismaClient).$disconnect();
    }
  });
});
