"use client";

import { EmptyState } from "@/components/dashboard/client/bits";
import { ClientProjectCard } from "@/components/dashboard/client/client-project-card";
import { STATUS_META } from "@/components/dashboard/client/constants";
import { JobCard } from "@/components/dashboard/client/job-card";
import { MatchCard } from "@/components/dashboard/client/match-card";
import { ProposalRow } from "@/components/dashboard/client/proposal-row";
import { useClientDashboard } from "@/components/dashboard/client/use-client-dashboard";
import { formatBudget } from "@/components/jobs/job-row";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { P } from "@/lib/design-tokens";
import { arNumber, toArabicDigits } from "@/lib/format";
import type {
  BestMatch,
  ClientJob,
  ClientProject,
  ReceivedProposal,
} from "@/types/client-dashboard";
import {
  BadgeCheck,
  Briefcase,
  FileText,
  FolderOpen,
  Plus,
  Sparkles,
  UserPen,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

const PAGE_TITLE = "لوحة التحكم";
const PAGE_DESC = "نظرة سريعة على الوظائف، العروض، والتعاقدات الجارية.";

/** How many proposals a job group shows before "show all". */
const PROPOSALS_PREVIEW = 3;

export default function ClientDashboardPage() {
  const {
    data,
    isPending,
    hired,
    declined,
    closedJobs,
    filledJobs,
    expanded,
    completedProjects,
    actionError,
    setActionError,
    onHireProposal,
    onHireMatch,
    onMessage,
    onCloseJob,
    onCompleteProject,
    toggleExpand,
  } = useClientDashboard();

  if (isPending || !data)
    return (
      <DashboardLayout
        userRole="client"
        pageTitle={PAGE_TITLE}
        pageDescription={PAGE_DESC}
        user={{ name: "مستخدم", email: "", verified: false }}
      >
        <Skeleton />
      </DashboardLayout>
    );

  const visibleProjects = data.projects.filter(
    (pr) => pr.status === "active" || pr.status === "paused" || completedProjects.has(pr.id),
  );

  // A job stops taking hires once it's closed, filled, or no longer open.
  const isLocked = (job: ClientJob) =>
    closedJobs.has(job.id) || job.status === "closed" || filledJobs.has(job.id) || job.status !== "open";

  return (
    <DashboardLayout
      userRole="client"
      pageTitle={PAGE_TITLE}
      pageDescription={PAGE_DESC}
      user={{ name: data.client.name, email: "", verified: true }}
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
    <div dir="rtl">
      {/* action error banner */}
      {actionError && (
        <div role="alert" className="mb-4 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-red-600">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="shrink-0 text-red-400 transition-opacity hover:opacity-70"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* TWO-COLUMN GRID — work tabs + side column (side column comes first on mobile) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" dir="rtl">

        {/* ═══ MAIN COLUMN — tabs ═══ */}
        <ClientTabs
          counts={{
            proposals: data.proposals.length,
            jobs: data.jobs.length,
            projects: visibleProjects.length,
          }}
          proposalsTab={
            <ProposalsByJob
              jobs={data.jobs}
              proposals={data.proposals}
              matches={data.bestMatches}
              isLocked={isLocked}
              hired={hired}
              declined={declined}
              onHireProposal={onHireProposal}
              onHireMatch={onHireMatch}
              onMessage={onMessage}
            />
          }
          jobsTab={
            data.jobs.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="size-6" />}
                text="لم تنشر أي وظيفة حتى الآن"
                cta={{ label: "انشر وظيفة", href: "/post-job" }}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {data.jobs.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    proposals={data.proposals.filter((p) => p.jobId === j.id)}
                    open={expanded.has(j.id)}
                    onToggle={() => toggleExpand(j.id)}
                    hired={hired}
                    declined={declined}
                    onHire={onHireProposal}
                    onMessage={onMessage}
                    closed={closedJobs.has(j.id)}
                    onClose={() => onCloseJob(j.id)}
                    filled={filledJobs.has(j.id)}
                  />
                ))}
              </div>
            )
          }
          projectsTab={
            <ProjectsList
              projects={visibleProjects}
              completedProjects={completedProjects}
              onCompleteProject={onCompleteProject}
            />
          }
        />

        {/* ═══ SIDE COLUMN ═══ */}
        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start">

          {/* ESCROW + ACTIVITY */}
          <Panel>
            <p className="text-xs font-semibold" style={{ color: P.muted }}>في الضمان</p>
            <p className="mt-2 font-tech text-3xl font-bold tabular-nums" style={{ color: P.green }}>
              ${arNumber(data.stats.escrowAmount)}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: P.muted }}>
              وظائف نشطة {toArabicDigits(data.stats.activeJobs)} · عروض واردة{" "}
              {toArabicDigits(data.stats.totalProposals)} · تعاقدات {toArabicDigits(data.stats.activeHires)}
            </p>
          </Panel>

          {/* CLIENT PROFILE */}
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: P.text }}>{data.client.name}</p>
                <p className="text-xs" style={{ color: P.muted }}>صاحب عمل</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold" style={{ color: P.muted }}>
                <BadgeCheck className="size-4" style={{ color: P.green }} />
                حساب موثّق
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/client/profile"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <UserPen className="size-3.5" />
                تعديل ملفي الشخصي
              </Link>
              <Link
                href="/freelancers"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <Users className="size-3.5" />
                تصفّح المونتيرين
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

/* ════════════ TABS ════════════ */
type ClientTab = "proposals" | "jobs" | "projects";

const TABS: { id: ClientTab; label: string }[] = [
  { id: "proposals", label: "العروض الواردة" },
  { id: "jobs",      label: "وظائفي"        },
  { id: "projects",  label: "المشاريع الجارية" },
];

function ClientTabs({
  counts,
  proposalsTab,
  jobsTab,
  projectsTab,
}: {
  counts: Record<ClientTab, number>;
  proposalsTab: React.ReactNode;
  jobsTab: React.ReactNode;
  projectsTab: React.ReactNode;
}) {
  const [tab, setTab] = useState<ClientTab>("proposals");

  // RTL: ArrowLeft moves to the next tab, ArrowRight to the previous one.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const step = e.key === "ArrowLeft" ? 1 : -1;
    const next = TABS[(i + step + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`client-tab-${next}`)?.focus();
  };

  const panels: Record<ClientTab, React.ReactNode> = {
    proposals: proposalsTab,
    jobs: jobsTab,
    projects: projectsTab,
  };

  return (
    <section className="min-w-0">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-border">
        <div role="tablist" aria-label="نشاطي" className="flex" onKeyDown={onKeyDown}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                id={`client-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`client-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors sm:gap-2 sm:px-4 ${
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
                  {toArabicDigits(counts[t.id])}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" id={`client-panel-${tab}`} aria-labelledby={`client-tab-${tab}`}>
        {panels[tab]}
      </div>
    </section>
  );
}

/* ════════════ PROPOSALS TAB — grouped by job, with that job's AI matches ════════════ */
function ProposalsByJob({
  jobs,
  proposals,
  matches,
  isLocked,
  hired,
  declined,
  onHireProposal,
  onHireMatch,
  onMessage,
}: {
  jobs: ClientJob[];
  proposals: ReceivedProposal[];
  matches: BestMatch[];
  isLocked: (job: ClientJob) => boolean;
  hired: Set<string>;
  declined: Set<string>;
  onHireProposal: (p: ReceivedProposal) => void;
  onHireMatch: (m: BestMatch) => void;
  onMessage: (freelancerId: string) => void;
}) {
  const groups = jobs
    .map((job) => ({
      job,
      proposals: proposals.filter((p) => p.jobId === job.id),
      matches: matches.filter((m) => m.job_id === job.id),
    }))
    .filter((g) => g.proposals.length > 0 || g.matches.length > 0);

  if (groups.length === 0)
    return jobs.length === 0 ? (
      <EmptyState
        icon={<FileText className="size-6" />}
        text="انشر وظيفتك الأولى لتبدأ العروض بالوصول"
        cta={{ label: "انشر وظيفة", href: "/post-job" }}
      />
    ) : (
      <EmptyState icon={<FileText className="size-6" />} text="لا توجد عروض واردة بعد" />
    );

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <JobProposalsGroup
          key={g.job.id}
          job={g.job}
          proposals={g.proposals}
          matches={g.matches}
          locked={isLocked(g.job)}
          hired={hired}
          declined={declined}
          onHireProposal={onHireProposal}
          onHireMatch={onHireMatch}
          onMessage={onMessage}
        />
      ))}
    </div>
  );
}

function JobProposalsGroup({
  job,
  proposals,
  matches,
  locked,
  hired,
  declined,
  onHireProposal,
  onHireMatch,
  onMessage,
}: {
  job: ClientJob;
  proposals: ReceivedProposal[];
  matches: BestMatch[];
  locked: boolean;
  hired: Set<string>;
  declined: Set<string>;
  onHireProposal: (p: ReceivedProposal) => void;
  onHireMatch: (m: BestMatch) => void;
  onMessage: (freelancerId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const status = STATUS_META[job.status] ?? STATUS_META.open;
  const shown = showAll ? proposals : proposals.slice(0, PROPOSALS_PREVIEW);
  const hidden = proposals.length - shown.length;

  return (
    <article className="bg-white" style={{ border: `1px solid ${P.border}` }}>
      {/* job header */}
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
        style={{ borderColor: P.border, background: "#fafafa" }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold" style={{ color: P.text }}>{job.title}</h3>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: `${status.color}12`,
                color: status.color,
                border: `1px solid ${status.color}30`,
              }}
            >
              <span className="size-1.5 rounded-full" style={{ background: status.color }} />
              {status.label}
            </span>
          </div>
          <p className="mt-1 font-tech text-xs tabular-nums" style={{ color: P.muted }}>
            {formatBudget({ budgetType: job.budget_type, budgetMin: job.budget_min, budgetMax: job.budget_max })}
          </p>
        </div>
        <span className="text-xs font-semibold" style={{ color: P.muted }}>
          {toArabicDigits(proposals.length)} {proposals.length === 1 ? "عرض" : "عروض"}
        </span>
      </header>

      {/* proposals */}
      {proposals.length > 0 ? (
        <div className="flex flex-col gap-px" style={{ background: P.border }}>
          {shown.map((p) => (
            <ProposalRow
              key={p.id}
              proposal={p}
              locked={locked}
              hired={hired.has(p.freelancer.id) || p.status === "hired"}
              declined={declined.has(p.id) || p.status === "declined"}
              onHire={() => onHireProposal(p)}
              onMessage={() => onMessage(p.freelancer.id)}
            />
          ))}
        </div>
      ) : (
        <p className="px-5 py-6 text-center text-sm" style={{ color: P.muted }}>
          لا توجد عروض على هذه الوظيفة بعد.
        </p>
      )}
      {(hidden > 0 || showAll) && proposals.length > PROPOSALS_PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full border-t px-5 py-2.5 text-start text-xs font-semibold transition-colors hover:bg-black/2"
          style={{ borderColor: P.border, color: P.primaryText }}
        >
          {showAll ? "عرض أقل" : `عرض كل العروض (${toArabicDigits(proposals.length)})`}
        </button>
      )}

      {/* AI matches for this job */}
      {matches.length > 0 && (
        <div className="border-t px-5 py-4" style={{ borderColor: P.border }}>
          <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: P.text }}>
            <Sparkles className="size-3.5" style={{ color: P.primary }} />
            مطابقات مقترحة لهذه الوظيفة
          </p>
          <div className="grid gap-3 xl:grid-cols-2">
            {matches.map((m) => (
              <MatchCard
                key={m.freelancer.id}
                match={m}
                hired={hired.has(m.freelancer.id)}
                locked={locked}
                onHire={() => onHireMatch(m)}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

/* ════════════ PROJECTS TAB ════════════ */
function ProjectsList({
  projects,
  completedProjects,
  onCompleteProject,
}: {
  projects: ClientProject[];
  completedProjects: Set<string>;
  onCompleteProject: (id: string) => void;
}) {
  if (projects.length === 0)
    return <EmptyState icon={<FolderOpen className="size-6" />} text="لا توجد مشاريع جارية حالياً" />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {projects.map((pr) => (
        <ClientProjectCard
          key={pr.id}
          project={pr}
          completed={completedProjects.has(pr.id)}
          onComplete={() => onCompleteProject(pr.id)}
        />
      ))}
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
          <div key={i} className="h-32 rounded" style={{ background: P.subtle }} />
        ))}
      </div>
      <div className="order-first space-y-4 lg:order-none">
        <div className="h-32 rounded" style={{ background: P.subtle }} />
        <div className="h-40 rounded" style={{ background: P.subtle }} />
      </div>
    </div>
  );
}
