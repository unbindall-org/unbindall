export const userRoles = ["user", "moderator", "platform_admin"] as const;

export type UserRole = (typeof userRoles)[number];

const roleLevel: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  platform_admin: 2,
};

export function hasRole(role: UserRole, requiredRole: UserRole) {
  return roleLevel[role] >= roleLevel[requiredRole];
}

