/**
 * Auth utilities.
 *
 * All user data lives exclusively in the server-side Redis session.
 * The only cookie is the gorilla/redistore session-ID (HttpOnly, set by the backend).
 * The frontend never reads or writes auth data from cookies.
 */

import type { AuthResponse } from "~/api/auth/mutations";
import { appConfig } from "~/config/app";
import type { User } from "~/types/user";

/**
 * @deprecated No-op. Backend manages the session cookie.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setAuthCookies(_data: AuthResponse) {}

/**
 * @deprecated No-op. Routing data comes from the backend session endpoint.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setUserStatusCookies(_user: User) {}

/** No extra cookies to clear; the backend clears the session on /auth/signout. */
export function clearAuthCookies() {}

/**
 * Calls the backend /auth/signout endpoint to invalidate the server-side session,
 * then redirects to /login.
 */
export async function signOutAndRedirect(): Promise<void> {
  if (typeof window !== "undefined") {
    const authPaths = new Set(["/login", "/register", "/forgot-password"]);
    if (authPaths.has(window.location.pathname)) {
      // Already on an auth page; avoid hard-reload loops.
      return;
    }
  }

  try {
    await fetch(`${appConfig.apiDomain}/v1/auth/signout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network errors — redirect regardless.
  }
  window.location.href = "/login";
}

export function getRedirectHome(roles: string[]): string {
  return roles.includes("Freelance") ? "/freelancer" : "/client";
}
