import type { Category, Tier } from "~/types/freelancer"
import type { BudgetType } from "~/types/job"

/** Status of a proposal the freelancer sent to a client's job. */
export type SentProposalStatus =
  | "pending"
  | "viewed"
  | "shortlisted"
  | "accepted"
  | "declined"

export interface SentProposal {
  id: string
  /** Job id — links to /jobs/[id]. */
  jobId: string
  jobTitle: string
  clientName: string
  category: Category
  bid: number
  budgetType: BudgetType
  deliveryTime: string
  status: SentProposalStatus
  submittedAt: string
  /** The cover letter the freelancer submitted (clamped in the UI). */
  coverLetter: string
  color: string
}

/** An ongoing contract the freelancer is working on. */
export interface ActiveProject {
  id: string
  title: string
  clientName: string
  category: Category
  /** Agreed contract value in USD. */
  amount: number
  budgetType: BudgetType
  /** Completion 0–100. */
  progress: number
  /** Whether the client has funded escrow. */
  escrowFunded: boolean
  /** Human label, e.g. "خلال أسبوعين". */
  dueIn: string
  color: string
}

/** An AI-recommended open job for this freelancer (links to /jobs/[id]). */
export interface RecommendedJob {
  id: string
  title: string
  category: Category
  budgetType: BudgetType
  budgetMin: number
  budgetMax: number
  /** AI match score 0–100. */
  matchScore: number
  color: string
}

export interface ProfileChecklistItem {
  key: string
  label: string
  done: boolean
}

export interface FreelancerStats {
  /** Proposals still in play (pending / viewed / shortlisted). */
  activeProposals: number
  activeProjects: number
  /** Earnings this month, USD. */
  monthEarnings: number
  rating: number
}

export interface FreelancerDashboard {
  freelancer: {
    id: string
    name: string
    role: string
    tier: Tier
    color: string
    /** Profile completeness 0–100. */
    profileComplete: number
  }
  stats: FreelancerStats
  proposals: SentProposal[]
  projects: ActiveProject[]
  recommended: RecommendedJob[]
  checklist: ProfileChecklistItem[]
}
