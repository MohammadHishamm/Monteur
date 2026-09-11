import type { LanguageSkill } from "./user"

export type Tier = "bronze" | "silver" | "gold" | "platinum"

export type Category =
  | "reels"
  | "youtube"
  | "motion"
  | "ads"
  | "weddings"
  | "podcast"
  | "vfx"
  | "color"

export type FreelancerSort = "match" | "rating" | "rate" | "recent"

export type Paginated<T> = {
  data: T[]
  meta: {
    page: number
    total: number
    limit: number
  }
}

/** Summary shape returned by the list endpoint (used by cards). */
export interface Freelancer {
  id: string
  full_name: string
  user_name?: string
  role?: string
  category?: Category
  tier: Tier
  match_score?: number
  rating: number
  total_reviews: number
  skills?: string[]
  city?: string
  country?: string
  hourly_rate?: number | null
  available?: boolean
  verified?: boolean
  completed_jobs?: number
  color?: string
  tagline?: string
  avatar_url?: string | null
  showreel_duration?: string
}

/** Full profile shape returned by the single-freelancer endpoint. */
export interface FreelancerProfile extends Freelancer {
  bio?: string | null
  portfolio_url?: string | null
  years_of_experience?: number | null
  on_time_rate?: number
  response_time?: string
  profile_completion?: number
  languages?: LanguageSkill[]
  social_links?: Record<string, string>
  created_at: string
}

export interface Showcase {
  id: string
  freelancer_id: string
  title: string
  summary: string
  category: string
  year: string
  duration: string
  role: string
  client: string
  industry: string
  live_url?: string | null
  cover?: string | null
  video_url?: string | null
  description: string
  challenge: string
  approach: string
  outcome: string
  tags: string[]
  deliverables: string[]
  metrics: ShowcaseMetric[]
  gallery: GalleryItem[]
  is_featured: boolean
  display_order: number
  created_at: string
  updated_at: string
  color?: string
}

export interface ShowcaseMetric {
  value: string
  label: string
}

export interface GalleryItem {
  url?: string
  caption?: string
  wide?: boolean
  color?: string
}

export interface ShowcaseUpsertInput {
  title: string
  summary: string
  category: string
  year: string
  duration: string
  role: string
  client: string
  industry: string
  live_url?: string | null
  cover?: string | null
  description: string
  challenge: string
  approach: string
  outcome: string
  tags: string[]
  deliverables: string[]
  metrics: ShowcaseMetric[]
  gallery: GalleryItem[]
  is_featured: boolean
  display_order: number
}

export interface FreelancerQuery {
  search?: string
  category?: Category | ""
  tier?: Tier | ""
  sort?: FreelancerSort
  page?: number
  page_size?: number
}
