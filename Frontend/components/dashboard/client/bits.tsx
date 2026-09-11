"use client";

import { BG, P } from "@/lib/design-tokens";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="mb-3 flex items-center justify-between gap-3 border-b pb-3"
        style={{ borderColor: P.border }}
      >
        <h2 className="font-bold" style={{ color: P.text }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MiniStat({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
          {label}
        </span>
      </div>
      <p className="mt-2 font-tech text-xl font-bold tabular-nums" style={{ color: P.text }}>{value}</p>
    </div>
  );
}

export function EmptyState({
  icon, text, cta,
}: {
  icon: React.ReactNode;
  text: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-10 text-center"
      style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
    >
      <span style={{ color: P.muted }}>{icon}</span>
      <p className="text-sm" style={{ color: P.muted }}>{text}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white"
          style={{ background: P.primary }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function FreelancerAvatar({ f }: { f: { name: string; color: string } }) {
  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
      style={{
        background: `${f.color}18`,
        color: f.color,
        border: `1px solid ${f.color}33`,
      }}
    >
      {f.name.trim()[0]}
    </span>
  );
}

/** Clamped cover letter that expands in place. */
export function ClampedText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div className="mt-3">
      <p
        ref={ref}
        className={`whitespace-pre-line text-sm leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
        style={{ color: P.muted }}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: P.primaryText }}
        >
          {expanded ? "عرض أقل" : "عرض العرض كامل"}
        </button>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 space-y-3">
        <div className="h-4 w-24" style={{ background: P.subtle }} />
        <div className="h-9 w-64" style={{ background: P.subtle }} />
      </div>
      <div
        className="grid grid-cols-2 gap-px lg:grid-cols-4"
        style={{ background: P.border, border: `1px solid ${P.border}` }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28" style={{ background: BG.main }} />
        ))}
      </div>
      <div className="mt-12 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28"
            style={{ background: BG.main, border: `1px solid ${P.border}` }}
          />
        ))}
      </div>
    </div>
  );
}
