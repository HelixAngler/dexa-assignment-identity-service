import { Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception';
import { PrismaService } from '../common/prisma.service';
import type {
  HrAccessRequestState,
  HrAccessRequestType,
  Prisma,
} from '../generated/prisma';

/**
 * Rows the list route answers with. Proposals are a low-volume admin artifact,
 * so one bounded page of the newest rows serves v1 without pagination.
 */
export const LIST_CAP = 100;

/** Filters the list route accepts; both are optional and exact-match. */
export interface HrAccessListFilter {
  state?: HrAccessRequestState;
  type?: HrAccessRequestType;
}

/** Column values written when a maker files a proposal. */
export interface CreateProposalData {
  type: HrAccessRequestType;
  proposedName: string | null;
  proposedEmail: string | null;
  proposedPosition: string | null;
  proposedPhone: string | null;
  targetEmployeeId?: string | null;
  makerEmployeeId: string;
}

/**
 * What a decision writes with its state flip: who decided, when, and the
 * optional note. The unchecked input shape is used on purpose — `updateMany`
 * cannot address relations, and the checker is the relation's own foreign key
 * column, which only the unchecked variant exposes.
 */
export type DecisionPatch = Pick<
  Prisma.HrAccessRequestUncheckedUpdateManyInput,
  'state' | 'checkerEmployeeId' | 'decisionNote' | 'decidedAt' | 'updatedAt'
>;

/**
 * Selection that resolves the maker/checker/target snapshots every proposal
 * answer carries, so no caller has to issue follow-up lookups (or risk
 * rendering a half-populated actor).
 */
const REQUEST_INCLUDE = {
  maker: { select: { id: true, name: true, email: true } },
  checker: { select: { id: true, name: true, email: true } },
  target: { select: { id: true, name: true, email: true, status: true } },
} as const;

/** A proposal row joined with its three actor snapshots. */
export type HrAccessRequestWithActors = Prisma.HrAccessRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

/**
 * The client every query runs on: the shared connection pool by default, or
 * the caller's open transaction when a decision has to be atomic. Both expose
 * the same model delegates, so one implementation serves both.
 */
type QueryClient = Prisma.TransactionClient;

/**
 * Storage for maker-checker proposals: one row per proposed account change,
 * answered together with its maker, checker and target snapshots.
 *
 * Every read resolves the actor snapshots in the same statement, and the one
 * write that matters — a decision — is a guarded `UPDATE … WHERE state =
 * 'pending'`: exactly one concurrent checker can ever move a row out of
 * `pending`, which is how "every decision happens exactly once" is enforced
 * in the database rather than in application memory.
 */
@Injectable()
export class HrAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Files a new proposal; the row always starts `pending` with its maker. */
  async create(
    data: CreateProposalData,
    client: QueryClient = this.prisma,
  ): Promise<HrAccessRequestWithActors> {
    return client.hrAccessRequest.create({
      data,
      include: REQUEST_INCLUDE,
    });
  }

  /** One proposal with its snapshots, or null when no id carries one. */
  async findOne(
    id: string,
    client: QueryClient = this.prisma,
  ): Promise<HrAccessRequestWithActors | null> {
    return client.hrAccessRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    });
  }

  /** Newest proposals first, optionally narrowed to one state or type. */
  async list(
    filter: HrAccessListFilter,
    client: QueryClient = this.prisma,
  ): Promise<HrAccessRequestWithActors[]> {
    return client.hrAccessRequest.findMany({
      where: {
        ...(filter.state ? { state: filter.state } : {}),
        ...(filter.type ? { type: filter.type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: LIST_CAP,
      include: REQUEST_INCLUDE,
    });
  }

  /**
   * The guarded transition: flips a row out of `pending` only while it is
   * still `pending`, and answers with the row as this transaction sees it.
   *
   * A count other than one means the proposal was already decided, withdrawn
   * or raced away — a terminal state that must never change — so the caller
   * gets 409 `CONFLICT` instead of a silently overwritten audit record.
   */
  async guardedTransition(
    id: string,
    patch: DecisionPatch,
    client: QueryClient = this.prisma,
  ): Promise<HrAccessRequestWithActors> {
    const updated = await client.hrAccessRequest.updateMany({
      where: { id, state: 'pending' },
      data: patch,
    });
    if (updated.count !== 1) {
      throw new AppException(409, 'CONFLICT');
    }
    const row = await this.findOne(id, client);
    if (!row) {
      // Unreachable: the row was just written inside this same transaction,
      // and proposal rows are never deleted — they are the audit trail.
      throw new AppException(409, 'CONFLICT');
    }
    return row;
  }
}
