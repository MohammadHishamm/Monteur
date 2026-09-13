"use client";

import { CATEGORY_LABELS } from "@/components/freelancers/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BG, P } from "@/lib/design-tokens";
import { arNumber, toArabicDigits } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  Star,
  Tag,
  UserPen,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useUpdateProjectProgress } from "~/api/projects/mutations";
import { getFreelancerDashboard } from "~/api/user/queries";

/* ─── API shapes (snake_case from backend) ─────────────────── */
interface APIProposal {
  id: string;
  job_id: string;
  job_title: string;
  client_name: string;
  category: string;
  bid: number;
  budget_type: "fixed" | "hourly";
  delivery_time: string;
  // Values from the proposals table CHECK constraint.
  status: "pending" | "viewed" | "shortlisted" | "accepted" | "declined" | "withdrawn";
  cover_letter: string;
  submitted_at: string;
  color: string;
}
interface APIProject {
  id: string;
  title: string;
  client_name: string;
  category: string;
  amount: number;
  budget_type: "fixed" | "hourly";
  progress: number;
  escrow_funded: boolean;
  due_at?: string | null;
  color: string;
}
interface APIJob {
  id: string;
  title: string;
  category: string;
  budget_type: "fixed" | "hourly";
  budget_min: number;
  budget_max: number;
  color: string;
}
interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}
interface Dashboard {
  freelancer: {
    id: string;
    name: string;
    role: string;
    tier: string;
    color: string;
    profile_complete: number;
  };
  stats: {
    active_proposals: number;
    active_projects: number;
    month_earnings: number;
    rating: number;
  };
  proposals: APIProposal[];
  projects: APIProject[];
  recommended: APIJob[];
  checklist: ChecklistItem[];
}

// Each status gets its own hue (text colors chosen to stay readable on their light tint).
const PROP_STATUS: Record<APIProposal["status"], { label: string; color: string }> = {
  pending:     { label: "قيد المراجعة",        color: "#b45309" }, // amber: waiting
  viewed:      { label: "تمت المشاهدة",        color: "#1d4ed8" }, // blue: seen by client
  shortlisted: { label: "في القائمة المختصرة", color: "#6d28d9" }, // violet: moving forward
  accepted:    { label: "مقبول ✓",             color: P.primaryText }, // emerald: won
  declined:    { label: "مرفوض",               color: "#dc2626" }, // red: lost
  withdrawn:   { label: "مسحوب",               color: P.muted   }, // grey: withdrawn by you
};

/* ══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function FreelancerDashboardPage() {
  const { data: queryData, isPending } = useQuery(getFreelancerDashboard({})) as {
    data: { data: Dashboard } | undefined;
    isPending: boolean;
  };

  const raw = queryData?.data;
  const data = raw
    ? {
        ...raw,
        proposals:   raw.proposals   ?? [],
        projects:    raw.projects    ?? [],
        recommended: raw.recommended ?? [],
        checklist:   raw.checklist   ?? [],
      }
    : undefined;

  if (isPending || !data)
    return (
      <DashboardLayout
        userRole="freelancer"
        pageTitle="لوحة التحكم"
        pageDescription="نظرة سريعة على العروض، الأعمال الجارية، وتقدّم حسابك."
      >
        <Skeleton />
      </DashboardLayout>
    );

  const f  = data.freelancer;
  const st = data.stats;

  const MAX_PROPOSALS = 15;
  const usedSlots = data.proposals.length;
  const countByStatus = (s: APIProposal["status"]) =>
    data.proposals.filter((p) => p.status === s).length;
  const checklistDone = data.checklist.filter((c) => c.done).length;
  const nextStep = data.checklist.find((c) => !c.done);

  return (
    <DashboardLayout
      userRole="freelancer"
      pageTitle="لوحة التحكم"
      pageDescription="نظرة سريعة على العروض، الأعمال الجارية، وتقدّم حسابك."
    >
    <div dir="rtl">

      {/* TWO-COLUMN GRID — work tabs + wallet column (wallet comes first on mobile) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" dir="rtl">

        {/* ═══ MAIN COLUMN — work tabs ═══ */}
        <WorkTabs proposals={data.proposals} projects={data.projects} />

        {/* ═══ WALLET COLUMN ═══ */}
        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start">

          {/* WALLET */}
          <Panel>
            <p className="text-xs font-semibold" style={{ color: P.muted }}>الرصيد القابل للسحب</p>
            <p className="mt-2 font-tech text-3xl font-bold tabular-nums" style={{ color: P.green }}>
              ${arNumber(0)}
            </p>
            <p className="mt-1.5 text-xs" style={{ color: P.muted }}>
              معلّق $0.00 · منتهي $0.00 · الكلي ${arNumber(st.month_earnings)}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm" style={{ color: P.muted }}>أرباح الشهر</span>
              <span className="font-tech text-sm font-bold tabular-nums" style={{ color: P.text }}>
                ${arNumber(st.month_earnings)}
              </span>
            </div>
          </Panel>

          {/* PROPOSAL SLOTS */}
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold" style={{ color: P.text }}>عروض متاحة</p>
              <span className="font-tech text-sm font-bold tabular-nums" style={{ color: P.primaryText }}>
                {toArabicDigits(MAX_PROPOSALS - usedSlots)}/{toArabicDigits(MAX_PROPOSALS)}
              </span>
            </div>
            <ProgressBar
              value={(usedSlots / MAX_PROPOSALS) * 100}
              label={`العروض المستخدمة ${usedSlots} من ${MAX_PROPOSALS}`}
            />
            <p className="text-xs leading-relaxed" style={{ color: P.muted }}>
              قيد المراجعة {toArabicDigits(countByStatus("pending") + countByStatus("viewed"))} · مختصرة {toArabicDigits(countByStatus("shortlisted"))} ·
              مقبولة {toArabicDigits(countByStatus("accepted"))} · فاعلة {toArabicDigits(st.active_proposals)}
            </p>
          </Panel>

          {/* PROFILE + ACCOUNT COMPLETION */}
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: P.text }}>{f.name}</p>
                <p className="text-xs" style={{ color: P.muted }}>{f.role || "مونتير فيديو"}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums" style={{ color: P.muted }}>
                <Star className="size-3.5 fill-current" style={{ color: P.star }} />
                {st.rating.toFixed(1)}
              </span>
            </div>

            {data.checklist.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: P.muted }}>إكمال الحساب</span>
                  <span className="font-tech text-xs font-semibold tabular-nums" style={{ color: P.primaryText }}>
                    {toArabicDigits(f.profile_complete)}٪
                  </span>
                </div>
                <ProgressBar value={f.profile_complete} label="إكمال الحساب" />
                {nextStep && (
                  <p className="text-xs" style={{ color: P.muted }}>
                    التالي: <span className="font-semibold" style={{ color: P.text }}>{nextStep.label}</span>
                  </p>
                )}
                <details className="group mt-2">
                  <summary
                    className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold [&::-webkit-details-marker]:hidden"
                    style={{ color: P.primaryText }}
                  >
                    عرض الخطوات ({toArabicDigits(checklistDone)}/{toArabicDigits(data.checklist.length)})
                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {data.checklist.map((c) => (
                      <li key={c.key} className="flex items-center gap-2 text-sm">
                        {c.done ? (
                          <CheckCircle2 className="size-4 shrink-0" style={{ color: P.green }} />
                        ) : (
                          <Circle className="size-4 shrink-0" style={{ color: P.muted }} />
                        )}
                        <span className={c.done ? "line-through" : ""} style={{ color: c.done ? P.muted : P.text }}>
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Link
                href="/dashboard/freelancer/profile"
                className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <UserPen className="size-3.5" />
                تعديل الملف الشخصي
              </Link>
              <Link
                href={`/freelancers/${f.id}`}
                aria-label="عرض ملفي العام"
                title="عرض ملفي العام"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.muted }}
              >
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
    </DashboardLayout>
  );
}

/* ════════════ PANEL ════════════ */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
      {children}
    </div>
  );
}

/* ════════════ PROGRESS BAR ════════════ */
function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="my-2.5 h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: P.subtle }}
    >
      <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: P.primary }} />
    </div>
  );
}

/* ════════════ WORK TABS ════════════ */
type WorkTab = "projects" | "proposals";

function WorkTabs({
  proposals,
  projects,
}: {
  proposals: APIProposal[];
  projects: APIProject[];
}) {
  const [tab, setTab] = useState<WorkTab>(projects.length > 0 ? "projects" : "proposals");

  const tabs: { id: WorkTab; label: string; count: number }[] = [
    { id: "projects",  label: "مشاريعي النشطة", count: projects.length  },
    { id: "proposals", label: "عروضي المقدّمة",  count: proposals.length },
  ];

  // Only two tabs, so either arrow key moves to the other one.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: WorkTab = tab === "projects" ? "proposals" : "projects";
    setTab(next);
    document.getElementById(`work-tab-${next}`)?.focus();
  };

  return (
    <section className="min-w-0">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-border">
        <div role="tablist" aria-label="أعمالي" className="flex" onKeyDown={onKeyDown}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                id={`work-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`work-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "font-bold text-foreground"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                }`}
                style={active ? { borderColor: P.primary } : undefined}
              >
                {t.label}
                <span
                  className="font-tech rounded-full px-1.5 text-[11px] font-semibold tabular-nums"
                  style={{
                    background: active ? `${P.primary}14` : P.subtle,
                    color: active ? P.primaryText : P.muted,
                  }}
                >
                  {toArabicDigits(t.count)}
                </span>
              </button>
            );
          })}
        </div>
        <Link
          href={tab === "proposals" ? "/proposals" : "/projects"}
          className="mb-2.5 inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
          style={{ color: P.primaryText }}
        >
          عرض الكل <ArrowLeft className="size-3.5" />
        </Link>
      </div>

      <div role="tabpanel" id={`work-panel-${tab}`} aria-labelledby={`work-tab-${tab}`}>
        {tab === "projects" ? (
          projects.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-6" />}
              text="لا توجد مشاريع نشطة حالياً"
            />
          ) : (
            <div className="space-y-3">
              {projects.map((pr) => (
                <ProjectCard key={pr.id} project={pr} />
              ))}
            </div>
          )
        ) : proposals.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            text="لم تقدّم أي عروض حتى الآن"
            cta={{ label: "ابحث عن وظيفة", href: "/jobs" }}
          />
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalRow key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ════════════ PROPOSAL ROW ════════════ */
function ProposalRow({ proposal: p }: { proposal: APIProposal }) {
  const status = PROP_STATUS[p.status] ?? { label: p.status, color: P.muted };
  return (
    <div
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
        <ClampedText text={p.cover_letter} />
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
    </div>
  );
}

/* ════════════ PROJECT CARD ════════════ */
function ProjectCard({ project: pr }: { project: APIProject }) {
  const [progress, setProgress] = useState(pr.progress);
  const [saveError, setSaveError] = useState("");
  const dirty = progress !== pr.progress;
  const mutation = useUpdateProjectProgress(pr.id);

  const save = async () => {
    setSaveError("");
    try {
      await mutation.mutateAsync({ progress });
      pr.progress = progress;
    } catch {
      setProgress(pr.progress);
      setSaveError("تعذّر حفظ التقدّم. حاول مجدداً.");
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${P.primary}10`, color: P.primaryText, border: `1px solid ${P.primary}30` }}
          >
            <Tag className="size-3" />
            {CATEGORY_LABELS[pr.category as keyof typeof CATEGORY_LABELS] ?? pr.category}
          </span>
          <h3 className="mt-2 text-sm font-bold" style={{ color: P.text }}>{pr.title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: P.muted }}>{pr.client_name}</p>
        </div>
        <div className="shrink-0 text-end">
          <p className="font-tech text-base font-bold tabular-nums" style={{ color: P.text }}>
            ${toArabicDigits(Math.round(pr.amount))}
          </p>
          {pr.escrow_funded && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: P.green }}>
              <ShieldCheck className="size-3" />مموّل
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: P.muted }}>
          <span>نسبة الإنجاز</span>
          <span className="font-tech font-semibold tabular-nums" style={{ color: P.text }}>
            {toArabicDigits(progress)}٪
          </span>
        </div>
        <input
          type="range" min={0} max={100} step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          disabled={mutation.isPending}
          className="w-full"
          style={{ accentColor: P.primary }}
        />
        {dirty && (
          <button
            type="button" onClick={save} disabled={mutation.isPending}
            className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: P.primary }}
          >
            {mutation.isPending
              ? <><Loader2 className="size-3 animate-spin" />جارٍ…</>
              : "حفظ التقدّم"}
          </button>
        )}
        {saveError && <p className="mt-1 text-xs text-red-500">{saveError}</p>}
      </div>

      {pr.due_at && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: P.muted }}>
          <Clock className="size-3.5" />
          تسليم {new Date(pr.due_at).toLocaleDateString("ar-SA")}
        </p>
      )}
    </div>
  );
}

/* ════════════ EMPTY STATE ════════════ */
function EmptyState({
  icon, text, cta,
}: {
  icon: React.ReactNode;
  text: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl py-10 text-center"
      style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
    >
      <span style={{ color: P.muted }}>{icon}</span>
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

/* ════════════ CLAMPED TEXT ════════════ */
function ClampedText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div className="mt-2">
      <p
        ref={ref}
        className={`whitespace-pre-line text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
        style={{ color: P.muted }}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-[11px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: P.primaryText }}
        >
          {expanded ? "عرض أقل" : "قراءة العرض كامل"}
        </button>
      )}
    </div>
  );
}

/* ════════════ SKELETON ════════════ */
function Skeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" dir="rtl">
      <div className="space-y-3">
        <div className="h-10 rounded" style={{ background: P.subtle }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded" style={{ background: P.subtle }} />
        ))}
      </div>
      <div className="order-first space-y-4 lg:order-none">
        <div className="h-44 rounded" style={{ background: P.subtle }} />
        <div className="h-52 rounded" style={{ background: P.subtle }} />
      </div>
    </div>
  );
}
