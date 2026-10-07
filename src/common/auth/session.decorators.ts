import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

/** Metadata key marking a route as reachable without a session. */
export const PUBLIC_KEY = 'auth:public';

/** Metadata key holding every permission code a route requires. */
export const PERMISSIONS_KEY = 'auth:permissions';

/**
 * Lets the session guard skip authentication and authorization for a route
 * (login, health checks, other intentionally open endpoints).
 */
export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(PUBLIC_KEY, true);

/**
 * Declares the permission codes a route needs. All listed codes must be present
 * in the caller's role permission list, otherwise the guard answers 403. With no
 * decorator at all a route only requires a valid session.
 */
export const RequirePermission = (
  ...codes: Permission[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, codes);
