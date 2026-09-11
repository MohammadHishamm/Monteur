import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import { matchQueryKey } from "../../lib/api/react-query"
import type { JobCreateInput, JobUpdateInput } from "../../types/job"
import type { ProposalCreateInput } from "../../types/proposal"
import { proposalKeys } from "../proposals/keys"
import { jobKeys } from "./keys"

export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: JobCreateInput) => {
      const res = await axios.post<{ data: { id: string } }>("/jobs", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) => matchQueryKey(queryHash, [jobKeys.lists()]),
      })
    },
  })
}

export function useUpdateJob(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: JobUpdateInput) => {
      await axios.put(`/jobs/${jobId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [jobKeys.detail(jobId), jobKeys.lists()]),
      })
    },
  })
}

export function useCloseJob(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await axios.post(`/jobs/${jobId}/close`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [jobKeys.detail(jobId), jobKeys.lists()]),
      })
    },
  })
}

export function useSubmitProposal(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProposalCreateInput) => {
      const res = await axios.post<{ data: { id: string } }>(
        `/jobs/${jobId}/proposals`,
        data
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [
            jobKeys.detail(jobId),
            proposalKeys.mine(),
          ]),
      })
    },
  })
}

export function useHireBestMatch(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (freelancerId: string) => {
      await axios.post(`/jobs/${jobId}/hire`, { freelancer_id: freelancerId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) => matchQueryKey(queryHash, [jobKeys.detail(jobId)]),
      })
    },
  })
}
