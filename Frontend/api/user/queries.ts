import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { ResWithData } from "../../types/response"
import type { SessionResponse, User } from "../../types/user"
import { userKeys } from "./keys"


export function getMyProfile({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<User>>("/me/profile", {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getClientDashboard({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: userKeys.dashboard.client(),
    queryFn: async () => {
      const res = await axios.get("/dashboard/client", {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getFreelancerDashboard({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: userKeys.dashboard.freelancer(),
    queryFn: async () => {
      const res = await axios.get("/dashboard/freelancer", {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}



export function getAuthUserSessionOptions({ cookie }: WithCookies = {}) {
  return queryOptions({
    queryKey: userKeys.session("auth"),
    queryFn: async () => {
      const res = await axios.get<ResWithData<SessionResponse>>(`/auth/session`, {
        headers: { Cookie: cookie },
      })

      return res.data
    },
  })
}

export function getAuthUserOptions({ cookie: cookies }: WithCookies = {}) {
  return queryOptions({
    queryKey: userKeys.details.id("auth"),
    queryFn: async () => {
      const res = await axios.get<ResWithData<User>>("/users/auth", {
        headers: {
          Cookie: cookies,
        },
      })

      return res.data
    },
  })
}