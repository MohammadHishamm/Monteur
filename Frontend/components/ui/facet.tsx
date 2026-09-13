"use client";

import { P } from "@/lib/design-tokens";
import { Check } from "lucide-react";
import React from "react";

/**
 * Shared building blocks for the browse filter rails (jobs + editors).
 *
 * Both rails show every option openly instead of hiding them in dropdowns, so
 * they need the same three controls: a titled group, a full-width row for long
 * lists, and a pill for short ones. Keeping them here means the two pages can
 * never drift apart visually.
 */

/** Group heading inside a rail. */
export function FacetGroup({
  title,
  children,
  first = false,
}: {
  title: string;
  children: React.ReactNode;
  /** The first group sits right under the panel header, so it needs no top gap. */
  first?: boolean;
}) {
  return (
    <div className={first ? "mt-4 border-t pt-4" : "mt-5 border-t pt-4"} style={{ borderColor: P.border }}>
      <p className="mb-2.5 text-xs font-semibold" style={{ color: P.text }}>
        {title}
      </p>
      {children}
    </div>
  );
}

/** Full-width selectable row — for the long lists (category, city). */
export function FacetRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors hover:bg-black/[0.03]"
      style={{
        background: selected ? `${P.primary}14` : "transparent",
        color: selected ? P.primaryText : P.muted,
        fontWeight: selected ? 600 : 400,
      }}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="size-4 shrink-0" aria-hidden />}
    </button>
  );
}

/** Compact pill — for the short facets (level, budget type). */
export function FacetChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="rounded-lg px-3 py-1.5 text-xs transition-colors"
      style={{
        background: selected ? `${P.primary}14` : P.card,
        color: selected ? P.primaryText : P.muted,
        border: `1px solid ${selected ? `${P.primary}33` : P.border}`,
        fontWeight: selected ? 600 : 500,
      }}
    >
      {label}
    </button>
  );
}

/** Standalone on/off row, for a facet that is a single yes-or-no question. */
export function FacetToggle({
  label,
  hint,
  on,
  onToggle,
  accent = P.primary,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-black/[0.03]"
      style={{ background: on ? `${accent}14` : "transparent" }}
    >
      <span className="min-w-0">
        <span
          className="block truncate text-sm"
          style={{ color: on ? accent : P.text, fontWeight: on ? 600 : 500 }}
        >
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block truncate text-[11px]" style={{ color: P.muted }}>
            {hint}
          </span>
        )}
      </span>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{ background: on ? accent : P.subtle, border: `1px solid ${on ? accent : P.border}` }}
      >
        <span
          className="absolute size-3.5 rounded-full bg-white transition-transform"
          style={{ insetInlineStart: 2, transform: on ? "translateX(-16px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

/** Panel header: title on the start, "clear all" once anything is active. */
export function FacetPanelHeader({
  title,
  showReset,
  onReset,
}: {
  title: string;
  showReset: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-bold" style={{ color: P.text }}>
        {title}
      </p>
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: P.primaryText }}
        >
          مسح الكل
        </button>
      )}
    </div>
  );
}
