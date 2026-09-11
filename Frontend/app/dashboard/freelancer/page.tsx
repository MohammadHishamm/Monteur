"use client";

import { CATEGORY_LABELS } from "@/components/freelancers/types";
import { formatBudget } from "@/components/jobs/job-row";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BG, P } from "@/lib/design-tokens";
import { arNumber, toArabicDigits } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  UserPen,
  Wallet,
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
  status: "new" | "shortlisted" | "hired" | "declined";
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

const PROP_STATUS: Record<APIProposal["status"], { label: string; color: string }> = {
  new:         { label: "قيد المراجعة",        color: P.muted    },
  shortlisted: { label: "في القائمة المختصرة", color: P.primary  },
  hired:       { label: "مقبول ✓",             color: P.green    },
  declined:    { label: "غير موفّق",            color: "#ef4444"  },
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
        user={{ name: "مستخدم", email: "", verified: false }}
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
  const newMessages = countByStatus("new");

  return (
    <DashboardLayout
      userRole="freelancer"
      pageTitle="لوحة التحكم"
      pageDescription="نظرة سريعة على العروض، الأعمال الجارية، وتقدّم حسابك."
      user={{
        name: f.name,
        email: "",
        tier: f.tier as "bronze" | "silver" | "gold" | "platinum",
        verified: true,
      }}
    >
    <div dir="rtl">

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_290px]" dir="rtl">

        {/* ═══ MAIN COLUMN ═══ */}
        <div className="min-w-0 space-y-4">

          {/* BALANCE */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BalanceCard
              label="الرصيد القابل للسحب"
              amount={0}
              sub="الرصيد المعلّق $0.00"
              highlight
            />
            <BalanceCard
              label="الرصيد الكلي"
              amount={st.month_earnings}
              sub="الرصيد المنتهي $0.00"
            />
          </div>

          {/* PROPOSALS STATS */}
          <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"
              style={{ borderColor: P.border }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${P.primary}14`, color: P.primary }}
                >
                  <FileText className="size-4" />
                </span>
                <div>
                  <p className="font-bold" style={{ color: P.text }}>عروض متاحة</p>
                  <p className="text-xs" style={{ color: P.muted }}>
                    لديك{" "}
                    <span className="font-semibold" style={{ color: P.primaryText }}>
                      {toArabicDigits(MAX_PROPOSALS - usedSlots)}
                    </span>{" "}
                    عرض متاح من أصل {toArabicDigits(MAX_PROPOSALS)}
                  </p>
                </div>
              </div>
              <Link
                href="/jobs"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                <Sparkles className="size-3.5" />
                تصفّح البريفات
              </Link>
            </div>

            <div
              className="mt-4 grid grid-cols-2 gap-px sm:grid-cols-4"
              style={{ background: P.border }}
            >
              {[
                { label: "عروض فاعلة",      value: toArabicDigits(st.active_proposals),          color: P.primary     },
                { label: "المستخدمة",        value: `${toArabicDigits(usedSlots)}/${toArabicDigits(MAX_PROPOSALS)}`, color: P.muted },
                { label: "مختصرة",          value: toArabicDigits(countByStatus("shortlisted")), color: P.primaryText },
                { label: "مقبولة",          value: toArabicDigits(countByStatus("hired")),       color: P.green       },
              ].map((s) => (
                <div key={s.label} className="bg-white px-4 py-4">
                  <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: P.muted }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* MY PROPOSALS */}
          <Section
            title="عروضي المقدّمة"
            action={
              data.proposals.length > 0 ? (
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: P.primaryText }}
                >
                  تصفّح المزيد <ArrowLeft className="size-3.5" />
                </Link>
              ) : null
            }
          >
            {data.proposals.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-6" />}
                text="لم تقدّم أي عروض حتى الآن"
                cta={{ label: "ابحث عن بريف", href: "/jobs" }}
              />
            ) : (
              <div className="space-y-3">
                {data.proposals.map((p) => (
                  <ProposalRow key={p.id} proposal={p} />
                ))}
              </div>
            )}
          </Section>

          {/* ACTIVE PROJECTS */}
          <Section title="بريفاتي الجارية">
            {data.projects.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="size-6" />}
                text="لا توجد بريفات جارية حالياً"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.projects.map((pr) => (
                  <ProjectCard key={pr.id} project={pr} />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">

          {/* PROFILE CARD */}
          <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-3">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ background: f.color || P.primary }}
              >
                {f.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: P.text }}>{f.name}</p>
                <p className="text-xs" style={{ color: P.muted }}>{f.role || "مونتير فيديو"}</p>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3 ${i < Math.floor(st.rating) ? "fill-current" : ""}`}
                      style={{ color: P.star }}
                    />
                  ))}
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: P.muted }}>
                    {st.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/dashboard/freelancer/profile"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                <UserPen className="size-3.5" />
                تعديل الملف الشخصي
              </Link>
              <Link
                href={`/freelancers/${f.id}`}
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <ExternalLink className="size-3.5" />
                عرض ملفي العام
              </Link>
            </div>
          </div>

          {/* ACCOUNT COMPLETION */}
          {data.checklist.length > 0 && (
            <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: P.text }}>خطوات إكمال الحساب</p>
                <span className="font-tech text-xs font-semibold tabular-nums" style={{ color: P.primaryText }}>
                  {toArabicDigits(f.profile_complete)}٪
                </span>
              </div>
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: P.subtle }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${f.profile_complete}%`, background: P.primary }}
                />
              </div>
              <ul className="space-y-2.5">
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
            </div>
          )}

          {/* SIDEBAR COUNTERS */}
          <div className="bg-white" style={{ border: `1px solid ${P.border}` }}>
            <div className="border-b px-4 py-3" style={{ borderColor: P.border }}>
              <p className="text-sm font-bold" style={{ color: P.text }}>ملخص سريع</p>
            </div>
            <div className="grid grid-cols-1 divide-y" style={{ borderColor: P.border }}>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: P.muted }}>الرسائل الجديدة</span>
                <span className="font-tech text-2xl font-bold tabular-nums" style={{ color: P.text }}>
                  {toArabicDigits(newMessages)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: P.muted }}>أعمالي</span>
                <span className="font-tech text-2xl font-bold tabular-nums" style={{ color: P.text }}>
                  {toArabicDigits(st.active_projects)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: P.muted }}>خطوات مكتملة</span>
                <span className="font-tech text-xl font-bold tabular-nums" style={{ color: P.primaryText }}>
                  {toArabicDigits(checklistDone)}/{toArabicDigits(data.checklist.length)}
                </span>
              </div>
            </div>
          </div>

          {/* MINI STATS */}
          <div
            className="grid grid-cols-2 gap-px"
            style={{ background: P.border, border: `1px solid ${P.border}` }}
          >
            <MiniStat
              icon={<Briefcase className="size-4" />}
              label="بريفات جارية"
              value={toArabicDigits(st.active_projects)}
              color={P.primary}
            />
            <MiniStat
              icon={<Wallet className="size-4" />}
              label="أرباح الشهر"
              value={`$${arNumber(st.month_earnings)}`}
              color={P.green}
            />
          </div>

          {/* RECOMMENDED JOBS */}
          {data.recommended.length > 0 && (
            <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="size-4" style={{ color: P.primary }} />
                <p className="text-sm font-bold" style={{ color: P.text }}>فرص مقترحة</p>
              </div>
              <div className="space-y-2">
                {data.recommended.slice(0, 4).map((job) => (
                  <RecommendedJobRow key={job.id} job={job} />
                ))}
              </div>
              <Link
                href="/jobs"
                className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                عرض الكل <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          )}

          <div className="bg-white" style={{ border: `1px solid ${P.border}` }}>
            <div className="border-b px-4 py-3" style={{ borderColor: P.border }}>
              <p className="text-sm font-bold" style={{ color: P.text }}>روابط سريعة</p>
            </div>
            <div className="flex flex-col">
              {[
                { href: "/dashboard/freelancer/profile", label: "تحديث الملف الشخصي" },
                { href: "/jobs", label: "تصفح المشاريع" },
                { href: "/messages", label: "صندوق الرسائل" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between border-b px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-black/5"
                  style={{ borderColor: P.border, color: P.text }}
                >
                  <span>{item.label}</span>
                  <ArrowLeft className="size-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
    </DashboardLayout>
  );
}

/* ════════════ SECTION ════════════ */
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="mb-3 flex items-center justify-between gap-3 border-b pb-3"
        style={{ borderColor: P.border }}
      >
        <h2 className="font-bold" style={{ color: P.text }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ════════════ BALANCE CARD ════════════ */
function BalanceCard({
  label, amount, sub, highlight,
}: {
  label: string; amount: number; sub: string; highlight?: boolean;
}) {
  return (
    <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
      <p className="text-xs font-semibold" style={{ color: P.muted }}>{label}</p>
      <p
        className="mt-2 font-tech text-3xl font-bold tabular-nums"
        style={{ color: highlight ? P.green : P.text }}
      >
        ${arNumber(amount)}
      </p>
      <p className="mt-1.5 text-xs" style={{ color: P.muted }}>{sub}</p>
    </div>
  );
}

/* ════════════ MINI STAT ════════════ */
function MiniStat({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
          {label}
        </span>
      </div>
      <p className="mt-2 font-tech text-xl font-bold tabular-nums" style={{ color: P.text }}>{value}</p>
    </div>
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
          البريف <ArrowLeft className="size-3.5" />
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

/* ════════════ RECOMMENDED JOB ROW (sidebar) ════════════ */
function RecommendedJobRow({ job }: { job: APIJob }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-lg p-3 transition-colors hover:bg-black/5"
      style={{ border: `1px solid ${P.border}` }}
    >
      <p className="text-xs font-bold leading-snug" style={{ color: P.text }}>{job.title}</p>
      <p className="mt-1 text-[11px]" style={{ color: P.muted }}>
        {formatBudget({ budgetMin: job.budget_min, budgetMax: job.budget_max, budgetType: job.budget_type })}
      </p>
    </Link>
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
    <div className="animate-pulse space-y-5" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 rounded" style={{ background: P.subtle }} />
        <div className="h-24 rounded" style={{ background: P.subtle }} />
      </div>
      <div className="h-32 rounded" style={{ background: P.subtle }} />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded" style={{ background: P.subtle }} />
        ))}
      </div>
    </div>
  );
}
