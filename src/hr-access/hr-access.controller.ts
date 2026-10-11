import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppException } from '../common/app.exception';
import {
  RequirePermission,
  type GuardedRequest,
  SessionGuard,
} from '../common/auth/session.guard';
import type { SessionPayload } from '../auth/session.store';
import { isUsablePhone } from '../profile/profile.controller';
import {
  HrAccessRequestState,
  HrAccessRequestType,
} from '../generated/prisma';
import { HrAccessListFilter } from './hr-access.repository';
import {
  CreateProposalInput,
  HrAccessApproveResponse,
  HrAccessListResponse,
  HrAccessRequestView,
  HrAccessService,
} from './hr-access.service';

/** Shape of a database uuid; anything else cannot name a proposal. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts the loosest string people actually type as an address. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

/** The four proposal states the list route may filter on. */
const REQUEST_STATES = Object.values(HrAccessRequestState);

/** The proposal types the list route may filter on. */
const REQUEST_TYPES = Object.values(HrAccessRequestType);

/** Reads a required, non-blank text field or refuses the whole request. */
function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return value.trim();
}

function normalizedEmail(value: unknown): string {
  const email = requiredString(value).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return email;
}

/** Same phone rule employee creation applies: characters, then digit count. */
function checkedPhone(value: unknown): string {
  const phone = requiredString(value);
  if (!isUsablePhone(phone)) {
    throw new AppException(400, 'PHONE_INVALID');
  }
  return phone;
}

/** An id that cannot be a database uuid answers like any unknown proposal. */
function checkedRequestId(id: string): string {
  if (!UUID_PATTERN.test(id)) {
    throw new AppException(404, 'NOT_FOUND');
  }
  return id;
}

/**
 * Reads one optional profile field of an `update_hr` body: absent, null or
 * blank means "leave this field alone" and answers undefined; anything else
 * arrives trimmed. A non-string value where text belongs is a malformed
 * request.
 */
function optionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new AppException(400, 'BAD_REQUEST');
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Narrows one query value to a single allowed enum member, or refuses it. */
function enumFilter<T extends string>(value: unknown, allowed: T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return value as T;
}

/**
 * Create body: `add_hr` carries the four account fields validated exactly the
 * way employee creation validates them; `deactivate_hr`, `reactivate_hr` and
 * `reset_password` carry only their target; `update_hr` carries its target
 * plus at least one non-blank profile field (name, position or phone) — an
 * edit with nothing to change is a malformed request. An unknown or missing
 * type is a malformed request too.
 */
export function parseCreateBody(
  body: Record<string, unknown>,
): CreateProposalInput {
  const type = body?.type;
  if (type === 'add_hr') {
    return {
      type,
      name: requiredString(body.name),
      email: normalizedEmail(body.email),
      position: requiredString(body.position),
      phone: checkedPhone(body.phone),
    };
  }
  if (type === 'update_hr') {
    const targetEmployeeId = requiredString(body.targetEmployeeId);
    if (!UUID_PATTERN.test(targetEmployeeId)) {
      throw new AppException(400, 'BAD_REQUEST');
    }
    const name = optionalText(body.name);
    const position = optionalText(body.position);
    const phone = optionalText(body.phone);
    if (name === undefined && position === undefined && phone === undefined) {
      throw new AppException(400, 'BAD_REQUEST');
    }
    return { type, targetEmployeeId, name, position, phone };
  }
  if (type === 'deactivate_hr' || type === 'reactivate_hr' || type === 'reset_password') {
    const targetEmployeeId = requiredString(body.targetEmployeeId);
    if (!UUID_PATTERN.test(targetEmployeeId)) {
      throw new AppException(400, 'BAD_REQUEST');
    }
    return { type, targetEmployeeId };
  }
  throw new AppException(400, 'BAD_REQUEST');
}

/**
 * Decision body: approval carries an optional note, rejection a mandatory
 * one. Both arrive trimmed; a blank note on a rejection is a missing reason,
 * and the required overload promises the caller a string.
 */
export function parseDecisionNote(
  body: Record<string, unknown>,
  required: true,
): string;
export function parseDecisionNote(
  body: Record<string, unknown>,
  required: false,
): string | null;
export function parseDecisionNote(
  body: Record<string, unknown>,
  required: boolean,
): string | null {
  const note = body?.note;
  if (note === undefined || note === null) {
    if (required) {
      throw new AppException(400, 'BAD_REQUEST');
    }
    return null;
  }
  if (typeof note !== 'string') {
    throw new AppException(400, 'BAD_REQUEST');
  }
  const trimmed = note.trim();
  if (trimmed === '') {
    if (required) {
      throw new AppException(400, 'BAD_REQUEST');
    }
    return null;
  }
  return trimmed;
}

/** List query: optional `state`/`type` filters, each an exact enum member. */
export function parseListQuery(
  query: Record<string, unknown>,
): HrAccessListFilter {
  const filter: HrAccessListFilter = {};
  if (query?.state !== undefined) {
    filter.state = enumFilter(query.state, REQUEST_STATES);
  }
  if (query?.type !== undefined) {
    filter.type = enumFilter(query.type, REQUEST_TYPES);
  }
  return filter;
}

/** The session the guard attached; a request without one cannot be served. */
function requireSession(request: GuardedRequest): SessionPayload {
  const session = request.session;
  if (!session) {
    throw new AppException(401, 'AUTH_REQUIRED');
  }
  return session;
}

/**
 * Maker-checker proposals for HR accounts.
 *
 * Every route needs a session, and each one declares the permission code it
 * sits behind — reading proposals is directory reading, filing and
 * withdrawing are creation, deciding is updating — so the frozen role map
 * alone decides who may call what, with no new codes introduced. The id a
 * decision names comes from the path, never from the body, and the maker or
 * checker identity always comes from the session the guard resolved.
 */
@Controller('hr-access-requests')
@UseGuards(SessionGuard)
export class HrAccessController {
  constructor(private readonly hrAccess: HrAccessService) {}

  @Get()
  @RequirePermission('employee:read')
  list(
    @Query() query: Record<string, unknown>,
    @Req() request: GuardedRequest,
  ): Promise<HrAccessListResponse> {
    return this.hrAccess.list(
      requireSession(request).employeeId,
      parseListQuery(query),
    );
  }

  @Post()
  @RequirePermission('employee:create')
  create(
    @Req() request: GuardedRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<HrAccessRequestView> {
    return this.hrAccess.create(
      parseCreateBody(body),
      requireSession(request).employeeId,
    );
  }

  @Post(':id/approve')
  @RequirePermission('employee:update')
  @HttpCode(200)
  approve(
    @Req() request: GuardedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<HrAccessApproveResponse> {
    return this.hrAccess.decideApprove(
      checkedRequestId(id),
      requireSession(request).employeeId,
      parseDecisionNote(body, false),
    );
  }

  @Post(':id/reject')
  @RequirePermission('employee:update')
  @HttpCode(200)
  reject(
    @Req() request: GuardedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<HrAccessRequestView> {
    return this.hrAccess.decideReject(
      checkedRequestId(id),
      requireSession(request).employeeId,
      // A rejection without a reason answers 400 before any lookup happens.
      parseDecisionNote(body, true),
    );
  }

  @Post(':id/withdraw')
  @RequirePermission('employee:create')
  @HttpCode(200)
  withdraw(
    @Req() request: GuardedRequest,
    @Param('id') id: string,
  ): Promise<HrAccessRequestView> {
    return this.hrAccess.withdraw(
      checkedRequestId(id),
      requireSession(request).employeeId,
    );
  }
}
