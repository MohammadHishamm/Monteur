import type { Category, Tier } from "./freelancer"

export type BudgetType = "fixed" | "hourly"

export type JobSort = "recent" | "budget" | "proposals"

export type JobStatus = "open" | "reviewing" | "in_progress" | "completed" | "closed"

export interface Job {
  id: string
  client_id: string
  title: string
  summary: string
  description: string
  category: Category
  skills: string[]
  budget_type: BudgetType
  budget_min: number
  budget_max: number
  duration: string
  experience: Tier | "any"
  deliverables: string[]
  urgent: boolean
  status: JobStatus
  proposals: number
  hired_freelancer_id?: string | null
  aspect?: string | null
  posted_at: string
  created_at: string
  updated_at: string

  // Joined from client user
  client_name: string
  client_country: string
  client_verified: boolean

  // Computed
  color?: string
  posted_order?: number
  already_applied?: boolean
}

export interface JobClient {
  name: string
  country: string
  member_since: string
  verified: boolean
  jobs_posted: number
  hire_rate: number
  rating: number
  reviews: number
  color?: string
}

export interface JobCreateInput {
  title: string
  summary: string
  description: string
  category: Category
  skills: string[]
  budget_type: BudgetType
  budget_min: number
  budget_max: number
  duration_label: string
  experience_tier: Tier | "any"
  deliverables: string[]
  urgent: boolean
  aspect?: string | null
}

export interface JobUpdateInput extends Partial<JobCreateInput> {}

export interface JobQuery {
  search?: string
  category?: Category | ""
  experience?: Tier | ""
  budget_type?: BudgetType | ""
  sort?: JobSort
  page?: number
  page_size?: number
}
