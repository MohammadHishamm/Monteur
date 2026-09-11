import type { RoleName, UserType } from "~/types/user"

/**
 * Normalized, camelCase session used across the app. This is the SINGLE source
 * of truth for the shape of the current user's session — every consumer should
 * obtain it via `mapSession` rather than reaching into the raw API payload.
 *
 * Why: the backend `GET /v1/auth/session` returns a FLAT snake_case object
 * (authenticated, user_type, role, user_id, …). Historically several call sites
 * each parsed that payload independently and some assumed a nested
 * `{ session: { id, roles } }` shape, which silently broke auth/notifications.
 * Centralising the parse here prevents that drift.
 */
export interface AppSession {
  authenticated: boolean
  userId: string
  userType: UserType | ""
  /** Backend returns a single role string; normalised to an array here. */
  roles: RoleName[]
  verificationStatus: string
  onboardingDone: boolean
  name: string
  email: string
}

/** Raw flat payload as returned inside the `data` envelope of /auth/session. */
interface RawSession {
  authenticated?: boolean
  user_type?: string
  role?: string
  verification_status?: string
  onboarding_done?: boolean
  name?: string
  email?: string
  user_id?: string
}

/**
 * Parse the session response into an {@link AppSession}.
 *
 * Accepts either the axios envelope (`{ data: {...} }`) or an already-unwrapped
 * payload, so it works whether the caller passes `res.data` or `res.data.data`.
 * Always returns a value (never throws); an unauthenticated/empty response maps
 * to `{ authenticated: false, … }` with empty fields.
 */
export function mapSession(raw: unknown): AppSession {
  const outer = (raw ?? {}) as { data?: RawSession } & RawSession
  // Prefer the enveloped payload when present, else treat `raw` as the payload.
  const d: RawSession = outer.data ?? outer

  return {
    authenticated: !!d.authenticated,
    userId: d.user_id ?? "",
    userType: (d.user_type ?? "") as UserType | "",
    roles: d.role ? [d.role as RoleName] : [],
    verificationStatus: d.verification_status ?? "unverified",
    onboardingDone: !!d.onboarding_done,
    name: d.name ?? "",
    email: d.email ?? "",
  }
}
