/**
 * Dashboard tab access permissions by role.
 * SuperAdmin has full access to all tabs (checked first).
 *
 * Matrix:
 * | Tab            | SuperAdmin | Admin | Moderator | Accountant |
 * |----------------|------------|-------|-----------|------------|
 * | Analytics      | Full       | Lim*  | ✗         | Full       |
 * | Users          | ✓          | ✓     | ✓         | ✗          |
 * | Publishers     | ✓          | ✓     | ✓         | ✗          |
 * | Mangas/Novels  | ✓          | ✓     | ✓         | ✗          |
 * | Tags           | ✓          | ✓     | ✓         | ✗          |
 * | Transactions   | ✓          | ✗     | ✗         | ✓          |
 * | Export Sheets  | ✓          | ✓     | ✗         | ✓          |
 * | Announcements  | ✓          | ✓     | ✗         | ✗          |
 * | Packages       | ✓          | ✗     | ✗         | ✗          |
 * | Settings (SEO) | ✓          | ✗     | ✗         | ✗          |
 */

import { RoleEnum, type TRole } from "./role"

export type DashboardTab =
  | "analytics"
  | "users"
  | "publishers"
  | "art"
  | "tags"
  | "transactions"
  | "export-sheets"
  | "announcements"
  | "manage_packages"
  | "seo_settings"
  | "puzzle"
  | "challenges"

/** Roles that can access each tab (SuperAdmin always has access) */
const TAB_ROLES: Record<DashboardTab, TRole[]> = {
  analytics: [RoleEnum.ADMIN, RoleEnum.ACCOUNTANT],
  users: [RoleEnum.ADMIN, RoleEnum.MODERATOR],
  publishers: [RoleEnum.ADMIN, RoleEnum.MODERATOR],
  art: [RoleEnum.ADMIN, RoleEnum.MODERATOR],
  tags: [RoleEnum.ADMIN, RoleEnum.MODERATOR],
  transactions: [RoleEnum.ACCOUNTANT],
  "export-sheets": [RoleEnum.ADMIN, RoleEnum.ACCOUNTANT],
  announcements: [RoleEnum.ADMIN],
  manage_packages: [], // SuperAdmin only
  seo_settings: [], // SuperAdmin only
  puzzle: [RoleEnum.ADMIN], // Admin and SuperAdmin
  challenges: [RoleEnum.ADMIN],
}

/**
 * Check if the given roles can access a dashboard tab.
 * SuperAdmin always has access to everything.
 */
export function canAccessTab(tab: DashboardTab, roles: TRole[]): boolean {
  if (!roles || roles.length === 0) return false
  if (roles.includes(RoleEnum.SUPER_ADMIN)) return true

  const allowedRoles = TAB_ROLES[tab]
  return allowedRoles.some((role) => roles.includes(role))
}

/**
 * Check if the user can create announcements (SuperAdmin or Admin only)
 */
export function canCreateAnnouncement(roles: TRole[]): boolean {
  if (!roles || roles.length === 0) return false
  return roles.includes(RoleEnum.SUPER_ADMIN) || roles.includes(RoleEnum.ADMIN)
}

/** Tab to URL path mapping (order = fallback redirect priority) */
const TAB_PATHS: { tab: DashboardTab; path: string }[] = [
  { tab: "analytics", path: "/dashboard" },
  { tab: "users", path: "/dashboard/users" },
  { tab: "publishers", path: "/dashboard/publishers" },
  { tab: "art", path: "/dashboard/art" },
  { tab: "tags", path: "/dashboard/tags" },
  { tab: "transactions", path: "/dashboard/transactions" },
  { tab: "export-sheets", path: "/dashboard/export-sheets" },
  { tab: "announcements", path: "/dashboard/announcements" },
  { tab: "manage_packages", path: "/dashboard/manage_packages" },
  { tab: "seo_settings", path: "/dashboard/seo_settings" },
  { tab: "puzzle", path: "/dashboard/puzzle" },
  { tab: "challenges", path: "/dashboard/challenges" },
]

/**
 * Get the first dashboard path the user can access. Use for redirect when unauthorized.
 */
export function getFirstAllowedDashboardPath(roles: TRole[]): string {
  for (const { tab, path } of TAB_PATHS) {
    if (canAccessTab(tab, roles)) return path
  }
  return "/"
}
