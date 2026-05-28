export const ROLE_CODES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  OWNER: 'OWNER',
  OPERATIONAL_MANAGER: 'OPERATIONAL_MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
  SALES_AGENT: 'SALES_AGENT',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

/**
 * Shell paths — each role maps to exactly one shell.
 * Mobile-first roles go to /sales, admin roles go to /admin.
 */
export const ROLE_SHELL: Record<RoleCode, string> = {
  ADMINISTRATOR: '/admin',
  OWNER: '/admin',
  OPERATIONAL_MANAGER: '/admin',
  SUPERVISOR: '/admin',
  ADMIN: '/admin',
  SALES_AGENT: '/sales',
};

/** Returns the default home path for a given role. */
export function getHomePathForRole(roleCode: string, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return '/platform';
  return ROLE_SHELL[roleCode as RoleCode] ?? '/admin';
}