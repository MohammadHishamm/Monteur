import type { Category, Tier } from "~/types/freelancer"
import type { LanguageSkill } from "~/types/user"

/** A portfolio case study the freelancer authors (→ /projects/[id]). */
export interface EditableProject {
  /** Stable id — links to the public case study. New ones are generated. */
  id: string
  title: string
  /** One-line description shown on the tile. */
  summary: string
  category: Category
  /** Display year, e.g. "٢٠٢٤". */
  year: string
  /** Human label, e.g. "١٠ أسابيع". */
  duration: string
  /** Optional live link to the shipped work. */
  liveUrl?: string
  /** Full project description ("وصف المشروع"). */
  description: string
  /**
   * Thumbnail image (single). Stored as images[0] → cover_url on the backend.
   */
  images: string[]
  /** Hosted URL of the portfolio video (mp4/webm). Empty string = no video. */
  videoUrl?: string
}

/** The freelancer's own editable profile. */
export interface EditableProfile {
  id: string
  name: string
  /** Profile picture URL (hosted /uploads/... path, or empty). */
  avatar: string
  /** Professional title, e.g. "مطورة Full-Stack". */
  role: string
  /** Short tagline shown on the card. */
  tagline: string
  /** Long professional bio ("نبذة احترافية"). */
  about: string
  category: Category
  city: string
  country: string
  /** Hourly rate in USD. */
  rate: number
  available: boolean
  skills: string[]
  languages: LanguageSkill[]
  projects: EditableProject[]
  /** Read-only context (shown, not edited here). */
  color: string
  tier: Tier
}

/** Returned by a save call. */
export interface SaveProfileResult {
  ok: boolean
  profile: EditableProfile
}
