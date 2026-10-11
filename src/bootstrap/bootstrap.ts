import argon2 from 'argon2';
import { PASSWORD_HASH_OPTIONS, findPasswordProblem } from '../auth/password.policy';
import { PrismaClient } from '../generated/prisma';

/**
 * One-shot first-deploy bootstrap: when the main database holds zero rows
 * with role='hrd', create the configured base HR accounts; otherwise this is
 * a harmless no-op skip. Exit codes: 0 created or skipped, 1 runtime failure
 * (rolled back), 2 configuration/usage error.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const GROUP_FIELDS = [
  'EMAIL',
  'NAME',
  'POSITION',
  'PHONE',
  'INITIAL_PASSWORD',
] as const;
const MAX_CONNECT_ATTEMPTS = 10;
const CONNECT_RETRY_DELAY_MS = 500;

/** Structural slice of the Prisma client the runner needs (testable without
 * the generated client's full surface). */
export interface BootstrapPrisma {
  employee: {
    count(args: { where: { role: 'hrd' } }): Promise<number>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: BootstrapPrisma) => Promise<T>): Promise<T>;
}

export interface BootstrapDeps {
  prisma: BootstrapPrisma;
  env: NodeJS.ProcessEnv;
  log(line: string): void;
}

export interface BootstrapAccount {
  email: string;
  name: string;
  position: string;
  phone: string;
  initialPassword: string;
}

/**
 * Reads contiguous indexed groups `BOOTSTRAP_HR_<n>_*` starting at 1. The
 * first index without a non-empty EMAIL ends the list; a later index cannot be
 * reached (contiguity is part of the config contract). Never logs anything it
 * reads — passwords only travel from here into argon2.
 */
export function readAccountsFromEnv(env: NodeJS.ProcessEnv): BootstrapAccount[] {
  const accounts: BootstrapAccount[] = [];
  for (let index = 1; ; index += 1) {
    const prefix = `BOOTSTRAP_HR_${index}_`;
    const email = env[`${prefix}EMAIL`]?.trim();
    if (!email) {
      return accounts;
    }
    const missing = GROUP_FIELDS.filter(
      (field) => field !== 'EMAIL' && !env[`${prefix}${field}`]?.trim(),
    );
    if (missing.length > 0) {
      throw new ConfigError(
        `${prefix}… is incomplete: missing ${missing
          .map((field) => `${prefix}${field}`)
          .join(', ')}`,
      );
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new ConfigError(`${prefix}EMAIL is not a valid email address`);
    }
    const initialPassword = env[`${prefix}INITIAL_PASSWORD`] as string;
    if (findPasswordProblem(initialPassword)) {
      throw new ConfigError(
        `${prefix}INITIAL_PASSWORD does not meet the password policy (value not shown)`,
      );
    }
    accounts.push({
      email: email.toLowerCase(),
      name: (env[`${prefix}NAME`] as string).trim(),
      position: (env[`${prefix}POSITION`] as string).trim(),
      phone: (env[`${prefix}PHONE`] as string).trim(),
      initialPassword,
    });
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prismaErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

function isConnectError(error: unknown): boolean {
  const code = prismaErrorCode(error);
  if (code === 'P1001' || code === 'P1002' || code === 'P1003') {
    return true;
  }
  const sysCode =
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  return (
    sysCode === 'ECONNREFUSED' ||
    sysCode === 'EHOSTUNREACH' ||
    sysCode === 'ENOTFOUND'
  );
}

/** Bounded wait for DB reachability (compose start race). */
async function countWithRetry(prisma: BootstrapPrisma): Promise<number> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.employee.count({ where: { role: 'hrd' } });
    } catch (error) {
      lastError = error;
      if (!isConnectError(error)) {
        throw error;
      }
      await sleep(CONNECT_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

/**
 * Runs the bootstrap contract and returns the process exit code. Guard-first:
 * when HR accounts already exist the config is never read, so an
 * already-deployed environment needs zero bootstrap configuration.
 */
export async function runBootstrap(deps: BootstrapDeps): Promise<number> {
  const { prisma, env, log } = deps;
  try {
    const existing = await countWithRetry(prisma);
    if (existing >= 1) {
      log(`bootstrap: skipped — ${existing} HR account(s) already exist`);
      return 0;
    }

    let accounts: BootstrapAccount[];
    try {
      accounts = readAccountsFromEnv(env);
    } catch (error) {
      log(`bootstrap: error — ${(error as Error).message}`);
      log(
        'bootstrap: error — no valid BOOTSTRAP_HR_<n>_* configuration found; nothing created (see sources/infra/.env.example)',
      );
      return 2;
    }
    if (accounts.length === 0) {
      log(
        'bootstrap: error — empty database and no BOOTSTRAP_HR_<n>_* configuration found; nothing created (see sources/infra/.env.example)',
      );
      return 2;
    }

    log(
      `bootstrap: no HR accounts found — running first-deploy bootstrap (${accounts.length} configured)`,
    );

    const createdEmails: string[] = [];
    const skipped = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to close the double-run race.
      const count = await tx.employee.count({ where: { role: 'hrd' } });
      if (count >= 1) {
        return count;
      }
      for (const account of accounts) {
        const passwordHash = await argon2.hash(
          account.initialPassword,
          PASSWORD_HASH_OPTIONS,
        );
        await tx.employee.create({
          data: {
            name: account.name,
            email: account.email,
            position: account.position,
            phone: account.phone,
            role: 'hrd',
            status: 'active',
            passwordHash,
            mustChangePassword: true,
          },
        });
        createdEmails.push(account.email);
      }
      return -1;
    });

    if (skipped >= 0) {
      log(`bootstrap: skipped — ${skipped} HR account(s) already exist`);
      return 0;
    }
    for (const email of createdEmails) {
      log(`bootstrap: created ${email} (role=hrd, forced password change)`);
    }
    log(`bootstrap: done — ${createdEmails.length} account(s) created`);
    return 0;
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === 'P2021' || code === 'P2022') {
      log(
        'bootstrap: error — database schema is missing; run `bash scripts/migrate.sh`, then re-run bootstrap-seeder (nothing created)',
      );
      return 2;
    }
    if (isConnectError(error)) {
      log(
        'bootstrap: error — cannot reach the database after waiting; check that postgres-main is up and DATABASE_URL_MAIN is correct (nothing created)',
      );
      return 2;
    }
    log(
      `bootstrap: error — ${error instanceof Error ? error.message : String(error)}; transaction rolled back, no rows created`,
    );
    return 1;
  }
}

export async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    return await runBootstrap({
      prisma: prisma as unknown as BootstrapPrisma,
      env: process.env,
      log: (line) => console.log(line),
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(
        `bootstrap: unexpected failure — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exitCode = 1;
    });
}
