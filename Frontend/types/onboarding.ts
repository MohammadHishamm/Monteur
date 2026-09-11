import type { Category } from "~/types/freelancer"
import type { EditableProject } from "~/types/profile-editor"

/* ── Client onboarding ── */
export type CompanySize = "solo" | "small" | "medium" | "large"
export type HiringIntent = "one-project" | "ongoing" | "team" | "exploring"
export type Urgency = "now" | "soon" | "later"
export type BudgetBand = "lt500" | "500-2k" | "2k-10k" | "gt10k"
export type Engagement = "fixed" | "hourly" | "both"

export interface ClientOnboarding {
  fullName: string
  website: string
  companySize: CompanySize | ""
  industry: string
  hiringIntent: HiringIntent | ""
  urgency: Urgency | ""
  budgetBand: BudgetBand | ""
  engagement: Engagement | ""
}

/* ── Freelancer onboarding ── */
export type ExperienceLevel = "junior" | "mid" | "senior" | "expert"

export interface FreelancerOnboarding {
  fullName: string
  role: string
  city: string
  country: string
  avatar: string
  tagline: string
  about: string
  category: Category | ""
  skills: string[]
  experience: ExperienceLevel | ""
  portfolio: EditableProject[]
}

export interface OnboardingResult {
  ok: boolean
}

/* ── Backend request bodies ── */

/** Backend shape for POST /onboarding/client */
export interface ClientOnboardingBody {
  full_name: string
  company_name: string
  company_website: string
  industry: string
  company_size: ClientOnboarding["companySize"]
  hiring_intent: ClientOnboarding["hiringIntent"]
  urgency: ClientOnboarding["urgency"]
  budget_band: ClientOnboarding["budgetBand"]
  engagement: ClientOnboarding["engagement"]
}

/** Backend shape for POST /onboarding/freelancer */
export interface FreelancerOnboardingBody {
  full_name: string
  role: string
  tagline: string
  about: string
  city: string
  country: string
  category: FreelancerOnboarding["category"]
  skills: string[]
  experience: FreelancerOnboarding["experience"]
  avatar: string
  portfolio: FreelancerOnboarding["portfolio"]
}
