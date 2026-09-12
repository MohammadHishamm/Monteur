export const freelancerKeys = {
  all: () => ["freelancers"],
  lists: () => [...freelancerKeys.all(), "list"],
  list: (query: Record<string, unknown>) => [...freelancerKeys.lists(), query],
  details: () => [...freelancerKeys.all(), "detail"],
  detail: (id: string) => [...freelancerKeys.details(), id],
  similar: (id: string) => [...freelancerKeys.detail(id), "similar"],
  showcases: (id: string) => [...freelancerKeys.detail(id), "showcases"],
  showcase: (id: string) => ["showcases", id],
  reviews: (id: string) => [...freelancerKeys.detail(id), "reviews"],
  savedStatus: (id: string) => [...freelancerKeys.detail(id), "saved"],
  saved: () => [...freelancerKeys.all(), "saved"],
}
