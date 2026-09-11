import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { Proposal } from "../../types/proposal"
import type { ResWithData } from "../../types/response"
import { proposalKeys } from "./keys"

export function getMyProposals({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: proposalKeys.mine(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Proposal[]>>("/me/proposals", {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}
