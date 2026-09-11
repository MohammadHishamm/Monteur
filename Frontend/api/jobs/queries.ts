import type { JobQuery as BrowseJobQuery, JobSummary } from "@/components/jobs/types"
import { queryOptions } from "@tanstack/react-query"
import { axios } from "../../lib/api/axios"
import type { WithCookies } from "../../types/common"
import type { JobQuery as ApiJobQuery, Job } from "../../types/job"
import type { ResWithData, ResWithDataMeta, TListMeta } from "../../types/response"
import { jobKeys } from "./keys"

export function getJobs({ query = {}, cookie }: WithCookies<{ query?: ApiJobQuery }>) {
  return queryOptions({
    queryKey: jobKeys.list(query as Record<string, unknown>),
    queryFn: async () => {
      const res = await axios.get<ResWithDataMeta<Job[], TListMeta>>("/jobs", {
        params: query,
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

export function getJob({ id, cookie }: WithCookies<{ id: string }>) {
  return queryOptions({
    queryKey: jobKeys.detail(id),
    queryFn: async () => {
      const res = await axios.get<ResWithData<Job>>(`/jobs/${id}`, {
        headers: { Cookie: cookie },
      })
      return res.data
    },
  })
}

interface BackendJob {
  id: string
  title: string
  summary?: string
  description?: string
  category: string
  skills?: string[]
  budget_type: string
  budget_min: number
  budget_max: number
  duration?: string
  experience?: string
  proposals?: number
  posted_at: string
  color?: string
  client_name?: string
  client_country?: string
  client_verified?: boolean
  urgent?: boolean
  aspect?: string
}

interface BackendJobsResponse {
  data?: BackendJob[]
  meta?: {
    total?: number
  }
}

function toPostedAtLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return "منذ قليل"
  if (diffHours < 24) return `قبل ${diffHours} ساعة`
  const diffDays = Math.floor(diffHours / 24)
  return `قبل ${diffDays} يوم`
}

function mapBrowseJob(j: BackendJob, index: number): JobSummary {
  return {
    id: j.id,
    title: j.title,
    summary: j.summary ?? "",
    category: j.category as JobSummary["category"],
    aspect: j.aspect,
    skills: j.skills ?? [],
    budgetType: (j.budget_type as JobSummary["budgetType"]) ?? "fixed",
    budgetMin: j.budget_min ?? 0,
    budgetMax: j.budget_max ?? 0,
    duration: j.duration ?? "",
    experience: (j.experience as JobSummary["experience"]) ?? "any",
    proposals: j.proposals ?? 0,
    postedAt: toPostedAtLabel(j.posted_at),
    postedOrder: index,
    color: j.color ?? "#6366f1",
    clientName: j.client_name ?? "",
    clientCountry: j.client_country ?? "",
    clientVerified: j.client_verified ?? false,
    urgent: j.urgent,
  }
}

export async function getJobsList(
  query: BrowseJobQuery & { page?: number; pageSize?: number }
): Promise<{ items: JobSummary[]; total: number }> {
  const { data } = await axios.get<BackendJobsResponse>("/jobs", {
    params: {
      search: query.search || undefined,
      category: query.category || undefined,
      experience: query.experience || undefined,
      budgetType: query.budgetType || undefined,
      sort: query.sort,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 9,
    },
  })

  const rawItems = Array.isArray(data.data) ? data.data : []

  return {
    items: rawItems.map(mapBrowseJob),
    total: data.meta?.total ?? rawItems.length,
  }
}
