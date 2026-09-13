import React from "react";
import Link from "next/link";
import { Wallet, Clock, Users, ArrowLeft, BadgeCheck, Zap, Tag, FileText, Ratio } from "lucide-react";
import { P, cardShadow } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { CATEGORY_LABELS, TIER_LABELS, type JobSummary } from "./types";

/** Formats a USD budget range, e.g. "$١٠٠٠ – $٣٠٠٠" (+ "/س" for hourly). */
export function formatBudget(
  j: Pick<JobSummary, "budgetMin" | "budgetMax" | "budgetType">,
): string {
  const suffix = j.budgetType === "hourly" ? "/س" : "";
  return `$${toArabicDigits(j.budgetMin)} – $${toArabicDigits(j.budgetMax)}${suffix}`;
}

function budgetLabel(j: Pick<JobSummary, "budgetType">): string {
  return j.budgetType === "fixed" ? "ميزانية المشروع" : "السعر بالساعة";
}

/**
 * Full-width job row — one project per line. A roomy main column (title,
 * summary, skills, meta) plus a side rail that surfaces the budget and CTA.
 */
export function JobRow({ j }: { j: JobSummary }) {
  return (
    <Link
      href={`/jobs/${j.id}`}
      className="group relative block overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 sm:p-6"
      style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: cardShadow }}
    >
      {/* top hairline reveals on hover (signature motif) */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${j.color}, transparent)` }}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* ── MAIN ── */}
        <div className="min-w-0 flex-1">
          {/* title leads, urgency sits beside it */}
          <div className="flex flex-wrap items-start gap-x-2.5 gap-y-2">
            <h3 className="min-w-0 text-lg font-bold leading-snug lg:text-xl" style={{ color: P.text }}>
              {j.title}
            </h3>
            {j.urgent && (
              <span
                className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ background: `${P.primary}14`, color: P.primaryText, border: `1px solid ${P.primary}33` }}
              >
                <Zap className="size-3" />
                عاجل
              </span>
            )}
          </div>

          {/* category + who posted it, when */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs" style={{ color: P.muted }}>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
              style={{ background: `${j.color}10`, color: j.color, border: `1px solid ${j.color}30` }}
            >
              <Tag className="size-3" />
              {CATEGORY_LABELS[j.category]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {j.clientName}
              {j.clientVerified && <BadgeCheck className="size-3.5" style={{ color: P.green }} aria-label="موثّق" />}
            </span>
            <span>{j.postedAt}</span>
          </div>

          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed lg:text-[15px]" style={{ color: P.muted }}>
            {j.summary}
          </p>

          {/* skills */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {j.skills.slice(0, 6).map((s) => (
              <span
                key={s}
                className="rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ background: `${P.text}06`, border: `1px solid ${P.border}`, color: P.muted }}
              >
                {s}
              </span>
            ))}
            {j.skills.length > 6 && (
              <span className="text-xs font-medium" style={{ color: P.muted }}>
                +{toArabicDigits(j.skills.length - 6)}
              </span>
            )}
          </div>

          {/* meta line */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs" style={{ color: P.muted }}>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {j.duration}
            </span>
            {j.aspect && (
              <span className="inline-flex items-center gap-1.5">
                <Ratio className="size-3.5" />
                <span className="font-tech tabular-nums">{j.aspect}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {j.experience === "any" ? "كل المستويات" : TIER_LABELS[j.experience]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {toArabicDigits(j.proposals)} عرض
            </span>
          </div>
        </div>

        {/* ── SIDE RAIL ── */}
        <div
          className="flex items-center justify-between gap-4 border-t pt-4 lg:w-52 lg:shrink-0 lg:flex-col lg:items-end lg:justify-center lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0 lg:text-end"
          style={{ borderColor: P.border }}
        >
          <div className="lg:w-full">
            <p className="inline-flex items-center gap-1.5 lg:flex-row-reverse lg:justify-start">
              <Wallet className="size-4 lg:hidden" style={{ color: P.green }} />
              <span className="font-tech text-2xl font-bold tabular-nums lg:text-[1.7rem]" style={{ color: P.text }}>
                {formatBudget(j)}
              </span>
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: P.muted }}>
              {budgetLabel(j)}
            </p>
          </div>

          <span
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-5 text-sm font-semibold transition-transform group-hover:-translate-x-0.5 lg:w-full"
            style={{ background: `${P.primary}1A`, color: P.primaryText, border: `1px solid ${P.primary}33` }}
          >
            عرض التفاصيل
            <ArrowLeft className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
