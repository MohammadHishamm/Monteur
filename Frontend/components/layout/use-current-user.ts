"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuthUserOptions } from "~/api/user/queries";

/** The signed-in user as the navbar and sidebar need them. */
export interface ChromeUser {
  name: string;
  email: string;
  avatar?: string;
  tier?: "bronze" | "silver" | "gold" | "platinum";
  verified: boolean;
}

const TIERS = ["bronze", "silver", "gold", "platinum"] as const;

function asTier(value: string | undefined): ChromeUser["tier"] {
  return TIERS.includes(value as (typeof TIERS)[number])
    ? (value as ChromeUser["tier"])
    : undefined;
}

/**
 * The authenticated user for the app chrome (navbar + sidebar).
 *
 * Every page used to hand `user` to DashboardLayout itself, so pages without
 * profile data on hand passed a "مستخدم" placeholder — the real name, avatar
 * and tier vanished on /proposals, /projects and the dashboards. Reading it
 * here, from one shared query key, means the chrome shows the same identity on
 * every page from a single cached request.
 *
 * Returns `undefined` while loading and for signed-out visitors (the endpoint
 * 401s on public marketing pages), so callers keep their own defaults.
 */
export function useCurrentUser(): ChromeUser | undefined {
  const { data } = useQuery({
    ...getAuthUserOptions(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const u = data?.data;
  if (!u) return undefined;

  return {
    name: u.full_name?.trim() || "مستخدم",
    email: u.email ?? "",
    avatar: u.avatar_url ?? undefined,
    tier: asTier(u.tier),
    verified: !!u.is_email_verified,
  };
}

/**
 * Layers an explicit `user` prop over the fetched one. Keys whose value is
 * `undefined` are dropped first, so a page passing `avatar: undefined` doesn't
 * blank out the avatar we just fetched.
 */
export function mergeChromeUser<T extends Partial<ChromeUser>>(
  base: ChromeUser | undefined,
  override: T | undefined,
): Partial<ChromeUser> {
  const defined = Object.fromEntries(
    Object.entries(override ?? {}).filter(([, v]) => v !== undefined),
  );
  return { ...(base ?? {}), ...defined };
}

/**
 * The signed-in user's role, for layouts that pick navigation by it.
 * `undefined` while loading or when signed out — callers fall back to their
 * own default (usually the `user-role` cookie).
 */
export function useCurrentUserType(): "client" | "freelancer" | undefined {
  const { data } = useQuery({
    ...getAuthUserOptions(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const t = data?.data?.user_type;
  return t === "client" || t === "freelancer" ? t : undefined;
}
