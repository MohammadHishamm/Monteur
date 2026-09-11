import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { ResWithData } from "../../types/response"
import type { SeoOptions, SeoTemplate, TPageType } from "../../types/seo"
import { seoKeys } from "./keys"

export function getSeoOptions({ cookie }: WithCookies) {
  return queryOptions({
    queryKey: seoKeys.options.lists(),
    queryFn: async () => {
      const res = await axios.get<ResWithData<SeoOptions>>("/seo/options", {
        headers: { Cookie: cookie },
      })

      return res.data
    },
  })
}

export function getSeoTemplateByType({ type, cookie }: WithCookies<{ type: TPageType }>) {
  return queryOptions({
    queryKey: seoKeys.templates.byType(type),
    queryFn: async () => {
      const res = await axios.get<ResWithData<SeoTemplate>>(`/seo/templates/${type}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getSeoTemplateJob({ jobId, cookie }: WithCookies<{ jobId: string }>) {
  return queryOptions({
    queryKey: seoKeys.templates.job(jobId),
    queryFn: async () => {
      const res = await axios.get<ResWithData<SeoTemplate>>(`/seo/jobs/${jobId}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getSeoTemplateFreelancer({
  freelancerId,
  cookie,
}: WithCookies<{ freelancerId: string }>) {
  return queryOptions({
    queryKey: seoKeys.templates.freelancer(freelancerId),
    queryFn: async () => {
      const res = await axios.get<ResWithData<SeoTemplate>>(`/seo/freelancers/${freelancerId}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getSeoTemplateProject({ projectId, cookie }: WithCookies<{ projectId: string }>) {
  return queryOptions({
    queryKey: seoKeys.templates.project(projectId),
    queryFn: async () => {
      const res = await axios.get<ResWithData<SeoTemplate>>(`/seo/projects/${projectId}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}
