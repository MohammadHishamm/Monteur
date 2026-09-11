import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ⚠️ DEV: auth gating is temporarily disabled so every page is publicly
// viewable before authentication is wired up. Flip this to `true` to re-enable
// the route protection / redirects below.
const AUTH_GATING_ENABLED: boolean = true;

function isSameOrSubPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

const routeAliases = [
  { visible: "/client", internal: "/dashboard/client" },
  { visible: "/freelancer", internal: "/dashboard/freelancer" },
  { visible: "/video-editors", internal: "/freelancers" },
  { visible: "/video-jobs", internal: "/jobs" },
  { visible: "/settings", internal: "/dashboard/settings" },
];

function toInternalPath(pathname: string): string {
  for (const alias of routeAliases) {
    if (isSameOrSubPath(pathname, alias.visible)) {
      return pathname.replace(alias.visible, alias.internal);
    }
  }
  return pathname;
}

// Define protected routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/messages",
  "/payments",
  "/settings",
  "/profile",
  "/proposals",
  "/notifications",
  "/referrals",
  "/onboarding",
  "/post-job",
  "/verify",
];

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/register", "/forgot-password"];

// Session data returned by GET /auth/session
interface SessionData {
  authenticated: boolean;
  user_type: string;       // "freelancer" | "client"
  role: string;
  onboarding_done: boolean;
  verification_status: string; // "verified" | "unverified" | "pending"
}

/**
 * Fetches routing data from the backend session endpoint.
 * Forwards all browser cookies so gorilla/redistore can resolve the session.
 * Returns a safe default (unauthenticated) if the call fails.
 */
async function getSessionData(request: NextRequest): Promise<SessionData> {
  const apiBase =
    process.env.NEXT_PUBLIC_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  try {
    const res = await fetch(`${apiBase}/v1/auth/session`, {
      method: "GET",
      headers: {
        // Forward the browser's cookies so the gorilla session is resolved.
        cookie: request.headers.get("cookie") ?? "",
      },
      // Do NOT follow redirects — a redirect means the session is gone.
      redirect: "manual",
    });

    if (!res.ok) {
      return { authenticated: false, user_type: "", role: "", onboarding_done: false, verification_status: "unverified" };
    }

    const json = await res.json();
    const d = json?.data ?? {};
    return {
      authenticated: !!d.authenticated,
      user_type: d.user_type ?? "",
      role: d.role ?? "",
      onboarding_done: !!d.onboarding_done,
      verification_status: d.verification_status ?? "unverified",
    };
  } catch {
    // Network error or parse failure — treat as unauthenticated.
    return { authenticated: false, user_type: "", role: "", onboarding_done: false, verification_status: "unverified" };
  }
}

export async function middleware(request: NextRequest) {
  // Auth gating disabled for now — let every request through untouched.
  if (!AUTH_GATING_ENABLED) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // ── URL alias redirects (no auth needed) ────────────────────────────────
  if (isSameOrSubPath(pathname, "/dashboard/freelancer")) {
    const aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = pathname.replace("/dashboard/freelancer", "/freelancer");
    return NextResponse.redirect(aliasUrl);
  }
  if (isSameOrSubPath(pathname, "/dashboard/client")) {
    const aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = pathname.replace("/dashboard/client", "/client");
    return NextResponse.redirect(aliasUrl);
  }
  if (isSameOrSubPath(pathname, "/dashboard/settings")) {
    const aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = pathname.replace("/dashboard/settings", "/settings");
    return NextResponse.redirect(aliasUrl);
  }
  if (isSameOrSubPath(pathname, "/freelancers")) {
    const aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = pathname.replace("/freelancers", "/video-editors");
    return NextResponse.redirect(aliasUrl);
  }
  if (isSameOrSubPath(pathname, "/jobs")) {
    const aliasUrl = request.nextUrl.clone();
    aliasUrl.pathname = pathname.replace("/jobs", "/video-jobs");
    return NextResponse.redirect(aliasUrl);
  }
  // ────────────────────────────────────────────────────────────────────────

  const internalPath = toInternalPath(pathname);

  const isProtectedRoute = protectedRoutes.some((route) =>
    isSameOrSubPath(internalPath, route),
  );
  const isAuthRoute = authRoutes.some((route) =>
    isSameOrSubPath(internalPath, route),
  );

  // Determine whether this request needs session data.
  const needsSession =
    isProtectedRoute ||
    isAuthRoute ||
    pathname === "/" ||
    pathname === "/dashboard" ||
    isSameOrSubPath(pathname, "/dashboard/profile");

  // Fetch session from backend (only when needed for routing decisions).
  const session = needsSession
    ? await getSessionData(request)
    : { authenticated: false, user_type: "", role: "", onboarding_done: false, verification_status: "unverified" };

  const isAuthenticated = session.authenticated;
  const userRole = session.user_type || session.role; // "freelancer" | "client"
  const onboardingDone = session.onboarding_done;
  const verificationStatus = session.verification_status;

  // ── Dashboard alias redirects that need role ─────────────────────────────
  if (pathname === "/dashboard") {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", "/dashboard");
      return NextResponse.redirect(loginUrl);
    }
    const dest = userRole === "freelancer" ? "/freelancer" : "/client";
    return NextResponse.redirect(new URL(dest, request.url));
  }
  if (isSameOrSubPath(pathname, "/dashboard/profile")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const dest = userRole === "freelancer"
      ? pathname.replace("/dashboard/profile", "/freelancer/profile")
      : pathname.replace("/dashboard/profile", "/client/profile");
    return NextResponse.redirect(new URL(dest, request.url));
  }
  // ────────────────────────────────────────────────────────────────────────

  // Enforce Hard Gates for Authenticated Users (Onboarding & Verification)
  if (isAuthenticated && !isAuthRoute) {
    const isVerifyRoute = pathname === "/verify";
    const isOnboardingRoute = pathname.startsWith("/onboarding");

    // 1. Must finish onboarding
    if (!onboardingDone && !isOnboardingRoute) {
      const dest = userRole === "freelancer" ? "/onboarding/freelancer" : "/onboarding/client";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 2. Must be verified (after onboarding) to access protected routes
    if (onboardingDone && verificationStatus !== "verified" && !isVerifyRoute && !isOnboardingRoute && isProtectedRoute) {
      return NextResponse.redirect(new URL("/verify", request.url));
    }

    // 3. If already verified, don't let them sit on /verify
    if (onboardingDone && verificationStatus === "verified" && isVerifyRoute) {
      const dest = userRole === "freelancer" ? "/freelancer" : "/client";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // Redirect authenticated users away from home to their dashboard.
  if (pathname === "/" && isAuthenticated) {
    // Only redirect if they are fully verified, otherwise they would be bounced to /verify
    if (onboardingDone && verificationStatus === "verified") {
      const home = userRole === "freelancer" ? "/freelancer" : "/client";
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && isAuthenticated) {
    const home = userRole === "freelancer" ? "/freelancer" : "/client";
    // If they aren't onboarded or verified, the dashboard redirect will bounce them to the correct gate
    // on the very next request.
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Role-based access control for specific routes
  if (isAuthenticated && userRole) {
    // ── Dashboard role guards ──────────────────────────────────────────────
    // /dashboard/freelancer (and sub-routes) → freelancers only
    if (
      isSameOrSubPath(internalPath, "/dashboard/freelancer") &&
      userRole !== "freelancer"
    ) {
      return NextResponse.redirect(new URL("/client", request.url));
    }
    // /dashboard/client (root + sub-routes) → clients only
    if (
      isSameOrSubPath(internalPath, "/dashboard/client") &&
      userRole !== "client"
    ) {
      return NextResponse.redirect(new URL("/freelancer", request.url));
    }
    // ──────────────────────────────────────────────────────────────────────
    // Admin routes — gate on admin-token cookie (set by /admin/login)
    if (
      isSameOrSubPath(internalPath, "/admin") &&
      !isSameOrSubPath(internalPath, "/admin/login")
    ) {
      const adminToken = request.cookies.get("admin-token")?.value
      if (!adminToken) {
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }

    // Client-specific routes
    const clientOnlyRoutes = ["/jobs/new", "/post-job"];
    if (
      clientOnlyRoutes.some((route) => isSameOrSubPath(internalPath, route)) &&
      userRole !== "client"
    ) {
      return NextResponse.redirect(new URL("/client", request.url));
    }

    // Freelancer-specific routes
    const freelancerOnlyRoutes = ["/jobs/browse", "/proposals"];
    if (
      freelancerOnlyRoutes.some((route) =>
        isSameOrSubPath(internalPath, route),
      ) &&
      userRole !== "freelancer"
    ) {
      return NextResponse.redirect(new URL("/client", request.url));
    }
  }

  if (internalPath !== pathname) {
    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = internalPath;
    return NextResponse.rewrite(rewrittenUrl);
  }

  // Continue with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
