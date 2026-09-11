export const projectKeys = {
  all: () => ["projects"],
  mine: () => [...projectKeys.all(), "mine"],
  detail: (id: string) => [...projectKeys.all(), "detail", id],
}
