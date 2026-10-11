import { Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception';
import { PrismaService } from '../common/prisma.service';
import { EmployeesService } from '../employees/employees.service';
import type {
  HrAccessRequestState,
  HrAccessRequestType,
  Prisma,
} from '../generated/prisma';
import {
  HrAccessListFilter,
  HrAccessRepository,
  HrAccessRequestWithActors,
} from './hr-access.repository';

/**
 * Fixed Postgres advisory-lock key taken by every decision that counts HR
 * accounts. One constant key means two such decisions — on any connection, in
 * any process — can never count at the same moment, so neither can observe a
 * world the other is about to change.
 */
const ACTIVE_HR_COUNT_LOCK_KEY = 727_003;

/**
 * What a route may ask a maker to file: the profile fields of an `add_hr`
 * proposal; the target account of a `deactivate_hr`, `reactivate_hr` or
 * `reset_password` one; or the target account plus the non-null profile
 * fields of an `update_hr` one.
 */
export type CreateProposalInput =
  | {
      type: 'add_hr';
      name: string;
      email: string;
      position: string;
      phone: string;
    }
  | { type: 'deactivate_hr'; targetEmployeeId: string }
  | { type: 'reactivate_hr'; targetEmployeeId: string }
  | { type: 'reset_password'; targetEmployeeId: string }
  | {
      type: 'update_hr';
      targetEmployeeId: string;
      name?: string;
      position?: string;
      phone?: string;
    };

/** The actor snapshots every proposal answer carries. */
export interface ActorView {
  id: string;
  name: string;
  email: string;
}

/** The target snapshot, only ever set for a deactivation, reactivation, reset or update proposal. */
export interface TargetView {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'deactivated';
}

/**
 * The `HrAccessRequest` shape every proposal route answers with. Dates travel
 * as ISO-8601 strings; `canDecide` and `viewerIsTarget` are server-computed
 * display hints (viewer ≠ maker and still pending; the row names the viewer
 * as its target) — every route re-checks the real rules regardless of them.
 */
export interface HrAccessRequestView {
  id: string;
  type: HrAccessRequestType;
  state: HrAccessRequestState;
  proposedName: string | null;
  proposedEmail: string | null;
  proposedPosition: string | null;
  proposedPhone: string | null;
  targetEmployeeId: string | null;
  target: TargetView | null;
  maker: ActorView;
  checker: ActorView | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canDecide: boolean;
  /** True when this viewer is the account the proposal would act upon. */
  viewerIsTarget: boolean;
}

/** List answer: one bounded page plus how many rows matched. */
export interface HrAccessListResponse {
  items: HrAccessRequestView[];
  total: number;
}

/**
 * Approve answer: the decided proposal, plus the one-time password when the
 * approval just minted an account or reset one. A deactivation, profile
 * update or reactivation mints nothing, so its answer carries no password at
 * all. The plaintext exists only here, only once — there is no stored copy
 * to ever show again.
 */
export type HrAccessApproveResponse = HrAccessRequestView & {
  temporaryPassword?: string;
};

/**
 * Reads one of the four proposal fields an `add_hr` row is guaranteed to
 * carry. A null would mean the row was corrupted, which is a server fault —
 * it must not become an account with a blank field, so it answers 500.
 */
function proposalText(value: string | null): string {
  if (value === null) {
    throw new AppException(500, 'INTERNAL');
  }
  return value;
}

function actorView(actor: {
  id: string;
  name: string;
  email: string;
}): ActorView {
  return { id: actor.id, name: actor.name, email: actor.email };
}

/** Projects a stored row onto the wire shape for one viewing employee. */
function toRequestView(
  row: HrAccessRequestWithActors,
  viewerEmployeeId: string,
): HrAccessRequestView {
  return {
    id: row.id,
    type: row.type,
    state: row.state,
    proposedName: row.proposedName,
    proposedEmail: row.proposedEmail,
    proposedPosition: row.proposedPosition,
    proposedPhone: row.proposedPhone,
    targetEmployeeId: row.targetEmployeeId,
    target: row.target
      ? {
          id: row.target.id,
          name: row.target.name,
          email: row.target.email,
          status: row.target.status,
        }
      : null,
    maker: actorView(row.maker),
    checker: row.checker ? actorView(row.checker) : null,
    decisionNote: row.decisionNote,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    canDecide: row.state === 'pending' && row.makerEmployeeId !== viewerEmployeeId,
    viewerIsTarget:
      row.targetEmployeeId !== null && row.targetEmployeeId === viewerEmployeeId,
  };
}

/**
 * Maker-checker approvals for HR accounts: an HR maker files a proposal and
 * a different active HR checker decides it.
 *
 * Three rules hold on every path here:
 * 1. Identity comes from the session, never from the body: maker ≠ checker
 *    for a decision, and only the maker may withdraw — both answered 403
 *    before anything is written.
 * 2. A decision is one transaction: guarded transition, rule re-validation
 *    and the account effect (a minted account, a flipped status) commit or
 *    roll back together, so a refused approval leaves the proposal `pending`
 *    and the employee table untouched. The effects that must not survive a
 *    rollback — revoking the target's sessions, telling attendance — run only
 *    after that commit, from the caller below.
 * 3. Password material is generated, hashed (argon2id) and handed back by the
 *    shared employee-create or mint path exactly once; it is never logged,
 *    never stored on the proposal and never returned by any other route.
 */
@Injectable()
export class HrAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: HrAccessRepository,
    private readonly employees: EmployeesService,
  ) {}

  /**
   * Files a new proposal as its maker.
   *
   * An `add_hr` address is probed against the directory up front so a
   * plainly-taken address never even becomes a pending proposal; the
   * authoritative re-check still happens inside the approval transaction,
   * where the employee table's unique index has the final word. A
   * `deactivate_hr`, `reset_password` or `update_hr` target is validated up
   * front for the same reason, and the condition that can still change by
   * decision time — the target must still be an active HR account — is
   * re-checked inside the approval transaction. A `reactivate_hr` target is
   * validated the same way against the opposite condition — it must be a
   * deactivated HR account, re-checked again at decision time. Either
   * refusal throws before anything is written, so a refused proposal leaves
   * no row behind.
   */
  async create(
    input: CreateProposalInput,
    makerEmployeeId: string,
  ): Promise<HrAccessRequestView> {
    if (input.type === 'update_hr') {
      const target = await this.findActiveHrTarget(
        input.targetEmployeeId,
        makerEmployeeId,
      );

      // An update proposal never carries an address: it re-profiles an
      // account, it never re-addresses one. Only the fields the maker
      // supplied are stored; the omitted ones stay NULL and are left alone
      // at approval time.
      const row = await this.repository.create({
        type: input.type,
        proposedName: input.name ?? null,
        proposedEmail: null,
        proposedPosition: input.position ?? null,
        proposedPhone: input.phone ?? null,
        targetEmployeeId: target.id,
        makerEmployeeId,
      });
      return toRequestView(row, makerEmployeeId);
    }

    if (input.type === 'deactivate_hr' || input.type === 'reset_password') {
      const target = await this.findActiveHrTarget(
        input.targetEmployeeId,
        makerEmployeeId,
      );

      const row = await this.repository.create({
        type: input.type,
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
        targetEmployeeId: target.id,
        makerEmployeeId,
      });
      return toRequestView(row, makerEmployeeId);
    }

    if (input.type === 'reactivate_hr') {
      const target = await this.findDeactivatedHrTarget(input.targetEmployeeId);

      // A reactivation never carries proposed fields: it only restores the
      // account's status, so every proposed column stays NULL.
      const row = await this.repository.create({
        type: input.type,
        proposedName: null,
        proposedEmail: null,
        proposedPosition: null,
        proposedPhone: null,
        targetEmployeeId: target.id,
        makerEmployeeId,
      });
      return toRequestView(row, makerEmployeeId);
    }

    const existing = await this.prisma.employee.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new AppException(409, 'EMAIL_TAKEN');
    }

    const row = await this.repository.create({
      type: input.type,
      proposedName: input.name,
      proposedEmail: input.email,
      proposedPosition: input.position,
      proposedPhone: input.phone,
      makerEmployeeId,
    });
    return toRequestView(row, makerEmployeeId);
  }

  /**
   * Shared up-front validation for the three proposal types that name a live
   * account (`deactivate_hr`, `reset_password`, `update_hr`): the id must
   * exist (else 404) and must belong to an active HR peer — never the maker's
   * own account, which would let them strip, reset or edit the very access
   * they file proposals with (else 409). Throws before any row is written, so
   * a refused proposal leaves nothing behind.
   */
  private async findActiveHrTarget(
    targetEmployeeId: string,
    makerEmployeeId: string,
  ): Promise<{ id: string }> {
    const target = await this.prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, role: true, status: true },
    });
    if (!target) {
      // An id no account carries cannot be acted on: the maker corrects the
      // id rather than filing a proposal against thin air.
      throw new AppException(404, 'NOT_FOUND');
    }
    if (
      target.role !== 'hrd' ||
      target.status !== 'active' ||
      target.id === makerEmployeeId
    ) {
      // Only an active HR peer may be proposed — and never the maker's own
      // account, which would let them strip or re-profile the very access
      // they are filing proposals with.
      throw new AppException(409, 'CONFLICT');
    }
    return target;
  }

  /**
   * Up-front validation for a `reactivate_hr` target: the id must exist
   * (else 404) and must belong to a deactivated HR account (else 409).
   * Throws before any row is written, so a refused proposal leaves nothing
   * behind.
   *
   * No self-check runs here on purpose: only a holder of an active session
   * may file a proposal, while a reactivation may only name a deactivated
   * account — maker and target can never be the same person.
   */
  private async findDeactivatedHrTarget(
    targetEmployeeId: string,
  ): Promise<{ id: string }> {
    const target = await this.prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, role: true, status: true },
    });
    if (!target) {
      // An id no account carries cannot be acted on: the maker corrects the
      // id rather than filing a proposal against thin air.
      throw new AppException(404, 'NOT_FOUND');
    }
    if (target.role !== 'hrd' || target.status !== 'deactivated') {
      // Only a deactivated HR account may be proposed for restoration — an
      // active one already has the access this flow exists to grant, and a
      // non-HR account never had it.
      throw new AppException(409, 'CONFLICT');
    }
    return target;
  }

  /** Newest proposals first, optionally narrowed to one state or type. */
  async list(
    viewerEmployeeId: string,
    filter: HrAccessListFilter,
  ): Promise<HrAccessListResponse> {
    const rows = await this.repository.list(filter);
    const items = rows.map((row) => toRequestView(row, viewerEmployeeId));
    return { items, total: items.length };
  }

  /**
   * Approves a proposal in one transaction, in the rules' order: four-eyes
   * check (and, for a deactivation or a profile update, the extra "no one
   * acts on their own account" refusal) → guarded transition → rule
   * re-validation → account effect → audit fields, all on one client so
   * either everything lands or the proposal is still `pending` afterwards.
   * What must not survive a rollback — revoking the target's sessions, telling
   * attendance — runs only once that transaction has committed, which is why
   * it happens below rather than in the callback.
   */
  async decideApprove(
    id: string,
    checkerEmployeeId: string,
    note: string | null,
  ): Promise<HrAccessApproveResponse> {
    const decision = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.findOne(id, tx);
      if (!row) {
        throw new AppException(404, 'NOT_FOUND');
      }
      if (row.makerEmployeeId === checkerEmployeeId) {
        // Four-eyes: the maker can never approve their own proposal; the
        // comparison is against the session identity, so no body field can
        // talk its way past it.
        throw new AppException(403, 'FORBIDDEN');
      }

      if (row.type === 'deactivate_hr') {
        if (row.targetEmployeeId === checkerEmployeeId) {
          // Nobody may approve the proposal that removes their own access —
          // a checker could otherwise sign away their own account (or be
          // tricked into it) with a single click, bypassing the four-eyes
          // intent of the flow.
          throw new AppException(403, 'FORBIDDEN');
        }
        const approved = await this.approveDeactivation(
          row,
          checkerEmployeeId,
          note,
          tx,
        );
        return {
          view: approved.view,
          deactivatedTargetId: approved.targetId,
          resetTargetId: null,
          temporaryPassword: null,
        };
      }

      if (row.type === 'reset_password') {
        // No self-approval check here on purpose: the target approving their
        // own reset is the safest variant — the one-time credential is only
        // ever seen by them.
        const approved = await this.approvePasswordReset(
          row,
          checkerEmployeeId,
          note,
          tx,
        );
        return {
          view: approved.view,
          deactivatedTargetId: null,
          resetTargetId: approved.targetId,
          temporaryPassword: approved.temporaryPassword,
        };
      }

      if (row.type === 'update_hr') {
        if (row.targetEmployeeId === checkerEmployeeId) {
          // Self-edit without four eyes is refused: a checker renaming or
          // re-banding their own account through their own approval would
          // bypass the very peer review maker-checker exists to force — the
          // same reason a deactivation refuses its own target as checker.
          throw new AppException(403, 'FORBIDDEN');
        }
        const approved = await this.approveProfileUpdate(
          row,
          checkerEmployeeId,
          note,
          tx,
        );
        return {
          view: approved.view,
          deactivatedTargetId: null,
          resetTargetId: null,
          temporaryPassword: null,
        };
      }

      if (row.type === 'reactivate_hr') {
        // No "target ≠ checker" check here on purpose: a reactivation may
        // only name a deactivated account, and a deactivated account can
        // never hold the active session that makes someone a checker — so
        // the checker is never the target of their own approval.
        const approved = await this.approveReactivation(
          row,
          checkerEmployeeId,
          note,
          tx,
        );
        // Reactivation only ever adds access: nothing to revoke, nothing to
        // mint and nothing attendance needs to hear after the commit.
        return {
          view: approved.view,
          deactivatedTargetId: null,
          resetTargetId: null,
          temporaryPassword: null,
        };
      }

      const decided = await this.repository.guardedTransition(
        id,
        {
          state: 'approved',
          checkerEmployeeId,
          decisionNote: note,
          decidedAt: new Date(),
          updatedAt: new Date(),
        },
        tx,
      );

      let temporaryPassword: string;
      try {
        const account = await this.employees.create(
          {
            name: proposalText(row.proposedName),
            email: proposalText(row.proposedEmail),
            position: proposalText(row.proposedPosition),
            phone: proposalText(row.proposedPhone),
            photoObjectKey: null,
            role: 'hrd',
          },
          tx,
        );
        temporaryPassword = account.temporaryPassword;
      } catch (error: unknown) {
        if (error instanceof AppException && error.code === 'EMAIL_TAKEN') {
          // The address was claimed while this proposal waited. The account
          // insert never happened, so this throw rolls the transaction back:
          // the transition above is undone and the proposal stays `pending`,
          // which the checker learns only as a conflict.
          throw new AppException(409, 'CONFLICT');
        }
        throw error;
      }

      return {
        view: toRequestView(decided, checkerEmployeeId),
        deactivatedTargetId: null,
        resetTargetId: null,
        temporaryPassword,
      };
    });

    if (decision.deactivatedTargetId !== null) {
      // The status flip is committed by now: the target's sessions can die
      // and attendance can be told, in that order, with no rollback possible
      // behind them.
      await this.employees.finishDeactivation(decision.deactivatedTargetId);
    }

    if (decision.resetTargetId !== null) {
      // The new credential is committed by now: the old sessions can die,
      // with no rollback possible behind them. Sessions only — a reset never
      // flips the account's status and never tells attendance anything.
      await this.employees.revokeSessions(decision.resetTargetId);
    }

    return decision.temporaryPassword === null
      ? decision.view
      : { ...decision.view, temporaryPassword: decision.temporaryPassword };
  }

  /**
   * The `deactivate_hr` half of an approval, running inside the caller's
   * transaction in the order the rules need:
   *
   * 1. guarded transition — exactly one checker can ever decide this row;
   * 2. the advisory lock on the fixed key, which serializes this decision
   *    against every other one that counts HR accounts, so two approvals can
   *    never each see "one left" and both take it;
   * 3. the recount — at least one other active HR must remain, else the whole
   *    decision aborts and the transition above rolls back with it;
   * 4. the target must still be an active HR account, else the same abort;
   * 5. only then the status flip, on this same transaction.
   *
   * The count runs on the shared pool rather than the transaction's own
   * client: it is a pure read of committed state, and while this transaction
   * holds the advisory lock no other approval can move an HR status, so both
   * connections see exactly the same rows. Nothing here revokes sessions or
   * notifies attendance — those belong after the commit, in the caller.
   */
  private async approveDeactivation(
    row: HrAccessRequestWithActors,
    checkerEmployeeId: string,
    note: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<{ view: HrAccessRequestView; targetId: string }> {
    const targetId = row.targetEmployeeId;
    if (targetId === null) {
      // A deactivation proposal without a target cannot be carried out at
      // all; a row in that shape is broken, which is a server fault rather
      // than a refusal the maker could correct.
      throw new AppException(500, 'INTERNAL');
    }

    await this.repository.guardedTransition(
      row.id,
      {
        state: 'approved',
        checkerEmployeeId,
        decisionNote: note,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
      tx,
    );

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ACTIVE_HR_COUNT_LOCK_KEY}::bigint)`;

    const remaining = await this.prisma.employee.count({
      where: { role: 'hrd', status: 'active', id: { not: targetId } },
    });
    if (remaining < 1) {
      // Removing this account would leave nobody able to sign in as HR, so
      // the decision is refused and the proposal stays pending until a
      // second active HR exists to keep the door open.
      throw new AppException(409, 'CONFLICT');
    }

    const target = await tx.employee.findUnique({
      where: { id: targetId },
      select: { role: true, status: true },
    });
    if (!target || target.role !== 'hrd' || target.status !== 'active') {
      // The account changed while the proposal waited — taken out of band, or
      // no longer an HR account. Same refusal, same untouched proposal.
      throw new AppException(409, 'CONFLICT');
    }

    await this.employees.applyStatus(targetId, 'deactivated', tx);

    // Re-read so the answer carries the target snapshot the flip just wrote.
    const decided = await this.repository.findOne(row.id, tx);
    if (!decided) {
      // Unreachable: the row was just written inside this same transaction,
      // and proposal rows are never deleted — they are the audit trail.
      throw new AppException(500, 'INTERNAL');
    }
    return { view: toRequestView(decided, checkerEmployeeId), targetId };
  }

  /**
   * The `reset_password` half of an approval, running inside the caller's
   * transaction in the order the rules need:
   *
   * 1. guarded transition — exactly one checker can ever decide this row;
   * 2. the target must still be an active HR account, else the whole decision
   *    aborts and the transition above rolls back with it, leaving the
   *    proposal `pending` — the same rollback semantics add_hr and
   *    deactivate_hr already have;
   * 3. only then the credential mint, on this same transaction: a fresh
   *    one-time password is generated, hashed and written to the target row
   *    together with the forced-change flag.
   *
   * No advisory lock runs here on purpose: nothing in a reset counts HR
   * accounts. The account's status is never touched, and nothing here
   * revokes sessions — that belongs after the commit, in the caller.
   */
  private async approvePasswordReset(
    row: HrAccessRequestWithActors,
    checkerEmployeeId: string,
    note: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<{
    view: HrAccessRequestView;
    targetId: string;
    temporaryPassword: string;
  }> {
    const targetId = row.targetEmployeeId;
    if (targetId === null) {
      // A reset proposal without a target cannot be carried out at all; a row
      // in that shape is broken, which is a server fault rather than a
      // refusal the maker could correct.
      throw new AppException(500, 'INTERNAL');
    }

    await this.repository.guardedTransition(
      row.id,
      {
        state: 'approved',
        checkerEmployeeId,
        decisionNote: note,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
      tx,
    );

    const target = await tx.employee.findUnique({
      where: { id: targetId },
      select: { role: true, status: true },
    });
    if (!target || target.role !== 'hrd' || target.status !== 'active') {
      // The account changed while the proposal waited — taken out of band, or
      // no longer an HR account. Same refusal as a stale deactivation: the
      // whole decision rolls back and the proposal stays pending.
      throw new AppException(409, 'CONFLICT');
    }

    const temporaryPassword = await this.employees.mintTemporaryPassword(
      targetId,
      tx,
    );

    // Re-read so the answer carries the target snapshot as this transaction
    // now sees it.
    const decided = await this.repository.findOne(row.id, tx);
    if (!decided) {
      // Unreachable: the row was just written inside this same transaction,
      // and proposal rows are never deleted — they are the audit trail.
      throw new AppException(500, 'INTERNAL');
    }
    return {
      view: toRequestView(decided, checkerEmployeeId),
      targetId,
      temporaryPassword,
    };
  }

  /**
   * The `update_hr` half of an approval, running inside the caller's
   * transaction in the order the rules need:
   *
   * 1. guarded transition — exactly one checker can ever decide this row;
   * 2. the target must still be an active HR account, else the whole decision
   *    aborts and the transition above rolls back with it, leaving the
   *    proposal `pending` — the same rollback semantics reset_password
   *    already has;
   * 3. only then the profile write, on this same transaction: exactly the
   *    non-null proposed fields are applied to the target's row. A NULL
   *    proposed field means the maker never asked for that column to change,
   *    so it is left alone — an update never touches the email, password
   *    material, role, status or any other column of the account.
   *
   * No advisory lock runs here on purpose: nothing in an update counts HR
   * accounts. Nothing here revokes sessions either — a profile edit does not
   * change credentials, so the target stays signed in.
   */
  private async approveProfileUpdate(
    row: HrAccessRequestWithActors,
    checkerEmployeeId: string,
    note: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<{ view: HrAccessRequestView }> {
    const targetId = row.targetEmployeeId;
    if (targetId === null) {
      // An update proposal without a target cannot be carried out at all; a
      // row in that shape is broken, which is a server fault rather than a
      // refusal the maker could correct.
      throw new AppException(500, 'INTERNAL');
    }

    await this.repository.guardedTransition(
      row.id,
      {
        state: 'approved',
        checkerEmployeeId,
        decisionNote: note,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
      tx,
    );

    const target = await tx.employee.findUnique({
      where: { id: targetId },
      select: { role: true, status: true },
    });
    if (!target || target.role !== 'hrd' || target.status !== 'active') {
      // The account changed while the proposal waited — taken out of band, or
      // no longer an HR account. Same refusal as a stale reset: the whole
      // decision rolls back and the proposal stays pending.
      throw new AppException(409, 'CONFLICT');
    }

    const data: Prisma.EmployeeUpdateInput = { updatedAt: new Date() };
    if (row.proposedName !== null) {
      data.name = row.proposedName;
    }
    if (row.proposedPosition !== null) {
      data.position = row.proposedPosition;
    }
    if (row.proposedPhone !== null) {
      data.phone = row.proposedPhone;
    }
    await tx.employee.update({ where: { id: targetId }, data });

    // Re-read so the answer carries the target snapshot this transaction now
    // sees, with the profile fields just written.
    const decided = await this.repository.findOne(row.id, tx);
    if (!decided) {
      // Unreachable: the row was just written inside this same transaction,
      // and proposal rows are never deleted — they are the audit trail.
      throw new AppException(500, 'INTERNAL');
    }
    return { view: toRequestView(decided, checkerEmployeeId) };
  }

  /**
   * The `reactivate_hr` half of an approval, running inside the caller's
   * transaction in the order the rules need:
   *
   * 1. guarded transition — exactly one checker can ever decide this row;
   * 2. the target must still be a deactivated HR account, else the whole
   *    decision aborts and the transition above rolls back with it, leaving
   *    the proposal `pending` — the same rollback semantics every other
   *    targeted type already has;
   * 3. only then the status flip to `active`, on this same transaction,
   *    through the same primitive a deactivation uses in reverse.
   *
   * No advisory lock runs here on purpose: nothing in a reactivation counts
   * HR accounts — it only ever adds one. Nothing is minted and nothing is
   * revoked: the password material, the role and every session of the target
   * stay untouched, and the caller must not notify attendance either —
   * reactivation adds access, it does not end any.
   */
  private async approveReactivation(
    row: HrAccessRequestWithActors,
    checkerEmployeeId: string,
    note: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<{ view: HrAccessRequestView; targetId: string }> {
    const targetId = row.targetEmployeeId;
    if (targetId === null) {
      // A reactivation proposal without a target cannot be carried out at
      // all; a row in that shape is broken, which is a server fault rather
      // than a refusal the maker could correct.
      throw new AppException(500, 'INTERNAL');
    }

    await this.repository.guardedTransition(
      row.id,
      {
        state: 'approved',
        checkerEmployeeId,
        decisionNote: note,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
      tx,
    );

    const target = await tx.employee.findUnique({
      where: { id: targetId },
      select: { role: true, status: true },
    });
    if (!target || target.role !== 'hrd' || target.status !== 'deactivated') {
      // The account changed while the proposal waited — restored, or no
      // longer an HR account. Same refusal as a stale deactivation: the
      // whole decision rolls back and the proposal stays pending.
      throw new AppException(409, 'CONFLICT');
    }

    await this.employees.applyStatus(targetId, 'active', tx);

    // Re-read so the answer carries the target snapshot the flip just wrote.
    const decided = await this.repository.findOne(row.id, tx);
    if (!decided) {
      // Unreachable: the row was just written inside this same transaction,
      // and proposal rows are never deleted — they are the audit trail.
      throw new AppException(500, 'INTERNAL');
    }
    return { view: toRequestView(decided, checkerEmployeeId), targetId };
  }

  /** Rejects a proposal with the checker's reason recorded on the row. */
  async decideReject(
    id: string,
    checkerEmployeeId: string,
    note: string,
  ): Promise<HrAccessRequestView> {
    return this.prisma.$transaction(async (tx) => {
      const row = await this.repository.findOne(id, tx);
      if (!row) {
        throw new AppException(404, 'NOT_FOUND');
      }
      if (row.makerEmployeeId === checkerEmployeeId) {
        // Same four-eyes rule as approval: a maker cannot reject their own
        // proposal either — leaving it pending for a peer is the only way out.
        throw new AppException(403, 'FORBIDDEN');
      }

      const decided = await this.repository.guardedTransition(
        id,
        {
          state: 'rejected',
          checkerEmployeeId,
          decisionNote: note,
          decidedAt: new Date(),
          updatedAt: new Date(),
        },
        tx,
      );
      return toRequestView(decided, checkerEmployeeId);
    });
  }

  /** Lets the maker cancel their own pending proposal; accounts never move. */
  async withdraw(
    id: string,
    viewerEmployeeId: string,
  ): Promise<HrAccessRequestView> {
    return this.prisma.$transaction(async (tx) => {
      const row = await this.repository.findOne(id, tx);
      if (!row) {
        throw new AppException(404, 'NOT_FOUND');
      }
      if (row.makerEmployeeId !== viewerEmployeeId) {
        // Only the maker may withdraw — a checker decides, never cancels.
        throw new AppException(403, 'FORBIDDEN');
      }

      const decided = await this.repository.guardedTransition(
        id,
        { state: 'withdrawn', updatedAt: new Date() },
        tx,
      );
      return toRequestView(decided, viewerEmployeeId);
    });
  }
}
