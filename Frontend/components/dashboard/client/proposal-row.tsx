"use client";

import { ClampedText, FreelancerAvatar } from "@/components/dashboard/client/bits";
import { TierBadge } from "@/components/ui/tier-badge";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { BG } from "@/lib/design-tokens";
import type { ReceivedProposal } from "@/types/client-dashboard";
import { BadgeCheck, CheckCircle2, MessageCircle, Star } from "lucide-react";
import Link from "next/link";

export function ProposalRow({
  proposal,
  locked,
  hired,
  declined,
  onHire,
  onMessage,
}: {
  proposal: ReceivedProposal;
  locked: boolean;
  hired: boolean;
  declined: boolean;
  onHire: () => void;
  onMessage: () => void;
}) {
  const f = proposal.freelancer;
  return (
    <div
      className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between"
      style={{ background: BG.main }}
    >
      {/* freelancer + excerpt */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <FreelancerAvatar f={f} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/freelancers/${f.id}`}
                className="text-sm font-bold transition-opacity hover:opacity-70"
                style={{ color: P.text }}
              >
                {f.name}
              </Link>
              {f.verified && (
                <BadgeCheck
                  className="size-4"
                  style={{ color: P.green }}
                  aria-label="موثّق"
                />
              )}
              <TierBadge tier={f.tier} size="sm" />
            </div>
            <p className="mt-0.5 text-xs" style={{ color: P.muted }}>
              {f.role}
            </p>
            <span
              className="mt-1 inline-flex items-center gap-1 text-[11px]"
              style={{ color: P.muted }}
            >
              <Star className="size-3 fill-current" style={{ color: P.star }} />
              <span
                className="font-tech font-semibold tabular-nums"
                style={{ color: P.text }}
              >
                {f.rating.toFixed(1)}
              </span>
              ({toArabicDigits(f.reviews)})
            </span>
          </div>
        </div>
        <ClampedText text={proposal.coverLetter} />
      </div>

      {/* bid + actions */}
      <div
        className="flex shrink-0 flex-col gap-3 border-t pt-4 lg:w-44 lg:border-s lg:border-t-0 lg:ps-5 lg:pt-0"
        style={{ borderColor: P.border }}
      >
        <div>
          <p
            className="tracking-tight text-2xl font-bold tabular-nums"
            style={{ color: P.text }}
          >
            ${toArabicDigits(proposal.bid)}
            {proposal.budgetType === "hourly" && (
              <span className="text-sm font-medium" style={{ color: P.muted }}>
                /س
              </span>
            )}
          </p>
          <p className="text-[11px]" style={{ color: P.muted }}>
            التسليم: {proposal.deliveryTime}
          </p>
        </div>

        {hired ? (
          <span
            className="inline-flex h-10 items-center justify-center gap-1.5 text-sm font-semibold"
            style={{ color: P.green }}
          >
            <CheckCircle2 className="size-4" />
            تم التوظيف
          </span>
        ) : declined ? (
          <span className="inline-flex h-10 items-center justify-center gap-1.5 text-xs font-semibold" style={{ color: P.muted }}>
            مرفوض
          </span>
        ) : locked ? (
          <div className="flex flex-col gap-2">
            <span className="inline-flex h-10 items-center justify-center gap-1.5 text-xs font-semibold" style={{ color: P.muted }}>
              لم يتم الاختيار
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onMessage}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <MessageCircle className="size-3.5" />
                مراسلة
              </button>
              <Link
                href={`/freelancers/${f.id}`}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-xl text-xs font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                الملف
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onHire}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: P.primary, color: "#fff" }}
            >
              توظيف
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onMessage}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <MessageCircle className="size-3.5" />
                مراسلة
              </button>
              <Link
                href={`/freelancers/${f.id}`}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-xl text-xs font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                الملف
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
