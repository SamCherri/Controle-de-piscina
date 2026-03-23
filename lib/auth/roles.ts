export const ADMIN_USER_ROLES = ['admin', 'operator'] as const;

export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];
