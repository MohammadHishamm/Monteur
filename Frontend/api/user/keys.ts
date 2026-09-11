import { nonNullableArray } from "@/lib/api/react-query"
import { TQueryKeyMeta } from "@/types/common"

export const userKeys = {
  all: () => ["user"],
    details: {
    base: () => {
      return nonNullableArray([...userKeys.all(), "details"])
    },
    id: (id: string, meta?: TQueryKeyMeta) => {
      return nonNullableArray([...userKeys.details.base(), id, meta])
    },
  },
  session: (id: string, meta?: TQueryKeyMeta) => {
    return nonNullableArray([...userKeys.details.id(id), "session", meta])
  },
  profile: () => [...userKeys.all(), "profile"],
  dashboard: {
    client: () => [...userKeys.all(), "dashboard", "client"],
    freelancer: () => [...userKeys.all(), "dashboard", "freelancer"],
  },
}
