"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import React, { useState } from "react";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "client" | "freelancer";
  user?: {
    name: string;
    email: string;
    avatar?: string;
    tier?: "bronze" | "silver" | "gold" | "platinum";
    verified: boolean;
  };
  pageTitle?: string;
  pageDescription?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  userRole,
  user,
  pageTitle,
  pageDescription,
  eyebrow,
  actions,
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
        />
      </div>

      {/* ── Fixed sidebar — pinned below navbar ── */}
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

      {/* ── Sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content — offset top by navbar height ── */}
      <div className="flex min-h-screen flex-col pt-16">
        <main className="flex-1">
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
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
