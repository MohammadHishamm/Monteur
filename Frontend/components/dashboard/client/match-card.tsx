"use client";

import { FreelancerAvatar } from "@/components/dashboard/client/bits";
import { TierBadge } from "@/components/ui/tier-badge";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import type { BestMatch } from "@/types/client-dashboard";
import { BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

export function MatchCard({
  match,
  hired,
  locked,
  onHire,
}: {
  match: BestMatch;
  hired: boolean;
  locked: boolean;
  onHire: () => void;
}) {
  const f = match.freelancer;
  return (
    <div
      className="flex flex-col gap-4 bg-white p-5"
      style={{ border: `1px solid ${hired ? P.green : `${P.primary}33`}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <FreelancerAvatar f={{ name: f.full_name, color: f.color }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold" style={{ color: P.text }}>
                {f.full_name}
              </p>
              {f.is_email_verified && (
                <BadgeCheck className="size-3.5" style={{ color: P.green }} />
              )}
            </div>
            <p className="truncate text-[11px]" style={{ color: P.muted }}>
              {f.tagline}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-end">
          <p
            className="font-tech text-base font-bold tabular-nums"
            style={{ color: P.primaryText }}
          >
            {toArabicDigits(match.match_score)}٪
          </p>
          <p className="text-[10px]" style={{ color: P.muted }}>
            تطابق
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <TierBadge tier={f.tier as "bronze" | "silver" | "gold" | "platinum"} size="sm" />
        <span className="text-xs" style={{ color: P.muted }}>
          <span
            className="font-tech font-semibold tabular-nums"
            style={{ color: P.text }}
          >
            ${toArabicDigits(match.rate)}
          </span>
          /س
        </span>
      </div>

      {hired ? (
        <span
          className="inline-flex h-10 items-center justify-center gap-1.5 text-sm font-semibold"
          style={{ color: P.green }}
        >
          <CheckCircle2 className="size-4" />
          تم التوظيف
        </span>
      ) : locked ? (
        <span
          className="inline-flex h-10 items-center justify-center gap-1.5 text-sm font-semibold"
          style={{ color: P.muted }}
        >
          اكتمل التعاقد
        </span>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onHire}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: P.primary, color: "#fff" }}
          >
            <Sparkles className="size-4" />
            توظيف بنقرة
          </button>
          <Link
            href={`/freelancers/${f.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold transition-colors hover:bg-black/5"
            style={{ border: `1px solid ${P.border}`, color: P.text }}
          >
            الملف
          </Link>
        </div>
      )}
    </div>
  );
}
