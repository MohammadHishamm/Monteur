import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { Proposal } from "../../types/proposal"
import type { ResWithData } from "../../types/response"
import { proposalKeys } from "./keys"

export function getMyProposals({
  page = 1,
  limit = 100,
  cookie,
}: WithCookies<{ page?: number; limit?: number }>) {
  return queryOptions({
    queryKey: [...proposalKeys.mine(), { page, limit }],
    queryFn: async () => {
      const res = await axios.get<ResWithData<Proposal[]>>("/me/proposals", {
        params: { page, limit },
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}
