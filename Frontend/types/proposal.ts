import type { BudgetType } from "./job"

export type ProposalStatus = "new" | "shortlisted" | "hired" | "declined"

export interface Proposal {
  id: string
  job_id: string
  freelancer_id: string
  cover_letter: string
  bid: number
  budget_type: BudgetType
  delivery_time: string
  status: ProposalStatus
  client_message?: string
  submitted_at: string
  viewed_at?: string | null
  responded_at?: string | null
  created_at: string
  updated_at: string

  // Joined — job / client
  job_title: string
  client_name: string
  category: string

  // Joined — freelancer
  freelancer_name: string
  freelancer_role: string
  freelancer_tier: string
  freelancer_rating: number
  freelancer_reviews: number
  freelancer_verified: boolean
  freelancer_avatar?: string | null

  // Computed
  color?: string
}

export interface ProposalCreateInput {
  job_id: string
  cover_letter: string
  bid: number
  budget_type: BudgetType
  delivery_time: string
}

export interface UpdateProposalStatusInput {
  status: ProposalStatus
}
