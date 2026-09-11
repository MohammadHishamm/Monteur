export type TRole = (typeof RoleEnum)[keyof typeof RoleEnum]

export const RoleEnum = {
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  FREELANCE: "Freelance",
  SUPER_ADMIN: "SuperAdmin",
  ACCOUNTANT: "Accountant",
  CLIENT: "Client",
} as const

const roleDisplayNames: Record<TRole, string> = {
  Admin: "Admin",
  Moderator: "Moderator",
  Freelance: "Freelance",
  SuperAdmin: "Super Admin",
  Accountant: "Accountant",
  Client: "Client",
}

export const rolesList: {
  id: number
  name: string
  value: TRole
}[] = Object.entries(RoleEnum).map(([_, value], index) => ({
  id: index + 1,
  name: roleDisplayNames[value],
  value,
}))
