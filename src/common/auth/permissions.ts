/**
 * Canonical role-to-permission map, shared byte-for-byte by the identity,
 * attendance and notification services.
 *
 * Two roles exist in the system:
 * - `employee` may only act on their own data: read/update own profile, change
 *   own password, punch in/out and read own attendance summary.
 * - `hrd` is a strict superset of `employee` (hrd = employee ∪ admin): the same
 *   five self-service codes plus the administrative codes used for employee
 *   management, reading everyone's attendance and receiving realtime popups.
 *   An HRD user therefore never loses the abilities a regular employee has.
 *
 * Every route must be denied unless its required code appears in the caller's
 * role list; routes without a requirement only need a valid session. When a code
 * is added here, add it to the same file in all three services.
 */

export type SessionRole = 'employee' | 'hrd';

export type Permission =
  | 'profile:read_own'
  | 'profile:update_own'
  | 'password:change_own'
  | 'attendance:punch'
  | 'summary:read_own'
  | 'employee:read'
  | 'employee:create'
  | 'employee:update'
  | 'attendance:read_all'
  | 'hrd:receive_popups';

export const ROLE_PERMISSIONS: Record<SessionRole, readonly Permission[]> = {
  employee: [
    'profile:read_own',
    'profile:update_own',
    'password:change_own',
    'attendance:punch',
    'summary:read_own',
  ],
  hrd: [
    'profile:read_own',
    'profile:update_own',
    'password:change_own',
    'attendance:punch',
    'summary:read_own',
    'employee:read',
    'employee:create',
    'employee:update',
    'attendance:read_all',
    'hrd:receive_popups',
  ],
};

/** True when the role's permission list contains the required code. */
export function hasPermission(role: SessionRole, code: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(code);
}
