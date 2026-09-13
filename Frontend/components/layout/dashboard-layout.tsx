"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import React, { useState } from "react";
import type { ChromeUser } from "./use-current-user";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "client" | "freelancer";
  /** Overrides for the fetched user — pass only the fields the page knows. */
  user?: Partial<ChromeUser>;
  pageTitle?: string;
  pageDescription?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  /**
   * Give the children the exact remaining viewport height with no padding,
   * for screens that manage their own scrolling (the chat). Default pages
   * keep the padded, page-scrolling behaviour.
   */
  fill?: boolean;
}

export function DashboardLayout({
  children,
  userRole,
  user,
  pageTitle,
  pageDescription,
  eyebrow,
  actions,
  fill = false,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div dir="rtl" className="relative min-h-screen bg-background">
      {/* ── Fixed full-width navbar ── */}
      <div className="fixed inset-x-0 top-0 z-50">
        <DashboardHeader
          userRole={userRole}
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          persistentSidebar
        />
      </div>

      {/* ── Fixed sidebar — pinned below navbar; always visible on lg+, drawer below ── */}
      <aside
        className={[
          "fixed top-16 bottom-0 right-0 z-40 w-65 border-l border-border bg-sidebar transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <DashboardSidebar
          userRole={userRole}
          user={user}
          onClose={() => setSidebarOpen(false)}
          persistent
        />
      </aside>

      {/* ── Sidebar overlay (drawer mode only) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content — offset top by navbar height, right by sidebar width on lg+ ── */}
      <div
        className={[
          "flex flex-col pt-16 lg:pr-65",
          fill ? "h-dvh overflow-hidden" : "min-h-screen",
        ].join(" ")}
      >
        <main className={fill ? "flex min-h-0 flex-1 flex-col" : "flex-1"}>
          {(pageTitle || pageDescription) && (
            <div className="border-b border-border">
              <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-2">
                  {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                  {pageTitle && (
                    <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground">
                      {pageTitle}
                    </h1>
                  )}
                  {pageDescription && (
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {pageDescription}
                    </p>
                  )}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
              </div>
            </div>
          )}
          <div className={fill ? "flex min-h-0 flex-1 flex-col" : "p-4 sm:p-6"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
