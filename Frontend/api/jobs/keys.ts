export const jobKeys = {
  all: () => ["jobs"],
  lists: () => [...jobKeys.all(), "list"],
  list: (query: Record<string, unknown>) => [...jobKeys.lists(), query],
  details: () => [...jobKeys.all(), "detail"],
  detail: (id: string) => [...jobKeys.details(), id],
}
