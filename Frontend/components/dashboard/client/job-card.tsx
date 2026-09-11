"use client";

import { STATUS_META } from "@/components/dashboard/client/constants";
import { ProposalRow } from "@/components/dashboard/client/proposal-row";
import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import { formatBudget } from "@/components/jobs/job-row";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import type { ClientJob, ReceivedProposal } from "@/types/client-dashboard";
import { ChevronDown, Clock, Tag, Wallet } from "lucide-react";

export function JobCard({
  job,
  proposals,
  open,
  onToggle,
  hired,
  declined,
  onHire,
  onMessage,
  closed,
  onClose,
  filled,
}: {
  job: ClientJob;
  proposals: ReceivedProposal[];
  open: boolean;
  onToggle: () => void;
  hired: Set<string>;
  declined: Set<string>;
  onHire: (p: ReceivedProposal) => void;
  onMessage: (freelancerId: string) => void;
  closed: boolean;
  onClose: () => void;
  filled: boolean;
}) {
  const isClosed = closed || job.status === "closed";
  const locked = isClosed || filled || job.status !== "open";
  const status = STATUS_META[isClosed ? "closed" : job.status];
  return (
    <div
      className="bg-white"
      style={{ border: `1px solid ${open ? P.primary : P.border}` }}
    >
      {/* ── header ── */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: `${job.color}10`,
                color: job.color,
                border: `1px solid ${job.color}30`,
              }}
            >
              <Tag className="size-3" />
              {CATEGORY_LABELS[job.category as Category] ?? job.category}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: `${status.color}12`,
                color: status.color,
                border: `1px solid ${status.color}30`,
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: status.color }}
              />
              {status.label}
            </span>
          </div>
          <h3 className="mt-2.5 text-base font-bold" style={{ color: P.text }}>
            {job.title}
          </h3>
          <div
            className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
            style={{ color: P.muted }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" style={{ color: P.green }} />
              <span
                className="font-tech font-semibold tabular-nums"
                style={{ color: P.text }}
              >
                {formatBudget({ budgetType: job.budget_type, budgetMin: job.budget_min, budgetMax: job.budget_max })}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {job.posted_at}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-end">
            <p
              className="tracking-tight text-xl font-bold tabular-nums"
              style={{ color: P.text }}
            >
              {toArabicDigits(job.proposals)}
            </p>
            <p className="text-[11px]" style={{ color: P.muted }}>
              عرض
            </p>
          </div>
          {!locked && !isClosed && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ border: `1px solid ${P.border}`, color: P.muted }}
            >
              إغلاق
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: `${P.primary}14`,
              color: P.primaryText,
              border: `1px solid ${P.primary}33`,
            }}
          >
            {open ? "إخفاء العروض" : "عرض العروض"}
            <ChevronDown
              className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ── proposals (tied to this job) ── */}
      {open && (
        <div
          className="border-t"
          style={{ borderColor: P.border, background: BG.subtle }}
        >
          {proposals.length > 0 ? (
            <div
              className="flex flex-col gap-px"
              style={{ background: P.border }}
            >
              {proposals.map((p) => (
                <ProposalRow
                  key={p.id}
                  proposal={p}
                  locked={locked}
                  hired={hired.has(p.freelancer.id) || p.status === "hired"}
                  declined={declined.has(p.id) || p.status === "declined"}
                  onHire={() => onHire(p)}
                  onMessage={() => onMessage(p.freelancer.id)}
                />
              ))}
            </div>
          ) : (
            <p
              className="px-5 py-8 text-center text-sm"
              style={{ color: P.muted }}
            >
              {job.status === "in_progress"
                ? "تم التعاقد على هذا البريف — لا عروض جديدة."
                : "لا توجد عروض على هذا البريف بعد."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
