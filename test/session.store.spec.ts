import Redis from 'ioredis';
import {
  ABSOLUTE_TTL_MS,
  IDLE_TTL_MS,
  SessionStore,
  type SessionStoreOptions,
} from '../src/auth/session.store';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

let tokenCounter = 0;
const nextToken = (): string =>
  `tok-${Date.now().toString(36)}-${(tokenCounter += 1)}`;
const keyFor = (token: string): string => `sess:${token}`;

const seedPayload = () => ({
  employeeId: 'emp-1',
  role: 'employee' as const,
  mustChangePassword: false,
});

describe('SessionStore against the live Redis', () => {
  let raw: Redis;
  const stores: SessionStore[] = [];

  // No redisUrl on purpose: the store must fall back to the REDIS_URL setting.
  const makeStore = (options?: SessionStoreOptions): SessionStore => {
    const store = new SessionStore(options);
    stores.push(store);
    return store;
  };

  beforeAll(() => {
    raw = new Redis(REDIS_URL);
  });

  afterAll(async () => {
    await Promise.all(stores.map((store) => store.quit()));
    raw.disconnect();
  });

  it('roundtrips a created session with the shared payload shape', async () => {
    const store = makeStore();
    const token = nextToken();
    const startedAt = Date.now();

    await store.create(token, {
      employeeId: 'emp-42',
      role: 'hrd',
      mustChangePassword: true,
    });
    const session = await store.get(token);

    expect(session).not.toBeNull();
    if (!session) {
      return;
    }
    expect(session).toEqual({
      employeeId: 'emp-42',
      role: 'hrd',
      mustChangePassword: true,
      lastSeen: expect.any(Number),
      issuedAt: expect.any(Number),
    });
    expect(Object.keys(session).sort()).toEqual([
      'employeeId',
      'issuedAt',
      'lastSeen',
      'mustChangePassword',
      'role',
    ]);
    expect(session.lastSeen).toBeGreaterThanOrEqual(startedAt);
    expect(session.issuedAt).toBeGreaterThanOrEqual(startedAt);

    const stored = await raw.get(keyFor(token));
    expect(typeof stored).toBe('string');
    expect(JSON.parse(String(stored))).toEqual(session);
  });

  it('returns null for a token that was never stored', async () => {
    const store = makeStore();
    expect(await store.get(nextToken())).toBeNull();
  });

  it('arms the key with min(idle, absolute) and the exported constants', async () => {
    expect(IDLE_TTL_MS).toBe(30 * 60 * 1000);
    expect(ABSOLUTE_TTL_MS).toBe(12 * 60 * 60 * 1000);

    const store = makeStore();
    const token = nextToken();
    await store.create(token, seedPayload());

    const ttl = await raw.ttl(keyFor(token));
    expect(ttl).toBeLessThanOrEqual(IDLE_TTL_MS / 1000);
    expect(ttl).toBeGreaterThan(IDLE_TTL_MS / 1000 - 5);
  });

  it('slides the idle window forward on every read', async () => {
    const idleTtlMs = 700;
    const store = makeStore({ idleTtlMs, absoluteTtlMs: 60_000 });
    const token = nextToken();
    const key = keyFor(token);

    await store.create(token, seedPayload());
    const initialTtl = await raw.pttl(key);
    expect(initialTtl).toBeGreaterThan(0);
    expect(initialTtl).toBeLessThanOrEqual(idleTtlMs);

    await sleep(400);
    const beforeRead = await raw.pttl(key);
    expect(beforeRead).toBeLessThan(initialTtl);

    const touched = await store.get(token);
    if (!touched) {
      throw new Error('expected the session to survive the idle window');
    }

    const afterRead = await raw.pttl(key);
    expect(afterRead).toBeGreaterThan(beforeRead);
    expect(afterRead).toBeLessThanOrEqual(idleTtlMs);
    expect(touched.lastSeen).toBeGreaterThan(touched.issuedAt);
  });

  it('caps the refreshed TTL at the remaining absolute age', async () => {
    let now = 1_700_000_000_000;
    const idleTtlMs = 10_000;
    const absoluteTtlMs = 30_000;
    const store = makeStore({ idleTtlMs, absoluteTtlMs, now: () => now });
    const token = nextToken();
    const key = keyFor(token);

    await store.create(token, seedPayload());
    expect(await raw.pttl(key)).toBeLessThanOrEqual(idleTtlMs);

    now += 25_000; // only 5 s of absolute lifetime left
    const touched = await store.get(token);
    if (!touched) {
      throw new Error('expected the session to still be alive');
    }
    expect(touched.lastSeen).toBe(1_700_000_000_000 + 25_000);

    const pttl = await raw.pttl(key);
    expect(pttl).toBeLessThanOrEqual(5_000);
    expect(pttl).toBeGreaterThan(4_000);

    const ttl = await raw.ttl(key);
    expect(ttl).toBeGreaterThanOrEqual(4);
    expect(ttl).toBeLessThan(idleTtlMs / 1000);
  });

  it('honours explicit issuedAt/lastSeen values passed to create', async () => {
    const now = 1_700_000_000_000;
    const store = makeStore({
      now: () => now,
      idleTtlMs: 10_000,
      absoluteTtlMs: 30_000,
    });
    const token = nextToken();

    await store.create(token, {
      ...seedPayload(),
      issuedAt: now - 5_000,
      lastSeen: now - 5_000,
    });
    const session = await store.get(token);

    expect(session).toEqual({
      ...seedPayload(),
      issuedAt: now - 5_000,
      lastSeen: now,
    });
  });

  it('expires at the absolute deadline: null answer and key deleted', async () => {
    let now = 1_700_000_000_000;
    const idleTtlMs = 10_000;
    const absoluteTtlMs = 30_000;
    const store = makeStore({ idleTtlMs, absoluteTtlMs, now: () => now });
    const token = nextToken();
    const key = keyFor(token);

    await store.create(token, seedPayload());
    expect(await raw.exists(key)).toBe(1);

    now += 29_000; // one second before the deadline
    const alive = await store.get(token);
    if (!alive) {
      throw new Error('expected the session to be alive before the deadline');
    }
    expect(alive.lastSeen).toBe(1_700_000_000_000 + 29_000);
    expect(await raw.exists(key)).toBe(1);

    now += 1_000; // exactly at the absolute deadline
    expect(await store.get(token)).toBeNull();
    expect(await raw.exists(key)).toBe(0);
  });

  it('delete removes the session so later reads miss', async () => {
    const store = makeStore();
    const token = nextToken();

    await store.create(token, seedPayload());
    expect(await store.get(token)).not.toBeNull();

    await store.delete(token);

    expect(await store.get(token)).toBeNull();
    expect(await raw.exists(keyFor(token))).toBe(0);
  });
});
