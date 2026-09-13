import { TierBadge } from "@/components/ui/tier-badge";
import { P, cardShadow } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { ArrowLeft, BadgeCheck, Play, Star, User } from "lucide-react";
import Link from "next/link";
import type { Freelancer } from "./types";

/**
 * Reusable EditorCard — used on Browse, AI Match Results, and similar-talent
 * carousels. Soft 16:9 showreel thumbnail + emerald play button + duration badge,
 * then a meta row (name, tier, match %, tools). White surface, hover lift.
 */
export function FreelancerCard({ f }: { f: Freelancer }) {
  return (
    <Link
      href={`/video-editors/${f.id}`}
      className="group flex flex-col gap-4 p-3 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: P.card,
        border: `1px solid ${P.border}`,
        boxShadow: cardShadow,
      }}
    >
      {/* ── showreel thumbnail (16:9) ── */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-[#e4e7ec]">
        {/* match score — top start */}
        <span
          className="font-tech absolute top-2 start-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold tabular-nums shadow-sm"
          style={{ color: P.primaryText }}
        >
          {f.matchScore}% تطابق
        </span>

        {/* play button — center */}
        <span className="absolute inset-0 grid place-items-center">
          <span
            className="grid size-11 place-items-center rounded-full shadow-md transition-transform duration-300 group-hover:scale-110"
            style={{ background: P.primary }}
          >
            <Play className="size-4 translate-x-px fill-current text-white" />
          </span>
        </span>

        {/* duration badge — bottom end */}
        {f.showreelDuration && (
          <span className="font-tech absolute bottom-2 end-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {f.showreelDuration}
          </span>
        )}
      </div>

      {/* ── identity row ── */}
      <div className="flex items-start gap-3 px-2">
        {f.avatar ? (
          <img
            src={f.avatar}
            alt={f.name}
            className="size-10 shrink-0 rounded-full object-cover"
            style={{ border: `1px solid ${P.border}` }}
          />
        ) : (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: `${P.primary}1A`, color: P.primary }}
          >
            <User className="size-5" strokeWidth={1.75} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-bold" style={{ color: P.text }}>
              {f.name}
            </p>
            {f.verified && (
              <BadgeCheck className="size-4 shrink-0" style={{ color: P.green }} aria-label="موثّق" />
            )}
            <TierBadge tier={f.tier} size="sm" />
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: P.muted }}>
            {f.role} · {f.city}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1">
          <Star className="size-3.5 fill-current" style={{ color: P.star }} />
          <span className="font-tech text-xs font-semibold tabular-nums" style={{ color: P.text }}>
            {f.rating.toFixed(1)}
          </span>
        </span>
      </div>

      {/* ── tools ── */}
      <div className="flex flex-wrap items-center gap-1.5 px-2">
        {(f.skills ?? []).slice(0, 3).map((s) => (
          <span
            key={s}
            className="rounded-lg px-2 py-1 text-[11px] font-medium"
            style={{ background: `${P.text}06`, border: `1px solid ${P.border}`, color: P.muted }}
          >
            {s}
          </span>
        ))}
        {(f.skills ?? []).length > 3 && (
          <span className="text-[11px] font-medium" style={{ color: P.muted }}>
            +{toArabicDigits((f.skills ?? []).length - 3)}
          </span>
        )}
      </div>

      {/* ── footer ── */}
      <div
        className="mt-auto flex items-center justify-between border-t px-2 pt-3"
        style={{ borderColor: P.border }}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-[10px]" style={{ color: P.muted }}>
            يبدأ من
          </span>
          <span className="font-tech text-sm font-bold tabular-nums" style={{ color: P.text }}>
            ${toArabicDigits(f.rate)}
          </span>
          <span className="text-[10px]" style={{ color: P.muted }}>
            /فيديو
          </span>
        </div>

        <div className="flex items-center gap-3">
          {f.available ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: P.green }} />
              <span className="text-[11px]" style={{ color: P.green }}>
                متاح
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: P.muted }} />
              <span className="text-[11px]" style={{ color: P.muted }}>
                مشغول
              </span>
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold transition-transform group-hover:-translate-x-0.5"
            style={{ color: P.primaryText }}
          >
            عرض الملف
            <ArrowLeft className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
