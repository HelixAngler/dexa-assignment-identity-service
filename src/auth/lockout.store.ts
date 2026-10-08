import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../config';

/** Consecutive failures after which an account stops accepting sign-ins. */
export const FAILURE_LIMIT = 5;

/**
 * Length of the failure window: a count older than this expires on its own,
 * and reaching the limit keeps the account shut for exactly this long.
 */
export const LOCK_WINDOW_MS = 15 * 60 * 1000;

const KEY_PREFIX = 'lockout:';

/**
 * Failure counter behind the sign-in lockout, stored in Redis as
 * `lockout:{email}` so every instance of the service shares one countdown.
 *
 * The identifier is trimmed and lower-cased before it becomes a key: the login
 * column is case-insensitive, so `Ada@Company.com` and `ada@company.com` must
 * spend from the same counter or the limit would be bypassed by case alone.
 *
 * Counting works like this: every failed attempt increments the key and
 * re-arms the lock window, so only failures that land inside one window add up
 * — a count left behind by a lone typo months ago expires instead of counting
 * toward today's lock. A successful sign-in deletes the key, and once the count
 * reaches the limit the window stops being pushed back, so the lock itself
 * always lasts the full window from the attempt that triggered it. Because
 * `INCR` is atomic, "the fifth failure" belongs to exactly one caller.
 */
@Injectable()
export class LockoutStore implements OnModuleDestroy {
  private client?: Redis;

  /** Increments the counter for one identifier and reports the new total. */
  async registerFailure(email: string): Promise<number> {
    const key = this.key(email);
    const count = await this.redis.incr(key);
    await this.redis.pexpire(key, LOCK_WINDOW_MS);
    return count;
  }

  /** Forgets every failure for one identifier (a successful sign-in). */
  async clear(email: string): Promise<void> {
    await this.redis.del(this.key(email));
  }

  /** Current failure total; zero when the key does not exist. */
  async count(email: string): Promise<number> {
    const raw = await this.redis.get(this.key(email));
    if (raw === null) {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

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

  private key(email: string): string {
    return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
  }

  private get redis(): Redis {
    if (!this.client) {
      this.client = new Redis(config.redisUrl);
    }
    return this.client;
  }
}
