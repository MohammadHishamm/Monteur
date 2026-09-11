import type { BudgetType } from "./job"

export type ProjectStatus = "active" | "completed" | "disputed" | "cancelled"

export interface Project {
  id: string
  job_id: string
  proposal_id?: string | null
  client_id: string
  freelancer_id: string
  title: string
  category: string
  budget_type: BudgetType
  amount: number
  progress: number
  escrow_funded: boolean
  status: ProjectStatus
  due_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string

  // Joined
  client_name: string
  freelancer_name: string

  // Computed
  color?: string
}

export interface UpdateProjectProgressInput {
  progress: number
}
