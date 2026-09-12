"use client";

import { CATEGORY_LABELS } from "@/components/freelancers/types";
import { formatBudget } from "@/components/jobs/job-row";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BG, P } from "@/lib/design-tokens";
import { arNumber, toArabicDigits } from "@/lib/format";
import type { ClientDashboard, ClientJob } from "@/types/client-dashboard";
import type { Project, ProjectStatus } from "@/types/project";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Clock, FolderOpen, Plus, ShieldCheck, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getMyProjects } from "~/api/projects/queries";
import { getAuthUserOptions, getClientDashboard } from "~/api/user/queries";

const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  active:    { label: "جارٍ",    color: P.primary },
  completed: { label: "مكتمل",   color: P.primaryText },
  disputed:  { label: "نزاع",    color: "#dc2626" },
  cancelled: { label: "ملغي",    color: P.muted },
};

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  open:        { label: "مفتوح",        color: P.green },
  reviewing:   { label: "قيد المراجعة", color: P.primaryText },
  in_progress: { label: "قيد التنفيذ",  color: P.primary },
  completed:   { label: "مكتمل",        color: P.muted },
  closed:      { label: "مغلق",         color: P.muted },
};

export default function MyWorkPage() {
  const { data: authData } = useQuery(getAuthUserOptions()) as {
    data: { data?: { user_type?: string; full_name?: string } } | undefined;
  };
  const isClient = authData?.data?.user_type === "client";

  const { data: projectsData, isPending, isError } = useQuery(getMyProjects({})) as {
    data: { data: Project[] } | undefined;
    isPending: boolean;
    isError: boolean;
  };
  const projects = projectsData?.data ?? [];

  return isClient ? (
    <ClientWork projects={projects} isPending={isPending} isError={isError} />
  ) : (
    <FreelancerWork projects={projects} isPending={isPending} isError={isError} />
  );
}

/* ════════════ FREELANCER VIEW ════════════ */
function FreelancerWork({
  projects,
  isPending,
  isError,
}: {
  projects: Project[];
  isPending: boolean;
  isError: boolean;
}) {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const shown = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <DashboardLayout
      userRole="freelancer"
      pageTitle="مشاريعي"
      pageDescription="المشاريع التي تعمل عليها والمكتملة."
      user={{ name: "مستخدم", email: "", verified: true }}
    >
      <div dir="rtl" className="flex flex-col gap-4">
        {isPending ? (
          <ListSkeleton />
        ) : isError ? (
          <LoadError />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="size-6" />}
            text="لا توجد مشاريع بعد — قدّم عرضاً على وظيفة لتبدأ"
            cta={{ label: "تصفّح الوظائف", href: "/jobs" }}
          />
        ) : (
          <>
            <StatusFilter
              value={filter}
              onChange={setFilter}
              counts={{
                all: projects.length,
                active: projects.filter((p) => p.status === "active").length,
                completed: projects.filter((p) => p.status === "completed").length,
              }}
            />
            {shown.length === 0 ? (
              <EmptyState icon={<Briefcase className="size-6" />} text="لا توجد مشاريع بهذه الحالة" />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {shown.map((pr) => (
                  <ProjectCard key={pr.id} project={pr} counterpart={pr.client_name} counterpartLabel="العميل" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ════════════ CLIENT VIEW — posted briefs + hired projects ════════════ */
function ClientWork({
  projects,
  isPending,
  isError,
}: {
  projects: Project[];
  isPending: boolean;
  isError: boolean;
}) {
  const { data: dashData } = useQuery(getClientDashboard({})) as {
    data: { data: ClientDashboard } | undefined;
  };
  const jobs: ClientJob[] = dashData?.data?.jobs ?? [];

  return (
    <DashboardLayout
      userRole="client"
      pageTitle="وظائفي"
      pageDescription="الوظائف التي نشرتها والمشاريع التي تعاقدت عليها."
      user={{ name: "مستخدم", email: "", verified: true }}
      actions={
        <Link
          href="/post-job"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: P.primary }}
        >
          <Plus className="size-3.5" />
          انشر وظيفة جديدة
        </Link>
      }
    >
      <div dir="rtl" className="flex flex-col gap-6">
        {/* posted briefs */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: P.border }}>
            <h2 className="font-bold" style={{ color: P.text }}>وظائفي</h2>
            <span className="text-xs" style={{ color: P.muted }}>
              {toArabicDigits(jobs.length)} وظيفة
            </span>
          </div>
          {jobs.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="size-6" />}
              text="لم تنشر أي وظيفة حتى الآن"
              cta={{ label: "انشر وظيفة", href: "/post-job" }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} />
              ))}
            </div>
          )}
        </section>

        {/* hired projects */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: P.border }}>
            <h2 className="font-bold" style={{ color: P.text }}>مشاريعي</h2>
            <span className="text-xs" style={{ color: P.muted }}>
              {toArabicDigits(projects.length)} مشروع
            </span>
          </div>
          {isPending ? (
            <ListSkeleton />
          ) : isError ? (
            <LoadError />
          ) : projects.length === 0 ? (
            <EmptyState icon={<Briefcase className="size-6" />} text="لا توجد مشاريع جارية بعد" />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {projects.map((pr) => (
                <ProjectCard
                  key={pr.id}
                  project={pr}
                  counterpart={pr.freelancer_name}
                  counterpartLabel="المونتير"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

/* ════════════ PIECES ════════════ */
function StatusFilter({
  value,
  onChange,
  counts,
}: {
  value: ProjectStatus | "all";
  onChange: (v: ProjectStatus | "all") => void;
  counts: { all: number; active: number; completed: number };
}) {
  const items: { id: ProjectStatus | "all"; label: string; count: number }[] = [
    { id: "all",       label: "الكل",   count: counts.all },
    { id: "active",    label: "جارٍ",   count: counts.active },
    { id: "completed", label: "مكتمل",  count: counts.completed },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={
              active
                ? { background: `${P.primary}14`, color: P.primaryText, border: `1px solid ${P.primary}40` }
                : { background: "white", color: P.muted, border: `1px solid ${P.border}` }
            }
          >
            {it.label}
            <span className="font-tech tabular-nums">{toArabicDigits(it.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ProjectCard({
  project: pr,
  counterpart,
  counterpartLabel,
}: {
  project: Project;
  counterpart: string;
  counterpartLabel: string;
}) {
  const status = PROJECT_STATUS[pr.status] ?? { label: pr.status, color: P.muted };

  return (
    <article className="flex flex-col gap-3 bg-white p-4" style={{ border: `1px solid ${P.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: `${P.primary}10`, color: P.primaryText, border: `1px solid ${P.primary}30` }}
            >
              <Tag className="size-3" />
              {CATEGORY_LABELS[pr.category as keyof typeof CATEGORY_LABELS] ?? pr.category}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: `${status.color}12`, color: status.color, border: `1px solid ${status.color}30` }}
            >
              <span className="size-1.5 rounded-full" style={{ background: status.color }} />
              {status.label}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-bold" style={{ color: P.text }}>{pr.title}</h3>
          <p className="mt-0.5 text-xs" style={{ color: P.muted }}>
            {counterpartLabel}: {counterpart}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="font-tech text-base font-bold tabular-nums" style={{ color: P.text }}>
            ${arNumber(Math.round(pr.amount))}
          </p>
          {pr.escrow_funded && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: P.green }}>
              <ShieldCheck className="size-3" />
              مموّل
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: P.muted }}>
          <span>نسبة الإنجاز</span>
          <span className="font-tech font-semibold tabular-nums" style={{ color: P.text }}>
            {toArabicDigits(pr.progress)}٪
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: P.subtle }}>
          <div className="h-full rounded-full" style={{ width: `${pr.progress}%`, background: P.primary }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {pr.due_at ? (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: P.muted }}>
            <Clock className="size-3.5" />
            تسليم {new Date(pr.due_at).toLocaleDateString("ar-SA")}
          </span>
        ) : (
          <span />
        )}
        <Link
          href={`/projects/${pr.id}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          تفاصيل المشروع <ArrowLeft className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

function JobRow({ job }: { job: ClientJob }) {
  const status = JOB_STATUS[job.status] ?? { label: job.status, color: P.muted };
  return (
    <article
      className="flex flex-wrap items-center justify-between gap-3 bg-white p-4"
      style={{ border: `1px solid ${P.border}` }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${status.color}12`, color: status.color, border: `1px solid ${status.color}30` }}
          >
            <span className="size-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
          <span className="font-tech text-xs tabular-nums" style={{ color: P.muted }}>
            {formatBudget({
              budgetType: job.budget_type,
              budgetMin: job.budget_min,
              budgetMax: job.budget_max,
            })}
          </span>
        </div>
        <h3 className="mt-2 text-sm font-bold" style={{ color: P.text }}>{job.title}</h3>
        <p className="mt-0.5 text-xs" style={{ color: P.muted }}>{job.posted_at}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-end">
          <p className="font-tech text-lg font-bold tabular-nums" style={{ color: P.text }}>
            {toArabicDigits(job.proposals)}
          </p>
          <p className="text-[11px]" style={{ color: P.muted }}>عرض</p>
        </div>
        <Link
          href="/client"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          العروض الواردة <ArrowLeft className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="grid animate-pulse gap-3 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-40" style={{ background: P.subtle }} />
      ))}
    </div>
  );
}

function LoadError() {
  return (
    <p className="bg-white p-5 text-sm" style={{ border: `1px solid ${P.border}`, color: P.muted }}>
      تعذّر تحميل البيانات. حاول تحديث الصفحة.
    </p>
  );
}

function EmptyState({
  icon,
  text,
  cta,
}: {
  icon: React.ReactNode;
  text: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-12 text-center"
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
