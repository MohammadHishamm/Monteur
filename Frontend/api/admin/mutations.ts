import { useMutation, useQueryClient } from "@tanstack/react-query"
import { axiosAdmin as axios } from "~/lib/axios-admin"
import { adminKeys } from "./keys"

export function useAdminBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      await axios.post(`/admin/users/${userId}/${banned ? "ban" : "unban"}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.usersRoot() }),
  })
}

export function useAdminDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.usersRoot() }),
  })
}

export function useAdminSendWarning() {
  return useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      await axios.post(`/admin/users/${userId}/warning`, { message })
    },
  })
}

export function useAdminAddBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      await axios.post(`/admin/users/${userId}/balance`, { amount })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.usersRoot() }),
  })
}

export function useAdminDeductBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      await axios.post(`/admin/users/${userId}/deduct-balance`, { amount })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.usersRoot() }),
  })
}

export function useAdminReplySupportMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const res = await axios.post<{ data: { id: string; sent_at: string } }>(
        `/admin/support/conversations/${conversationId}/messages`,
        { text },
      )
      return res.data.data
    },
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.support.conversation(conversationId) })
      qc.invalidateQueries({ queryKey: adminKeys.support.list() })
    },
  })
}

export function useAdminReviewVerification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      verificationId,
      action,
      rejectionReason,
    }: {
      verificationId: string
      action: "approved" | "rejected"
      rejectionReason?: string
    }) => {
      await axios.post(`/admin/verifications/${verificationId}/review`, {
        status: action,
        rejection_reason: rejectionReason || null,
      })
    },
    // Invalidate every status variant (pending/approved/rejected) so the
    // reviewed card moves between tabs without a manual refresh.
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.verificationsRoot() }),
  })
}
