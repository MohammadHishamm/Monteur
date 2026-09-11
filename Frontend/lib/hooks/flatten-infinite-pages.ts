import type { InfiniteData } from "@tanstack/react-query"
import type { ResWithDataMeta } from "../../types/response"

export function useFlattenInfinitePages<T, U>(
  data?:
    | InfiniteData<ResWithDataMeta<T[], U>, unknown>
    | InfiniteData<ResWithDataMeta<T[] | null, U>, unknown>
) {
  return data?.pages.reduce<T[]>((acc, curr) => {
    if (!curr.data || !curr.data.length) {
      return acc
    }

    return [...acc, ...curr.data]
  }, [])
}
