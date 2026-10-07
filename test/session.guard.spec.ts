import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionPayload, SessionStore } from '../src/auth/session.store';
import { AppException } from '../src/common/app.exception';
import {
  Public,
  RequirePermission,
  SessionGuard,
  type GuardedRequest,
} from '../src/common/auth/session.guard';

/**
 * Store double: seeded sessions answer, everything else misses. No Redis is
 * involved, so guard behaviour is verified in isolation.
 */
class FakeSessionStore {
  private readonly sessions = new Map<string, SessionPayload>();

  readonly get = jest.fn(
    async (token: string): Promise<SessionPayload | null> =>
      this.sessions.get(token) ?? null,
  );

  seed(token: string, session: SessionPayload): void {
    this.sessions.set(token, session);
  }
}

class SampleController {
  @Public()
  publicRoute(): void {
    // Open endpoint: the guard returns before touching the session store.
  }

  sessionOnly(): void {
    // Any valid session is enough; no permission requirement declared.
  }

  @RequirePermission('profile:read_own')
  ownProfile(): void {
    // Self-service route.
  }

  @RequirePermission('employee:read')
  employeeList(): void {
    // HRD-only route.
  }
}

function contextFor(
  request: GuardedRequest,
  handler: () => void = SampleController.prototype.sessionOnly,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => handler,
    getClass: () => SampleController,
  } as unknown as ExecutionContext;
}

function makeSession(role: 'employee' | 'hrd'): SessionPayload {
  return {
    employeeId: 'emp-9',
    role,
    mustChangePassword: false,
    lastSeen: 1_700_000_000_000,
    issuedAt: 1_699_990_000_000,
  };
}

async function capture(promise: Promise<boolean>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error: unknown) {
    return error;
  }
}

describe('SessionGuard', () => {
  it('lets a valid session through without a permission requirement and attaches it', async () => {
    const store = new FakeSessionStore();
    store.seed('good-token', makeSession('employee'));
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = { cookies: { sid: 'good-token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(request.session).toEqual(makeSession('employee'));
    expect(store.get).toHaveBeenCalledWith('good-token');
  });

  it('rejects a request without the sid cookie with 401 AUTH_REQUIRED', async () => {
    const store = new FakeSessionStore();
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = {};

    const error = await capture(guard.canActivate(contextFor(request)));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ statusCode: 401, code: 'AUTH_REQUIRED' });
    expect(request.session).toBeUndefined();
    expect(store.get).not.toHaveBeenCalled();
  });

  it('ignores cookies stored under any name other than sid', async () => {
    const store = new FakeSessionStore();
    store.seed('good-token', makeSession('employee'));
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = {
      cookies: { session: 'good-token', token: 'good-token' },
    };

    const error = await capture(guard.canActivate(contextFor(request)));

    expect(error).toMatchObject({ statusCode: 401, code: 'AUTH_REQUIRED' });
    expect(store.get).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired token with 401 AUTH_REQUIRED', async () => {
    const store = new FakeSessionStore();
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = { cookies: { sid: 'expired-token' } };

    const error = await capture(guard.canActivate(contextFor(request)));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ statusCode: 401, code: 'AUTH_REQUIRED' });
    expect(store.get).toHaveBeenCalledWith('expired-token');
    expect(request.session).toBeUndefined();
  });

  it('accepts an employee session for a permission the employee role grants', async () => {
    const store = new FakeSessionStore();
    store.seed('employee-token', makeSession('employee'));
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = { cookies: { sid: 'employee-token' } };

    await expect(
      guard.canActivate(
        contextFor(request, SampleController.prototype.ownProfile),
      ),
    ).resolves.toBe(true);

    expect(request.session).toEqual(makeSession('employee'));
  });

  it('rejects an employee session for an HRD-only permission with 403 FORBIDDEN', async () => {
    const store = new FakeSessionStore();
    store.seed('employee-token', makeSession('employee'));
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = { cookies: { sid: 'employee-token' } };

    const error = await capture(
      guard.canActivate(
        contextFor(request, SampleController.prototype.employeeList),
      ),
    );

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('accepts an HRD session for an HRD-only permission', async () => {
    const store = new FakeSessionStore();
    store.seed('hrd-token', makeSession('hrd'));
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = { cookies: { sid: 'hrd-token' } };

    await expect(
      guard.canActivate(
        contextFor(request, SampleController.prototype.employeeList),
      ),
    ).resolves.toBe(true);

    expect(request.session).toEqual(makeSession('hrd'));
  });

  it('accepts an HRD session for an employee-level permission (hrd ⊇ employee)', async () => {
    const store = new FakeSessionStore();
    store.seed('hrd-token', makeSession('hrd'));
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = { cookies: { sid: 'hrd-token' } };

    await expect(
      guard.canActivate(
        contextFor(request, SampleController.prototype.ownProfile),
      ),
    ).resolves.toBe(true);

    expect(request.session).toEqual(makeSession('hrd'));
  });

  it('passes a public route without any session and never consults the store', async () => {
    const store = new FakeSessionStore();
    const guard = new SessionGuard(
      store as unknown as SessionStore,
      new Reflector(),
    );
    const request: GuardedRequest = {};

    await expect(
      guard.canActivate(
        contextFor(request, SampleController.prototype.publicRoute),
      ),
    ).resolves.toBe(true);

    expect(store.get).not.toHaveBeenCalled();
    expect(request.session).toBeUndefined();
  });
});
