export const proposalKeys = {
  all: () => ["proposals"],
  mine: () => [...proposalKeys.all(), "mine"],
  detail: (id: string) => [...proposalKeys.all(), "detail", id],
}
