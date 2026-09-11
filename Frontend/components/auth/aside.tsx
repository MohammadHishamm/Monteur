"use client";

import React from "react";
import { StudioLogo } from "@/components/brand/studio-logo";
import { P, asideMetrics } from "./tokens";

// --- METRICS ROW (shared) ---
export const AsideMetrics = () => (
  <div className="flex items-center justify-between">
    {asideMetrics.map((m) => (
      <div key={m.label} className="flex flex-col">
        <span className="text-2xl font-bold" style={{ color: P.mint }}>
          {m.value}
        </span>
        <span className="text-xs" style={{ color: "#94A3B8" }}>
          {m.label}
        </span>
      </div>
    ))}
  </div>
);

/**
 * Charcoal brand panel shared by login & register (مونتير).
 * Which side it sits on is controlled by render order in the parent.
 * `children` is the middle content; `footer` is the bottom zone.
 */
export function AuthAsideShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <aside
      className="relative hidden overflow-hidden lg:flex lg:w-[44%] xl:w-[42%]"
      style={{
        background: `linear-gradient(135deg, #15171b 0%, ${P.ink} 55%, ${P.ink2} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-24 -start-24 size-[420px] rounded-full"
        style={{ background: `radial-gradient(ellipse, ${P.mint}1f, transparent 60%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -end-24 size-[420px] rounded-full"
        style={{ background: `radial-gradient(ellipse, ${P.emerald}1a, transparent 60%)` }}
      />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 xl:p-14">
        <StudioLogo tone="invert" />
        {children}
        {footer}
      </div>
    </aside>
  );
}
