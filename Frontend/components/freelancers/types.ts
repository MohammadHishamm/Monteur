/**
 * Freelancer domain types — the API contract.
 *
 * These describe the exact shape the backend must return. Pages and components
 * depend ONLY on these types + the data-access layer in `lib/api/freelancers.ts`.
 * No seed data lives here (see `mock-data.ts`, which is deleted once the API is live).
 */

export type Tier = "bronze" | "silver" | "gold" | "platinum";

/** Editing niches — the marketplace categories. */
export type Category =
  | "reels" // ريلز/شورتس
  | "youtube" // مونتاج يوتيوب
  | "motion" // موشن جرافيك
  | "ads" // إعلانات
  | "weddings" // مونتاج أعراس
  | "podcast" // بودكاست
  | "vfx" // VFX وتأثيرات
  | "color"; // تلوين سينمائي

/** Summary shape returned by the list endpoint (used by cards). */
export interface Freelancer {
  id: string;
  name: string;
  /** Editing niche / title, e.g. "مونتيرة ريلز وشورتس". */
  role: string;
  category: Category;
  /** Showreel length, Latin digits + tnum, e.g. "01:24". */
  showreelDuration?: string;
  tier: Tier;
  /** AI match score 0–100 (used for the "الأعلى تطابقاً" sort). */
  matchScore: number;
  rating: number;
  reviews: number;
  skills: string[];
  city: string;
  country: string;
  /** Starting hourly rate in USD. */
  rate: number;
  available: boolean;
  verified: boolean;
  completed: number;
  /** Accent color used for the avatar tint / placeholder. */
  color: string;
  /** Short tagline shown on the card. */
  tagline: string;
  /** Profile photo URL — present once the freelancer completes their profile. */
  avatar?: string;
}

/* ── Detail-only sub-shapes (returned by the single-freelancer endpoint) ── */

export interface PortfolioItem {
  id: string;
  title: string;
  tags: string[];
  /** Optional thumbnail; falls back to a tinted placeholder. */
  image?: string;
  color?: string;
}

export interface Review {
  id: string;
  authorName: string;
  authorRole: string;
  rating: number;
  text: string;
  date: string;
  authorAvatar?: string;
  /** Accent color for the author placeholder. */
  color?: string;
}

export interface RatingBucket {
  stars: number;
  /** Percentage of reviews at this star level (0–100). */
  pct: number;
}

export type VerificationKind = "identity" | "email" | "payment";

export interface Verification {
  kind: VerificationKind;
  verified: boolean;
}

export interface LanguageSkill {
  name: string;
  /** e.g. "لغة أم", "محترف". */
  level: string;
}

/** Full profile shape returned by `getFreelancerById`. */
export interface FreelancerProfile extends Freelancer {
  about: string;
  /** Display year/string, e.g. "٢٠٢٣". */
  memberSince: string;
  /** On-time delivery rate 0–100. */
  onTimeRate: number;
  /** Human label, e.g. "< ساعة". */
  responseTime: string;
  languages: LanguageSkill[];
  verifications: Verification[];
  portfolio: PortfolioItem[];
  reviewList: Review[];
  ratingBreakdown: RatingBucket[];
  /** Progress toward the next tier, 0–100. */
  tierProgress: number;
  /** Next tier to reach, or null at the top. */
  nextTier: Tier | null;
}

/* ── Project case study (full portfolio detail) ── */

export interface ProjectImage {
  id: string;
  caption?: string;
  /** Optional real image URL; falls back to a tinted gradient placeholder. */
  url?: string;
  /** Accent color for the placeholder. */
  color?: string;
  /** Layout hint — a featured image spans the full gallery width. */
  wide?: boolean;
}

export interface ProjectMetric {
  /** Headline figure, e.g. "٤٨٪". */
  value: string;
  label: string;
}

/** Attribution block — the freelancer who produced the project. */
export interface ProjectAuthor {
  id: string;
  name: string;
  role: string;
  tier: Tier;
  color: string;
  verified: boolean;
  avatar?: string;
}

/** Lightweight project shape for tiles / "more work" grids. */
export interface ProjectSummary {
  id: string;
  /** The freelancer this project belongs to (used for back-links). */
  freelancerId: string;
  title: string;
  /** One-line description shown on the tile. */
  summary: string;
  tags: string[];
  color: string;
  image?: string;
}

/** Full case-study shape returned by `getProjectById`. */
export interface ProjectDetail extends ProjectSummary {
  category: Category;
  /** Display year, e.g. "٢٠٢٤". */
  year: string;
  /** Human label, e.g. "١٠ أسابيع". */
  duration: string;
  /** The freelancer's role on the project, e.g. "المطوّر الرئيسي". */
  role: string;
  client: string;
  industry: string;
  /** Optional live link to the shipped work. */
  liveUrl?: string;
  /** Optional hero/cover image; falls back to a tinted gradient. */
  cover?: string;
  /** Full project description (shown as the main "وصف المشروع" section). */
  description: string;
  /** التحدي — the problem. */
  challenge: string;
  /** المقاربة — the approach / solution. */
  approach: string;
  /** النتيجة — the outcome. */
  outcome: string;
  deliverables: string[];
  metrics: ProjectMetric[];
  gallery: ProjectImage[];
  author: ProjectAuthor;
}

/* ── UI display labels (i18n, not data) ── */

export const CATEGORY_LABELS: Record<Category, string> = {
  reels: "ريلز وشورتس",
  youtube: "مونتاج يوتيوب",
  motion: "موشن جرافيك",
  ads: "إعلانات",
  weddings: "مونتاج أعراس",
  podcast: "بودكاست",
  vfx: "VFX وتأثيرات",
  color: "تلوين سينمائي",
};

export const TIER_LABELS: Record<Tier, string> = {
  bronze: "برونزي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

export const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "platinum"];

/* ── Query + pagination contracts ── */

export type FreelancerSort = "match" | "rating" | "rate" | "completed";

export interface FreelancerQuery {
  search?: string;
  category?: Category | "";
  tier?: Tier | "";
  city?: string;
  availableOnly?: boolean;
  sort?: FreelancerSort;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
