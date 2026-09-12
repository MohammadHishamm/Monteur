import { TRole } from "@/lib/constants/role"

export type RoleName = "client" | "Freelance" | "Admin" | "Moderator" | "SuperAdmin" | "Accountant"

export type AuthProvider = "email" | "google" | "discord" | "github"

export type UserType = "freelancer" | "client"

export type UserStatus = "online" | "offline"


export interface UserSession {
  id: string
  email: string
  full_name: string
  user_name?: string
  avatar_url?: string | null
  user_type: UserType
  roles: RoleName[]
  is_email_verified: boolean
  is_activated: boolean
}

/**
 * Shape returned by GET /v1/auth/session (the `data` envelope payload).
 * The backend returns a FLAT object — fields are top-level, NOT nested under a
 * `session` key. See Backend/internal/handler/auth.go HandleGetSession.
 */
export type SessionResponse = {
  authenticated: boolean
  user_type: UserType | ""
  role: string
  onboarding_done: boolean
  verification_status: string
  name?: string
  email?: string
  user_id?: string
}


export interface User {
  id: string
  email: string
  full_name: string
  user_name?: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  user_type: UserType
  status: UserStatus
  avatar_url?: string | null
  bio?: string | null
  social_links?: Record<string, string>
  rating: number
  total_reviews: number

  // Freelancer fields
  hourly_rate?: number | null
  skills?: string[]
  portfolio_url?: string | null
  years_of_experience?: number | null
  tier?: string
  color?: string
  tagline?: string
  city?: string
  country?: string
  on_time_rate?: number
  response_time?: string
  completed_jobs?: number
  profile_completion?: number
  languages?: LanguageSkill[]

  // Client fields
  company_name?: string | null
  company_website?: string | null
  industry?: string | null

  // Account status
  is_email_verified: boolean
  is_activated: boolean
  is_active: boolean
  is_banned: boolean
  ban_reason?: string | null
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
  rejection_reason?: string | null

  // Timestamps
  created_at: string
  updated_at: string
  last_login_at?: string | null
  last_activity_at?: string | null

  roles: RoleName[]
}

export interface LanguageSkill {
  name: string
  level: string
}



/** Body of PUT /me/account — the backend accepts these two fields only. */
export interface UpdateAccountInput {
  full_name: string
  email: string
}

/** Client profile fields, saved across two backend endpoints (see useSaveClientProfile). */
export interface ClientProfileInput {
  full_name: string
  email: string
  company_name: string
  company_website: string
  industry: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}
