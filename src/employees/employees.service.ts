import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { SessionStore } from '../auth/session.store';
import { PASSWORD_HASH_OPTIONS } from '../auth/password.policy';
import { AppException } from '../common/app.exception';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '../generated/prisma';
import { CloseOpenClient } from './close-open.client';
import { generateTemporaryPassword } from './temp-password';

/** The fields every employee-management route answers with. */
export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  position: string;
  status: 'active' | 'deactivated';
  /**
   * Which of the two roles the account holds. Carried on every answer so a
   * caller showing the directory can tell an HR account from a plain employee
   * without a second round trip or a guess from the address.
   */
  role: 'employee' | 'hrd';
}

/**
 * One account's full editable record: the directory summary plus the phone
 * number, which the edit screens need to prefill and the list answer leaves
 * out to keep directory rows lean.
 */
export interface EmployeeRecord extends EmployeeSummary {
  phone: string;
}

/** Fields an HRD admin supplies when an account is created. */
export interface CreateEmployeeInput {
  name: string;
  email: string;
  position: string;
  phone: string;
  photoObjectKey: string | null;
  /**
   * Role the new account is minted with. Optional so every existing caller —
   * the employee-create route and the flows behind it — keeps creating plain
   * employees untouched; the HR-approval path passes 'hrd' because an approved
   * proposal is exactly that, and nothing else may ever ask for it.
   */
  role?: 'employee' | 'hrd';
}

/** The editable subset an HRD admin may change after creation. */
export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  position?: string;
  phone?: string;
  photoObjectKey?: string | null;
}

/** What create answers with: the id plus the password shown exactly once. */
export interface CreateEmployeeResult {
  id: string;
  temporaryPassword: string;
  mustChangePassword: true;
}

/** Narrow selection that keeps credential material out of every response. */
const SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  position: true,
  status: true,
  role: true,
} as const;

/** True for the database's "a unique constraint rejected this write" answer. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Employee records as HRD maintains them.
 *
 * Reads and writes here are plain administration: no change event is emitted
 * for anything this service does, because the admin already knows what they
 * changed and the change banner is aimed at employees editing themselves.
 *
 * Password material follows one rule everywhere — generate the one-time value,
 * hash it with the shared argon2 parameters, hand the plaintext back to the
 * caller exactly once and never store or return it again.
 *
 * Deactivation is deliberately staged: the row is committed first, then every
 * live session of that employee is dropped, and only then is the attendance
 * service asked to close a session the employee may have left open. The last
 * step is best effort with a bounded number of retries — an attendance
 * service that is down must not roll back or fail an already-committed
 * deactivation, so any exhaustion of attempts is logged and swallowed.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionStore,
    private readonly closeOpen: CloseOpenClient,
  ) {}

  /** The directory, alphabetically by name with the address as tiebreak. */
  async list(): Promise<EmployeeSummary[]> {
    return this.prisma.employee.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: SUMMARY_SELECT,
    });
  }

  /**
   * One account by id, phone included, for the screens that edit a row.
   * An unknown id answers 404 rather than an empty body, so a caller can
   * tell "gone" from "not loaded" without guessing.
   */
  async getById(id: string): Promise<EmployeeRecord> {
    const row = await this.prisma.employee.findUnique({
      where: { id },
      select: { ...SUMMARY_SELECT, phone: true },
    });
    if (row === null) {
      throw new AppException(404, 'NOT_FOUND');
    }
    return row;
  }

  /**
   * Creates an account on a brand-new address together with its one-time
   * password. The uniqueness probe and the insert share one transaction, so a
   * losing race either sees the winner's row or trips the unique index —
   * never a half-written row behind a 409.
   *
   * A caller that already holds a transaction — an approval decision that has
   * to mint the account atomically with its own state flip — passes it in, and
   * the account then joins that transaction: decision aborts, account is
   * rolled back with it; decision commits, both land together.
   */
  async create(
    input: CreateEmployeeInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CreateEmployeeResult> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(
      temporaryPassword,
      PASSWORD_HASH_OPTIONS,
    );

    try {
      const employee = await this.provision(input, passwordHash, tx);
      return {
        id: employee.id,
        temporaryPassword,
        mustChangePassword: true,
      };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new AppException(409, 'EMAIL_TAKEN');
      }
      throw error;
    }
  }

  /**
   * Probe-then-insert on one client: the caller's transaction when one is
   * supplied, otherwise a transaction opened for the pair. The two steps must
   * be decided against the same state of the directory — that is the entire
   * reason they travel together.
   */
  private async provision(
    input: CreateEmployeeInput,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string }> {
    const insert = async (client: Prisma.TransactionClient) => {
      const existing = await client.employee.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new AppException(409, 'EMAIL_TAKEN');
      }
      return client.employee.create({
        data: {
          name: input.name,
          email: input.email,
          position: input.position,
          phone: input.phone,
          photoObjectKey: input.photoObjectKey,
          role: input.role ?? 'employee',
          status: 'active',
          passwordHash,
          mustChangePassword: true,
        },
        select: { id: true },
      });
    };
    return tx ? insert(tx) : this.prisma.$transaction(insert);
  }

  /**
   * Applies the editable fields an admin sent. Keys outside that set are
   * dropped by the caller before this runs, so a status change can only go
   * through the status route (where it also revokes sessions) and credentials
   * can only change through the reset route.
   */
  async update(
    id: string,
    patch: UpdateEmployeeInput,
  ): Promise<EmployeeSummary> {
    const current = await this.prisma.employee.findUnique({
      where: { id },
      select: SUMMARY_SELECT,
    });
    if (!current) {
      throw new AppException(404, 'NOT_FOUND');
    }
    // WHY: a console edit of an HR account would sidestep maker-checker —
    // any HR admin could rename or re-address a peer (or themselves) without
    // a proposal. HR accounts are only reachable through the approval flow.
    this.refuseHrdTarget(current);

    const data: Prisma.EmployeeUpdateInput = {};
    if (patch.name !== undefined) {
      data.name = patch.name;
    }
    if (patch.email !== undefined) {
      data.email = patch.email;
    }
    if (patch.position !== undefined) {
      data.position = patch.position;
    }
    if (patch.phone !== undefined) {
      data.phone = patch.phone;
    }
    if (patch.photoObjectKey !== undefined) {
      data.photoObjectKey = patch.photoObjectKey;
    }

    if (Object.keys(data).length === 0) {
      return current;
    }
    data.updatedAt = new Date();

    try {
      return await this.prisma.employee.update({
        where: { id },
        data,
        select: SUMMARY_SELECT,
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new AppException(409, 'EMAIL_TAKEN');
      }
      throw error;
    }
  }

  /**
   * Issues a replacement one-time password. The row is rewritten first and
   * every session the employee still holds is dropped second, so the old
   * password stops working on the very next request while the admin is still
   * holding the new one.
   */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) {
      throw new AppException(404, 'NOT_FOUND');
    }
    // WHY: resetting an HR account's password out of band would hand its
    // access to whoever holds the console — exactly the power maker-checker
    // exists to gate. Resetting an HR account requires an approved proposal.
    this.refuseHrdTarget(existing);

    const temporaryPassword = await this.mintTemporaryPassword(id);
    await this.sessions.deleteAllForEmployee(id);

    return { temporaryPassword };
  }

  /**
   * Mints a replacement one-time password and writes it to the account row,
   * returning the plaintext exactly once. The generate-hash-write triple runs
   * on the caller's transaction when one is supplied — the maker-checker
   * approval flow mints the credential atomically with its own decision — and
   * on the shared pool otherwise.
   *
   * No existence or role check happens here on purpose: public callers probe
   * and guard before they get here, and the approval flow calls this for an
   * HR row deliberately, under the proposal's own rules.
   */
  async mintTemporaryPassword(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(
      temporaryPassword,
      PASSWORD_HASH_OPTIONS,
    );
    const run = async (client: Prisma.TransactionClient) => {
      await client.employee.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
          updatedAt: new Date(),
        },
      });
    };
    await (tx ? run(tx) : run(this.prisma));
    return temporaryPassword;
  }

  /**
   * Drops every live session an account holds without touching its row. The
   * password-reset approval runs this after its transaction commits: a reset
   * must cut existing sessions exactly like {@link resetPassword} does, but
   * must never flip the account's status or tell attendance anything the way
   * {@link finishDeactivation} does.
   */
  async revokeSessions(id: string): Promise<void> {
    await this.sessions.deleteAllForEmployee(id);
  }

  /**
   * Flips an account between the two states it may hold. Deactivation runs in
   * a fixed order — commit the row, revoke every session, then notify the
   * attendance service — so a session can never outlive the row it was issued
   * for, and the notification only ever sees an already-deactivated account.
   * The notification itself is retried with growing delays against a
   * per-attempt timeout; when it still fails, the failure is logged and this
   * method answers 200 regardless, because the state change it was asked for
   * has already happened.
   */
  async setStatus(
    id: string,
    status: 'active' | 'deactivated',
  ): Promise<EmployeeSummary> {
    const current = await this.prisma.employee.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!current) {
      throw new AppException(404, 'NOT_FOUND');
    }
    // WHY: flipping an HR account's status from the console would remove or
    // restore a peer's access with no proposal, no checker and no audit row —
    // the exact side door maker-checker closes. HR status only moves through
    // an approved deactivate_hr proposal.
    this.refuseHrdTarget(current);

    const employee = await this.applyStatus(id, status);

    if (status === 'deactivated') {
      await this.finishDeactivation(id);
    }

    return employee;
  }

  /**
   * Shared refusal behind every public management route: an HR account may
   * only be changed through the maker-checker approval flow, never by direct
   * administration. Internal primitives ({@link create}, {@link applyStatus},
   * {@link mintTemporaryPassword}, …) deliberately carry no such check — the
   * approval flow calls them for HR rows on purpose, under the proposal's own
   * guarded rules.
   */
  private refuseHrdTarget(target: { role: 'employee' | 'hrd' }): void {
    if (target.role === 'hrd') {
      throw new AppException(403, 'FORBIDDEN');
    }
  }

  /**
   * The row half of a status change: look the account up (an id no row carries
   * answers 404) and flip the column on the caller's client — its open
   * transaction when one is supplied, the shared pool otherwise. Nothing else
   * happens here on purpose: sessions and attendance may only be touched once
   * the flip is durably committed, which is what {@link finishDeactivation}
   * is for. A caller that supplies a transaction therefore commits the row
   * together with its own work and runs the effects side itself afterwards.
   */
  async applyStatus(
    id: string,
    status: 'active' | 'deactivated',
    tx?: Prisma.TransactionClient,
  ): Promise<EmployeeSummary> {
    const run = async (client: Prisma.TransactionClient) => {
      const existing = await client.employee.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) {
        throw new AppException(404, 'NOT_FOUND');
      }
      return client.employee.update({
        where: { id },
        data: { status, updatedAt: new Date() },
        select: SUMMARY_SELECT,
      });
    };
    return tx ? run(tx) : run(this.prisma);
  }

  /**
   * The effects half of a deactivation, run only once the row change has
   * committed: every session the employee holds is dropped, then the attendance
   * service is asked to close a session the employee may have left open. The
   * notification is best effort with a bounded number of retries — a peer that
   * is down must not undo a deactivation that already happened, so exhausting
   * the attempts is logged and swallowed.
   */
  async finishDeactivation(id: string): Promise<void> {
    await this.sessions.deleteAllForEmployee(id);
    await this.closeOpen.notifyEmployeeDeactivated(id);
  }
}
