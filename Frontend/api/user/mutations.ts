import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import { matchQueryKey } from "../../lib/api/react-query"
import type { ChangePasswordInput, UpdateAccountInput } from "../../types/user"
import { userKeys } from "./keys"

export function useSaveMyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FormData | Record<string, unknown>) => {
      const res = await axios.put("/me/profile", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [userKeys.profile(), userKeys.session("auth")]),
      })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateAccountInput) => {
      await axios.put("/me/account", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: ({ queryHash }) =>
          matchQueryKey(queryHash, [userKeys.session("auth"), userKeys.profile()]),
      })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      await axios.post("/me/password", data)
    },
  })
}

export function useStartConversation() {
  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await axios.post<{ data: { id: string } }>("/conversations", {
        participant_id: participantId,
      })
      return res.data.data.id
    },
  })
}
