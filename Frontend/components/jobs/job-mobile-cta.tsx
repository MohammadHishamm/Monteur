"use client";

import { formatJobBudget, jobBudgetLabel } from "@/components/jobs/job-budget";
import type { JobGating } from "@/components/jobs/job-gating";
import type { JobProposal } from "@/components/jobs/use-job-proposal";
import { P } from "@/lib/design-tokens";
import { ShieldAlert, Tag } from "lucide-react";
import Link from "next/link";
import type { Job } from "~/types/job";

export function JobMobileCta({
  job: j,
  proposal,
  gating,
}: {
  job: Job;
  proposal: JobProposal;
  gating: JobGating;
}) {
  const { showProposal, applied, openProposal } = proposal;
  const { effectiveClient, isUnverifiedFreelancer, verificationStatus, effectiveLoggedIn } = gating;

  if (showProposal || applied || effectiveClient) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-white/95 p-3 backdrop-blur lg:hidden"
      style={{ borderColor: P.border }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-tech text-sm font-bold tabular-nums" style={{ color: P.text }}>
          {formatJobBudget(j)}
        </p>
        <p className="text-[11px]" style={{ color: P.muted }}>
          {jobBudgetLabel(j)}
        </p>
      </div>
      {isUnverifiedFreelancer ? (
        <Link
          href="/verify"
          className="flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
          style={{ background: `#EA580C` }}
        >
          <ShieldAlert className="size-4" />
          {verificationStatus === "pending" ? "طلبك قيد المراجعة" : "تحقّق من هويتك"}
        </Link>
      ) : (
        <button
          type="button"
          onClick={openProposal}
          className="flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
          style={{ background: P.primary }}
        >
          <Tag className="size-4" />
          {effectiveLoggedIn ? "قدّم عرضك" : "سجّل دخولك"}
        </button>
      )}
    </div>
  );
}
