import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import type { SessionRole } from '../common/auth/permissions';
import { config } from '../config';

export type { SessionRole };

/** Sliding idle window: this much inactivity ends the session. */
export const IDLE_TTL_MS = 30 * 60 * 1000;

/** Absolute cap measured from issuance; activity can never extend past it. */
export const ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000;

/** The value stored in Redis for one session, as a JSON string. */
export interface SessionPayload {
  employeeId: string;
  role: SessionRole;
  mustChangePassword: boolean;
  /** ms epoch of the last successful touch; drives the sliding window. */
  lastSeen: number;
  /** ms epoch when the session was created; drives the absolute cap. */
  issuedAt: number;
}

/** What callers supply to {@link SessionStore.create}; timestamps default to the clock. */
export interface NewSessionPayload {
  employeeId: string;
  role: SessionRole;
  mustChangePassword: boolean;
  issuedAt?: number;
  lastSeen?: number;
}

export interface SessionCreateOptions {
  /** Per-call clock override (ms epoch) that wins over the store clock. */
  now?: number;
}

export interface SessionStoreOptions {
  /** Redis connection string; falls back to the REDIS_URL app setting. */
  redisUrl?: string;
  /** Overrides the idle window (ms); mainly for tests. */
  idleTtlMs?: number;
  /** Overrides the absolute cap (ms); mainly for tests. */
  absoluteTtlMs?: number;
  /** Injectable clock (ms epoch) so tests can move time without waiting. */
  now?: () => number;
}

const SESSION_KEY_PREFIX = 'sess:';

/**
 * Key of the secondary index that maps one employee to the tokens their
 * sessions were issued. It deliberately does not start with `sess:` so the
 * `sess:*` walk used by the keep-one-session path never sees it; the index
 * carries plain tokens and nothing else, so the frozen `sess:{token}` record
 * and its payload are untouched by it.
 */
const EMPLOYEE_INDEX_PREFIX = 'emp-sess:';

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<SessionPayload>;
  return (
    typeof candidate.employeeId === 'string' &&
    (candidate.role === 'employee' || candidate.role === 'hrd') &&
    typeof candidate.mustChangePassword === 'boolean' &&
    typeof candidate.lastSeen === 'number' &&
    Number.isFinite(candidate.lastSeen) &&
    typeof candidate.issuedAt === 'number' &&
    Number.isFinite(candidate.issuedAt)
  );
}

/**
 * Redis-backed session records keyed `sess:{token}`.
 *
 * Expiry combines two limits: a sliding idle window (the key dies after the
 * configured idle time without a read) and an absolute maximum age counted from
 * issuance that no amount of activity can push back. Every read refreshes
 * `lastSeen` and re-arms the key TTL to `min(idle, absolute - age)`; a read at
 * or past the absolute deadline deletes the key and reports a miss, which is how
 * logout/revocation (key deletion) and forced expiry behave for every caller.
 *
 * The Redis connection is created lazily from `REDIS_URL`, and both the clock
 * and the TTLs are injectable so tests can exercise expiry without waiting for
 * real minutes to pass.
 */
@Injectable()
export class SessionStore implements OnModuleDestroy {
  private readonly idleTtlMs: number;
  private readonly absoluteTtlMs: number;
  private readonly clock: () => number;
  private readonly redisUrl?: string;
  private client?: Redis;

  constructor(@Optional() options?: SessionStoreOptions) {
    this.idleTtlMs = options?.idleTtlMs ?? IDLE_TTL_MS;
    this.absoluteTtlMs = options?.absoluteTtlMs ?? ABSOLUTE_TTL_MS;
    this.clock = options?.now ?? Date.now;
    this.redisUrl = options?.redisUrl;
  }

  /** Stores a new session, applying the shared TTL rule from the issue time. */
  async create(
    token: string,
    payload: NewSessionPayload,
    options?: SessionCreateOptions,
  ): Promise<void> {
    const now = options?.now ?? this.clock();
    const issuedAt = payload.issuedAt ?? now;
    const lastSeen = payload.lastSeen ?? issuedAt;
    const ttlMs = this.ttlFor(now, issuedAt);
    if (ttlMs < 1) {
      // Already older than the absolute cap: there is no valid lifetime left.
      return;
    }
    const body = JSON.stringify({
      employeeId: payload.employeeId,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
      lastSeen,
      issuedAt,
    });
    await this.redis.set(this.key(token), body, 'PX', ttlMs);
    await this.indexToken(payload.employeeId, token);
  }

  /**
   * Reads a session and slides it forward: `lastSeen` becomes "now" and the key
   * TTL is re-armed to `min(idle, absolute - age)`. Returns `null` (and removes
   * the key) when the record is missing, malformed or past its absolute age.
   */
  async get(token: string): Promise<SessionPayload | null> {
    const key = this.key(token);
    const raw = await this.redis.get(key);
    if (raw === null) {
      return null;
    }
    let parsed: SessionPayload | null;
    try {
      const value: unknown = JSON.parse(raw);
      parsed = isSessionPayload(value) ? value : null;
    } catch {
      parsed = null;
    }
    if (parsed === null) {
      await this.redis.del(key);
      return null;
    }
    const now = this.clock();
    if (now - parsed.issuedAt >= this.absoluteTtlMs) {
      await this.redis.del(key);
      return null;
    }
    const refreshed: SessionPayload = {
      employeeId: parsed.employeeId,
      role: parsed.role,
      mustChangePassword: parsed.mustChangePassword,
      lastSeen: now,
      issuedAt: parsed.issuedAt,
    };
    const ttlMs = Math.max(1, this.ttlFor(now, parsed.issuedAt));
    await this.redis.set(key, JSON.stringify(refreshed), 'PX', ttlMs);
    return refreshed;
  }

  /** Removes the session so later reads miss (logout / revocation). */
  async delete(token: string): Promise<void> {
    await this.redis.del(this.key(token));
  }

  /**
   * Revokes every session one employee holds — the whole account is signed
   * out at once (password reset, deactivation).
   *
   * The tokens come from the secondary index written alongside each session
   * at creation, so this is a `SMEMBERS` plus one `DEL` instead of a walk of
   * the whole keyspace, and it needs no scan races to be reasoned about.
   * Members whose session already expired simply match no key; the index is
   * dropped as well so a later session starts from a clean list. Sessions
   * created before the index existed are not listed here, which is why the
   * keep-one-session path below still walks the keyspace on its own.
   */
  async deleteAllForEmployee(employeeId: string): Promise<number> {
    const indexKey = this.employeeIndexKey(employeeId);
    const tokens = await this.redis.smembers(indexKey);
    let deleted = 0;
    if (tokens.length > 0) {
      deleted = await this.redis.del(...tokens.map((token) => this.key(token)));
    }
    await this.redis.del(indexKey);
    return deleted;
  }

  /**
   * Rewrites the mutable fields of a live session while keeping its token and
   * its issue time, so an in-place change never extends the absolute age. Reads
   * through the normal path first, which means an expired or malformed record
   * answers `null` instead of being resurrected.
   */
  async update(
    token: string,
    changes: Partial<Pick<SessionPayload, 'role' | 'mustChangePassword'>>,
  ): Promise<SessionPayload | null> {
    const current = await this.get(token);
    if (!current) {
      return null;
    }
    const merged: SessionPayload = { ...current, ...changes };
    const ttlMs = Math.max(1, this.ttlFor(this.clock(), merged.issuedAt));
    await this.redis.set(this.key(token), JSON.stringify(merged), 'PX', ttlMs);
    return merged;
  }

  /**
   * Revokes every session that belongs to one employee except the given token
   * (password changes keep the caller signed in and drop all other devices).
   *
   * The lookup is a stateless `SCAN` over `sess:*` with the employee id read
   * from each value: it has to see sessions that predate the per-employee
   * token index, so it cannot be narrowed to that index without losing them.
   * The keyspace holds at most one short-lived key per active session, which
   * is small enough that walking it once is cheap — an index would cost more
   * writes than this scan costs reads. A session created while the scan is in
   * flight can be missed, which only matters if the caller is signing in on a
   * second device at that exact moment.
   */
  async deleteOthersForEmployee(
    employeeId: string,
    keepToken: string,
  ): Promise<number> {
    const keepKey = this.key(keepToken);
    let deleted = 0;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', 'sess:*', 'COUNT', 200);
      cursor = next;
      const candidates = keys.filter((key) => key !== keepKey);
      if (candidates.length === 0) {
        continue;
      }
      const values = await this.redis.mget(...candidates);
      const doomed: string[] = [];
      candidates.forEach((key, index) => {
        const raw = values[index];
        if (raw === null) {
          return;
        }
        try {
          const parsed: unknown = JSON.parse(raw);
          if (isSessionPayload(parsed) && parsed.employeeId === employeeId) {
            doomed.push(key);
          }
        } catch {
          // Unreadable leftovers are left for the normal read path to clear.
        }
      });
      if (doomed.length > 0) {
        deleted += await this.redis.del(...doomed);
      }
    } while (cursor !== '0');
    return deleted;
  }

  /** Closes the lazily created connection; safe to call twice. */
  async quit(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    if (!client) {
      return;
    }
    if (
      client.status === 'wait' ||
      client.status === 'close' ||
      client.status === 'end'
    ) {
      client.disconnect();
      return;
    }
    await client.quit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }

  /** Key TTL for a session of the given age: the smaller of the two limits. */
  private ttlFor(now: number, issuedAt: number): number {
    const remainingAbsoluteMs = this.absoluteTtlMs - (now - issuedAt);
    return Math.floor(Math.min(this.idleTtlMs, remainingAbsoluteMs));
  }

  private key(token: string): string {
    return `${SESSION_KEY_PREFIX}${token}`;
  }

  private employeeIndexKey(employeeId: string): string {
    return `${EMPLOYEE_INDEX_PREFIX}${employeeId}`;
  }

  /**
   * Adds the fresh token to the employee's index, carrying the absolute
   * session lifetime so the index never outlives the newest session it could
   * be asked about. Written after the session key, so an index entry can only
   * ever point at a session that already exists.
   */
  private async indexToken(employeeId: string, token: string): Promise<void> {
    const indexKey = this.employeeIndexKey(employeeId);
    await this.redis.sadd(indexKey, token);
    await this.redis.pexpire(indexKey, this.absoluteTtlMs);
  }

  private get redis(): Redis {
    if (!this.client) {
      this.client = new Redis(this.redisUrl ?? config.redisUrl);
    }
    return this.client;
  }
}
