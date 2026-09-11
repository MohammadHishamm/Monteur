export const adminKeys = {
  all: ["admin"] as const,
  analytics: () => [...adminKeys.all, "analytics"] as const,
  // Prefix shared by every user-list variant — invalidate this to refresh all
  // filtered user lists (all/client/Freelance) at once.
  usersRoot: () => [...adminKeys.all, "users"] as const,
  users: (type?: string) => [...adminKeys.all, "users", type ?? "all"] as const,
  support: {
    all: () => [...adminKeys.all, "support"] as const,
    list: () => [...adminKeys.support.all(), "list"] as const,
    conversation: (id: string) => [...adminKeys.support.all(), "conversation", id] as const,
  },
  // Prefix shared by every status variant — use this to invalidate all
  // verification lists at once (pending/approved/rejected).
  verificationsRoot: () => [...adminKeys.all, "verifications"] as const,
  verifications: (status?: string) => [...adminKeys.all, "verifications", status ?? "all"] as const,
}
