"use client";

import { getNavbarSession } from "@/api/auth/queries";
import React, { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { MarketingFooter } from "./marketing-footer";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function MarketingLayout({
  children,
  navMode = "solid",
}: {
  children: React.ReactNode;
  navMode?: "default" | "solid";
}) {
  const [userRole, setUserRole] = useState<"client" | "freelancer">("client");
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar?: string;
    verified: boolean;
  }>({ name: "مستخدم", email: "", verified: false });
  const [notifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cookieRole = getCookie("user-role") ?? getCookie("user-type") ?? "client";
      setUserRole(cookieRole as "client" | "freelancer");

      try {
        const session = await getNavbarSession();
        if (cancelled) return;

        const hasSession = !!(session.userId || session.email || session.name);
        if (!hasSession) return;

        setUser({
          name: session.name?.trim() || "مستخدم",
          email: session.email ?? "",
          verified: true,
        });

        const latestRole = getCookie("user-role") ?? getCookie("user-type") ?? "client";
        setUserRole(latestRole as "client" | "freelancer");
      } catch {
        // keep fallback guest-like defaults when session fetch fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir="rtl" className="relative min-h-screen bg-background">
      {/* Fixed navbar */}
      <div className="fixed inset-x-0 top-0 z-50">
        <DashboardHeader
          userRole={userRole}
          user={user}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(true)}
        />
      </div>

      {/* Sidebar overlay */}
      <aside
        className={[
          "fixed top-16 bottom-0 right-0 z-40 w-65 border-l border-border bg-sidebar transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <DashboardSidebar
          userRole={userRole}
          user={user}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-h-screen flex-col pt-16">
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
