"use client";

import { formatJobBudget, jobBudgetLabel } from "@/components/jobs/job-budget";
import type { JobGating } from "@/components/jobs/job-gating";
import type { JobProposal } from "@/components/jobs/use-job-proposal";
import { BG, P } from "@/lib/design-tokens";
import { ArrowLeft, BadgeCheck, Briefcase, CheckCircle2, MapPin, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Job } from "~/types/job";

export function JobRail({
  job: j,
  proposal,
  gating,
}: {
  job: Job;
  proposal: JobProposal;
  gating: JobGating;
}) {
  const { applied, openProposal } = proposal;
  const { effectiveClient, isUnverifiedFreelancer, verificationStatus, effectiveLoggedIn } = gating;
  const fmtBudget = formatJobBudget(j);

  return (
    <aside className="pb-14 lg:sticky lg:top-6 lg:self-start lg:pt-14">
      <div className="rounded-2xl" style={{ border: `1px solid ${P.border}` }}>
        {/* budget + CTA */}
        <div className="border-b p-5" style={{ borderColor: P.border }}>
          <p className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
            {jobBudgetLabel(j)}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums" style={{ color: P.text }}>
            {fmtBudget}
          </p>
          {applied ? (
            <div
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
              style={{ background: `${P.green}14`, color: P.green, border: `1px solid ${P.green}33` }}
            >
              <CheckCircle2 className="size-4" />
              تم تقديم عرضك
            </div>
          ) : effectiveClient ? (
            <div
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
              style={{ background: BG.subtle, color: P.muted, border: `1px solid ${P.border}` }}
            >
              حساب عميل
            </div>
          ) : isUnverifiedFreelancer ? (
            <Link
              href="/verify"
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: `#EA580C` }}
            >
              <ShieldAlert className="size-4" />
              {verificationStatus === "pending" ? "طلبك قيد المراجعة" : "تحقّق لتقديم عرض"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={openProposal}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: P.primary }}
            >
              {effectiveLoggedIn ? "قدّم عرضك" : "سجّل دخولك لتقديم عرض"}
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: P.muted }}>
            <ShieldCheck className="size-3.5" style={{ color: P.green }} />
            مدفوعات محمية بالضمان
          </div>
        </div>

        {/* about the client */}
        <div className="p-5">
          <p className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
            عن العميل
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: P.subtle, color: P.primary, border: `1px solid ${P.primary}20` }}
            >
              <Briefcase className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-bold" style={{ color: P.text }}>
                {j.client_name}
                {j.client_verified && <BadgeCheck className="size-4 shrink-0" style={{ color: P.green }} />}
              </p>
              <p className="inline-flex items-center gap-1 text-[11px]" style={{ color: P.muted }}>
                <MapPin className="size-3" />
                {j.client_country}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
