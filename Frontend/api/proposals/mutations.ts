import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import { matchQueryKey } from "../../lib/api/react-query"
import type { UpdateProposalStatusInput } from "../../types/proposal"
import { projectKeys } from "../projects/keys"
import { proposalKeys } from "./keys"

export function useHireProposal(proposalId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await axios.post(`/proposals/${proposalId}/hire`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [proposalKeys.all(), projectKeys.mine()]),
      })
    },
  })
}

export function useUpdateProposalStatus(proposalId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProposalStatusInput) => {
      await axios.patch(`/proposals/${proposalId}/status`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [proposalKeys.all()]),
      })
    },
  })
}
