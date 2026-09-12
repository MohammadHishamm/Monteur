import type { BudgetType } from "~/types/job"

export type JobStatus = "open" | "reviewing" | "in_progress" | "completed" | "closed"

/** A job the client posted (their own view of it). */
export interface ClientJob {
  id: string
  title: string
  category: string
  status: JobStatus
  budget_type: BudgetType
  budget_min: number
  budget_max: number
  posted_at: string
  proposals: number
  color: string
}

// Mirrors the proposals.status CHECK constraint in the database. The client UI
// used to expect "new"/"hired", which the backend never writes.
export type ProposalStatus =
  | "pending"
  | "viewed"
  | "shortlisted"
  | "accepted"
  | "declined"
  | "withdrawn"

/** Nested freelancer shape computed from flat proposal fields by the client dashboard page. */
export interface ProposalFreelancer {
  id: string
  name: string
  role: string
  tier: "bronze" | "silver" | "gold" | "platinum"
  rating: number
  reviews: number
  verified: boolean
  color: string
}

/** A proposal a freelancer submitted to one of the client's jobs. */
export interface ReceivedProposal {
  id: string
  job_id: string
  job_title: string
  freelancer_id: string
  freelancer_name: string
  freelancer_role: string
  freelancer_tier: string
  freelancer_rating: number
  freelancer_reviews: number
  freelancer_verified: boolean
  bid: number
  budget_type: BudgetType
  delivery_time: string
  cover_letter: string
  submitted_at: string
  status: ProposalStatus
  color: string
  // Computed aliases added by the client dashboard data-normalization step
  freelancer: ProposalFreelancer
  jobId: string
  coverLetter: string
  budgetType: BudgetType
  deliveryTime: string
}

/** An AI-recommended freelancer for a specific open job (Best Match AI). */
export interface BestMatch {
  job_id: string
  job_title: string
  freelancer: {
    id: string
    full_name: string
    tagline: string
    tier: string
    color: string
    is_email_verified: boolean
    rating: number
    hourly_rate?: number
  }
  match_score: number
  rate: number
}

export interface ClientStats {
  activeJobs: number
  totalProposals: number
  activeHires: number
  escrowAmount: number
}

/** An active hire (project) as the client sees it. */
export interface ClientProject {
  id: string
  title: string
  freelancer_name: string
  category: string
  amount: number
  budget_type: string
  progress: number
  escrow_funded: boolean
  status: string
  color: string
}

/** Everything the client dashboard overview needs, in one payload. */
export interface ClientDashboard {
  client: { name: string }
  stats: ClientStats
  jobs: ClientJob[]
  proposals: ReceivedProposal[]
  bestMatches: BestMatch[]
  projects: ClientProject[]
}
