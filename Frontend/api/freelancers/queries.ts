import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { Freelancer, FreelancerProfile, FreelancerQuery, Showcase } from "../../types/freelancer"
import type { ResWithData, ResWithDataMeta, TListMeta } from "../../types/response"
import type { Review } from "../../types/review"
import { freelancerKeys } from "./keys"

export function getFreelancers({
  query = {},
  cookie,
}: WithCookies<{ query?: FreelancerQuery }>) {
  return queryOptions({
    queryKey: freelancerKeys.list(query as Record<string, unknown>),
    queryFn: async () => {
      const res = await axios.get<ResWithDataMeta<Freelancer[], TListMeta>>("/freelancers", {
        params: query,
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getFreelancer({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: freelancerKeys.detail(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<FreelancerProfile>>(`/freelancers/${id}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getSimilarFreelancers({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: freelancerKeys.similar(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Freelancer[]>>(
        `/freelancers/${id}/similar`,
        { headers: { Cookie: cookie } }
      )
      return res.data
    },
  })
}

export function getFreelancerShowcases({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: freelancerKeys.showcases(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Showcase[]>>(
        `/freelancers/${id}/showcases`,
        { headers: { Cookie: cookie } }
      )
      return res.data
    },
  })
}

export function getShowcase({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: freelancerKeys.showcase(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Showcase>>(`/showcases/${id}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getFreelancerReviews({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: freelancerKeys.reviews(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Review[]>>(
        `/freelancers/${id}/reviews`,
        { headers: { Cookie: cookie } }
      )
      return res.data
    },
  })
}

export function getSavedFreelancers({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: freelancerKeys.saved(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Freelancer[]>>("/me/saved-freelancers", {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getFreelancerSavedStatus({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: freelancerKeys.savedStatus(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<{ saved: boolean }>>(
        `/freelancers/${id}/save`,
        { headers: { Cookie: cookie } }
      )
      return res.data
    },
  })
}
