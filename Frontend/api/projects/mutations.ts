import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import { matchQueryKey } from "../../lib/api/react-query"
import type { UpdateProjectProgressInput } from "../../types/project"
import type { ReviewCreateInput } from "../../types/review"
import { projectKeys } from "./keys"

export function useUpdateProjectProgress(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProjectProgressInput) => {
      await axios.patch(`/projects/${projectId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [projectKeys.detail(projectId), projectKeys.mine()]),
      })
    },
  })
}

export function useCompleteProject(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await axios.post(`/projects/${projectId}/complete`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [projectKeys.detail(projectId), projectKeys.mine()]),
      })
    },
  })
}

export function useSubmitReview(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReviewCreateInput) => {
      await axios.post(`/projects/${projectId}/review`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [projectKeys.detail(projectId)]),
      })
    },
  })
}
