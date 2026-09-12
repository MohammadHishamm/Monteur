/**
 * Jobs domain types — the API contract (freelancer-side job listings).
 *
 * Mirrors the freelancers domain: pages/components depend ONLY on these types
 * plus the data-access layer in `lib/api/jobs.ts`. No seed data lives here
 * (see `mock-data.ts`, deleted once the API is live).
 *
 * Shared marketplace primitives (Category, Tier, Paginated + their labels) are
 * re-exported from the freelancers contract so both domains stay in sync.
 */
import {
  CATEGORY_LABELS,
  TIER_LABELS,
  type Category,
  type Tier,
  type Paginated,
} from "@/components/freelancers/types";

export type { Category, Tier, Paginated };
export { CATEGORY_LABELS, TIER_LABELS };

export type BudgetType = "fixed" | "hourly";

export type JobSort = "recent" | "budget" | "proposals";

/** Summary shape returned by the list endpoint (used by job cards). */
export interface JobSummary {
  id: string;
  title: string;
  /** One-line teaser shown on the card. */
  summary: string;
  category: Category;
  /** Video aspect ratio, e.g. "9:16", "16:9", "1:1". Latin digits + tnum. */
  aspect?: string;
  skills: string[];
  budgetType: BudgetType;
  /** Budget range in USD (per-project for fixed, per-hour for hourly). */
  budgetMin: number;
  budgetMax: number;
  /** Human label, e.g. "١ - ٣ أشهر". */
  duration: string;
  /** Required experience tier, or "any". */
  experience: Tier | "any";
  /** Number of proposals already submitted. */
  proposals: number;
  /** Display label, e.g. "قبل ٣ ساعات". */
  postedAt: string;
  /** Sort key for "recent" (lower = newer). Not shown in UI. */
  postedOrder: number;
  /** Accent color for the placeholder / hairline. */
  color: string;
  clientName: string;
  clientCountry: string;
  clientVerified: boolean;
  /** Flagged as time-sensitive. */
  urgent?: boolean;
}

/** The client who posted the job (shown on the detail page rail). */
export interface JobClient {
  name: string;
  country: string;
  /** Display year, e.g. "٢٠٢٣". */
  memberSince: string;
  verified: boolean;
  jobsPosted: number;
  /** Share of posted jobs that ended in a hire, 0–100. */
  hireRate: number;
  rating: number;
  reviews: number;
  color: string;
}

/** Full job shape returned by `getJobById`. */
export interface JobDetail extends JobSummary {
  description: string;
  deliverables: string[];
  client: JobClient;
  /** True if the logged-in freelancer already submitted a proposal for this job. */
  alreadyApplied: boolean;
}

/* ── Query contract ── */

export interface JobQuery {
  search?: string;
  category?: Category | "";
  experience?: Tier | "";
  budgetType?: BudgetType | "";
  sort?: JobSort;
  page?: number;
  pageSize?: number;
}

/* ── Proposal submission contract ── */

export interface ProposalInput {
  jobId: string;
  coverLetter: string;
  bid: number;
  budgetType: BudgetType;
  deliveryTime: string;
}

export interface ProposalResult {
  ok: boolean;
  proposalId: string;
}
