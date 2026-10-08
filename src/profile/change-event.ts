import { randomUUID } from 'node:crypto';
import type { SessionRole } from '../common/auth/permissions';

/**
 * The three fields an employee may change on their own profile. No other field
 * ever reaches the outbox: administrative edits made by HRD are plain CRUD and
 * deliberately produce no event at all.
 */
export type ProfileChangeField = 'phone' | 'photo' | 'password';

/**
 * Snapshot of the values a change touched: one key per field, each holding the
 * plain value or `null` when the field had no value before the change (a
 * profile that never had a photo, for example).
 */
export type ProfileChangeValues = Record<string, string | null>;

/** Who performed the change; in this system always the signed-in employee. */
export interface ProfileChangeActor {
  employeeId: string;
  role: SessionRole;
}

export interface BuildProfileChangedEventInput {
  actor: ProfileChangeActor;
  changedFields: ProfileChangeField[];
  before?: ProfileChangeValues;
  after?: ProfileChangeValues;
  /** Server clock when omitted, so callers never have to stamp it themselves. */
  occurredAt?: Date;
}

/**
 * Payload of one `profile_change_events` outbox row.
 *
 * `id` doubles as the event id carried on the wire, which is what consumers
 * deduplicate on. The subject and the actor are the same person here: only
 * self-service changes emit events, so `employeeId` mirrors the actor.
 */
export interface ProfileChangedEventPayload {
  id: string;
  employeeId: string;
  actorId: string;
  actorRole: SessionRole;
  changedFields: ProfileChangeField[];
  beforeValues: ProfileChangeValues;
  afterValues: ProfileChangeValues;
  occurredAt: Date;
}

/** Placeholder written instead of any password material. */
const REDACTED_PASSWORD = '[redacted]';

/**
 * Builds the outbox row payload for one successful profile change.
 *
 * Password events are redacted on the way in: whatever the caller passes for
 * the `password` field is replaced by a fixed placeholder, so a serialized
 * event can never contain a plaintext password or a hash — only the fact that
 * the password changed. Any other field of the same event is copied verbatim,
 * and both inputs are copied rather than aliased so later mutation of the
 * caller's objects cannot reach the stored row.
 *
 * Everything else (actor, subject, timestamp, changed fields, before/after
 * values) is carried through as given; the timestamp defaults to the current
 * clock so every row has one even when the caller does not care.
 */
export function buildProfileChangedEvent(
  input: BuildProfileChangedEventInput,
): ProfileChangedEventPayload {
  const involvesPassword = input.changedFields.includes('password');
  return {
    id: randomUUID(),
    employeeId: input.actor.employeeId,
    actorId: input.actor.employeeId,
    actorRole: input.actor.role,
    changedFields: [...input.changedFields],
    beforeValues: sanitized(input.before, involvesPassword),
    afterValues: sanitized(input.after, involvesPassword),
    occurredAt: input.occurredAt ?? new Date(),
  };
}

/** Copies a value snapshot, overwriting any password entry when needed. */
function sanitized(
  values: ProfileChangeValues | undefined,
  involvesPassword: boolean,
): ProfileChangeValues {
  const copy: ProfileChangeValues = { ...(values ?? {}) };
  if (involvesPassword) {
    copy.password = REDACTED_PASSWORD;
  }
  return copy;
}
