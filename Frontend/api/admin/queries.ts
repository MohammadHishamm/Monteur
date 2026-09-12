import { queryOptions } from "@tanstack/react-query"
import { axiosAdmin as axios } from "~/lib/axios-admin"
import type { ResWithData } from "~/types/response"
import type {
  AdminAnalytics,
  AdminUser,
  AdminVerification,
  AdminSupportConversation,
  AdminSupportMessage,
} from "~/types/admin"
import { adminKeys } from "./keys"

export function getAdminAnalyticsOptions() {
  return queryOptions({
    queryKey: adminKeys.analytics(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<AdminAnalytics>>("/admin/analytics")
      return res.data
    },
  })
}

export function getAdminUsersOptions(type?: "client" | "Freelance") {
  return queryOptions({
    queryKey: adminKeys.users(type),
    queryFn: async () => {
      const res = await axios.get<ResWithData<AdminUser[]>>("/admin/users", {
        params: type ? { role: type } : undefined,
      })
      return res.data
    },
  })
}

export function getAdminSupportConversationsOptions() {
  return queryOptions({
    queryKey: adminKeys.support.list(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<AdminSupportConversation[]>>("/admin/support/conversations")
      return res.data
    },
  })
}

export function getAdminSupportMessagesOptions(conversationId: string) {
  return queryOptions({
    enabled: !!conversationId,
    queryKey: adminKeys.support.conversation(conversationId),
    queryFn: async () => {
      const res = await axios.get<ResWithData<AdminSupportMessage[]>>(
        `/admin/support/conversations/${conversationId}/messages`,
      )
      return res.data
    },
  })
}

export function getAdminVerificationsOptions(status?: "pending" | "approved" | "rejected") {
  return queryOptions({
    queryKey: adminKeys.verifications(status),
    queryFn: async () => {
      const res = await axios.get<ResWithData<AdminVerification[]>>("/admin/verifications", {
        params: status ? { status } : undefined,
      })
      return res.data
    },
  })
}
