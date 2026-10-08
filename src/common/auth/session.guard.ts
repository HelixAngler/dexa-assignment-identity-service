import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SessionStore,
  type SessionPayload,
} from '../../auth/session.store';
import { AppException } from '../app.exception';
import { hasPermission, type Permission } from './permissions';
import { PERMISSIONS_KEY, PUBLIC_KEY } from './session.decorators';

/** Name of the HttpOnly cookie that carries the opaque session token. */
export const SESSION_COOKIE = 'sid';

/**
 * Request shape this guard works with: it reads the session token from
 * `cookies[SESSION_COOKIE]` (parsed by cookie-parser middleware) and attaches
 * the freshly loaded session to `session` for handlers downstream.
 */
export interface GuardedRequest {
  cookies?: Record<string, string | undefined>;
  session?: SessionPayload;
}

/**
 * Default-deny request guard.
 *
 * Order of checks:
 * 1. `@Public()` routes skip everything.
 * 2. No `sid` cookie, an unknown token or an expired/revoked session → 401
 *    `AUTH_REQUIRED`.
 * 3. The session is attached to the request; if the route declares required
 *    permission codes, the caller's role must grant all of them → otherwise
 *    403 `FORBIDDEN`.
 * 4. No `@RequirePermission` at all means any valid session is enough.
 *
 * The session is re-read from Redis on every request, so role changes or
 * deactivation take effect on the next call instead of waiting for a token to
 * expire. This guard is intentionally not registered globally here; each route
 * opts in when it is defined.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionStore,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GuardedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    const session = token ? await this.sessions.get(token) : null;
    if (!session) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    request.session = session;

    const required = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) {
      return true;
    }
    const allowed = required.every((code) => hasPermission(session.role, code));
    if (!allowed) {
      throw new AppException(403, 'FORBIDDEN');
    }
    return true;
  }
}

export { Public, RequirePermission } from './session.decorators';
