"use client";

import React, { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { useCurrentUserType } from "@/components/layout/use-current-user";
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
  // The header and sidebar fetch the signed-in user themselves, so this layout
  // only has to settle the role. The cookie answers on the first paint; the
  // session answers authoritatively once it lands.
  const [cookieRole, setCookieRole] = useState<"client" | "freelancer">("client");
  const sessionRole = useCurrentUserType();
  const userRole = sessionRole ?? cookieRole;

  const [notifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Read after mount, not in a lazy initializer: the server has no cookie
    // access here, so seeding the first render from it would hydrate-mismatch.
    const role = getCookie("user-role") ?? getCookie("user-type");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (role === "client" || role === "freelancer") setCookieRole(role);
  }, []);

  return (
    <div dir="rtl" className="relative min-h-screen bg-background">
      {/* Fixed navbar */}
      <div className="fixed inset-x-0 top-0 z-50">
        <DashboardHeader
          userRole={userRole}
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
        <DashboardSidebar userRole={userRole} onClose={() => setSidebarOpen(false)} />
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
