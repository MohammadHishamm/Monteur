"use client";

import { inputCls } from "@/components/dashboard/freelancer-profile/constants";
import { BG, P } from "@/lib/design-tokens";
import { Plus, X } from "lucide-react";
import React, { useState } from "react";

export function Panel({
  id,
  title,
  desc,
  children,
  action,
}: {
  id: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 bg-white p-5"
      style={{ border: `1px solid ${P.border}` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: P.border }}>
        <div>
          <h2 className="font-bold" style={{ color: P.text }}>
            {title}
          </h2>
          {desc && (
            <p className="mt-0.5 text-xs" style={{ color: P.muted }}>
              {desc}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold" style={{ color: P.text }}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs" style={{ color: P.muted }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: on ? P.green : P.subtle }}
    >
      <span
        className="absolute top-1 size-5 rounded-full bg-white shadow transition-all"
        style={{ insetInlineStart: on ? "1.5rem" : "0.25rem" }}
      />
    </button>
  );
}

export function ChipInput({
  items,
  onChange,
  placeholder,
  accent = P.primary,
}: {
  items: string[] | null;
  onChange: (next: string[]) => void;
  placeholder?: string;
  accent?: string;
}) {
  const safeItems = items ?? [];
  const [draft, setDraft] = useState("");
  function commit() {
    const v = draft.trim();
    if (!v || safeItems.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...safeItems, v]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {safeItems.map((it) => (
          <span
            key={it}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium"
            style={{
              background: `${accent}10`,
              color: accent,
              border: `1px solid ${accent}30`,
            }}
          >
            {it}
            <button
              type="button"
              onClick={() => onChange(safeItems.filter((x) => x !== it))}
              aria-label={`حذف ${it}`}
              className="transition-opacity hover:opacity-60"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={commit}
          className="inline-flex h-10.5 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          <Plus className="size-4" />
          إضافة
        </button>
      </div>
    </div>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <div
      className="px-4 py-8 text-center text-sm"
      style={{ background: BG.subtle, border: `1px dashed ${P.border}`, color: P.muted }}
    >
      {text}
    </div>
  );
}
