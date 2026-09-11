import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import { matchQueryKey } from "../../lib/api/react-query"
import type { ShowcaseUpsertInput } from "../../types/freelancer"
import { freelancerKeys } from "./keys"

export function useSaveFreelancer(freelancerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await axios.post(`/freelancers/${freelancerId}/save`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [
            freelancerKeys.savedStatus(freelancerId),
            freelancerKeys.saved(),
          ]),
      })
    },
  })
}

export function useUnsaveFreelancer(freelancerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await axios.delete(`/freelancers/${freelancerId}/save`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [
            freelancerKeys.savedStatus(freelancerId),
            freelancerKeys.saved(),
          ]),
      })
    },
  })
}

export function useUpsertShowcase(freelancerId: string, showcaseId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ShowcaseUpsertInput) => {
      if (showcaseId) {
        await axios.put(`/showcases/${showcaseId}`, data)
      } else {
        await axios.post(`/freelancers/${freelancerId}/showcases`, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [freelancerKeys.showcases(freelancerId)]),
      })
    },
  })
}

export function useDeleteShowcase(freelancerId: string, showcaseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await axios.delete(`/showcases/${showcaseId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [freelancerKeys.showcases(freelancerId)]),
      })
    },
  })
}
