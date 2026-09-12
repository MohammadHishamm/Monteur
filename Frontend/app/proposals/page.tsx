"use client";

import { CATEGORY_LABELS } from "@/components/freelancers/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import type { Proposal, ProposalStatus } from "@/types/proposal";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileText, Search, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getMyProposals } from "~/api/proposals/queries";

const PAGE_TITLE = "عروضي";
const PAGE_DESC = "كل العروض التي قدّمتها وحالتها الحالية.";

/** Same labels/colors as the dashboard, so a status looks identical everywhere. */
const STATUS: Record<ProposalStatus, { label: string; color: string }> = {
  pending:     { label: "قيد المراجعة",        color: "#b45309" },
  viewed:      { label: "تمت المشاهدة",        color: "#1d4ed8" },
  shortlisted: { label: "في القائمة المختصرة", color: "#6d28d9" },
  accepted:    { label: "مقبول ✓",             color: P.primaryText },
  declined:    { label: "مرفوض",               color: "#dc2626" },
  withdrawn:   { label: "مسحوب",               color: P.muted },
};

const FILTERS: { id: ProposalStatus | "all"; label: string }[] = [
  { id: "all",         label: "الكل" },
  { id: "pending",     label: "قيد المراجعة" },
  { id: "shortlisted", label: "مختصرة" },
  { id: "accepted",    label: "مقبولة" },
  { id: "declined",    label: "مرفوضة" },
];

export default function MyProposalsPage() {
  const { data, isPending, isError } = useQuery(getMyProposals({})) as {
    data: { data: Proposal[] } | undefined;
    isPending: boolean;
    isError: boolean;
  };
  const [filter, setFilter] = useState<ProposalStatus | "all">("all");

  const proposals = data?.data ?? [];
  const shown = filter === "all" ? proposals : proposals.filter((p) => p.status === filter);
  const countFor = (id: ProposalStatus | "all") =>
    id === "all" ? proposals.length : proposals.filter((p) => p.status === id).length;

  return (
    <DashboardLayout
      userRole="freelancer"
      pageTitle={PAGE_TITLE}
      pageDescription={PAGE_DESC}
      user={{ name: "مستخدم", email: "", verified: true }}
      actions={
        <Link
          href="/jobs"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: P.primary }}
        >
          <Search className="size-3.5" />
          تصفّح الوظائف
        </Link>
      }
    >
      <div dir="rtl" className="flex flex-col gap-4">
        {isPending ? (
          <div className="flex animate-pulse flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28" style={{ background: P.subtle }} />
            ))}
          </div>
        ) : isError ? (
          <p className="bg-white p-5 text-sm" style={{ border: `1px solid ${P.border}`, color: P.muted }}>
            تعذّر تحميل العروض. حاول تحديث الصفحة.
          </p>
        ) : proposals.length === 0 ? (
          <EmptyState
            text="لم تقدّم أي عرض حتى الآن"
            cta={{ label: "ابحث عن وظيفة", href: "/jobs" }}
          />
        ) : (
          <>
            {/* filters */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={
                      active
                        ? { background: `${P.primary}14`, color: P.primaryText, border: `1px solid ${P.primary}40` }
                        : { background: "white", color: P.muted, border: `1px solid ${P.border}` }
                    }
                  >
                    {f.label}
                    <span className="font-tech tabular-nums">{toArabicDigits(countFor(f.id))}</span>
                  </button>
                );
              })}
            </div>

            {shown.length === 0 ? (
              <EmptyState text="لا توجد عروض بهذه الحالة" />
            ) : (
              <div className="flex flex-col gap-3">
                {shown.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ════════════ PROPOSAL CARD ════════════ */
function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  const status = STATUS[p.status] ?? { label: p.status, color: P.muted };

  return (
    <article
      className="flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
      style={{ border: `1px solid ${P.border}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${P.primary}10`, color: P.primaryText, border: `1px solid ${P.primary}30` }}
          >
            <Tag className="size-3" />
            {CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${status.color}12`, color: status.color, border: `1px solid ${status.color}30` }}
          >
            <span className="size-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
        </div>

        <Link
          href={`/jobs/${p.job_id}`}
          className="mt-2 block text-sm font-bold transition-opacity hover:opacity-70"
          style={{ color: P.text }}
        >
          {p.job_title}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: P.muted }}>
          <span>{p.client_name}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(p.submitted_at).toLocaleDateString("ar-SA")}
          </span>
        </div>

        {p.cover_letter && (
          <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs leading-relaxed" style={{ color: P.muted }}>
            {p.cover_letter}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
        <div className="text-end">
          <p className="font-tech text-lg font-bold tabular-nums" style={{ color: P.text }}>
            ${toArabicDigits(Math.round(p.bid))}
            {p.budget_type === "hourly" && (
              <span className="text-xs font-medium" style={{ color: P.muted }}>/س</span>
            )}
          </p>
          <p className="text-[11px]" style={{ color: P.muted }}>{p.delivery_time}</p>
        </div>
        <Link
          href={`/jobs/${p.job_id}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          عرض الوظيفة <ArrowLeft className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

/* ════════════ EMPTY STATE ════════════ */
function EmptyState({ text, cta }: { text: string; cta?: { label: string; href: string } }) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-12 text-center"
      style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
    >
      <FileText className="size-6" style={{ color: P.muted }} />
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
