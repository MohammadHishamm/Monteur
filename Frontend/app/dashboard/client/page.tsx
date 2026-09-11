"use client";

import {
  DashboardSkeleton,
  EmptyState,
  MiniStat,
  Section,
} from "@/components/dashboard/client/bits";
import { ClientProjectCard } from "@/components/dashboard/client/client-project-card";
import { groupMatches } from "@/components/dashboard/client/constants";
import { JobCard } from "@/components/dashboard/client/job-card";
import { MatchCard } from "@/components/dashboard/client/match-card";
import { useClientDashboard } from "@/components/dashboard/client/use-client-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { P } from "@/lib/design-tokens";
import { arNumber, toArabicDigits } from "@/lib/format";
import {
  BadgeCheck,
  Briefcase,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";

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
        pageTitle="لوحة التحكم"
        pageDescription="نظرة سريعة على البريفات، العروض، والتعاقدات الجارية."
        user={{ name: "مستخدم", email: "", verified: false }}
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );

  return (
    <DashboardLayout
      userRole="client"
      pageTitle="لوحة التحكم"
      pageDescription="نظرة سريعة على البريفات، العروض، والتعاقدات الجارية."
      user={{ name: data.client.name, email: "", verified: true }}
    >
    <div dir="rtl">
      {/* action error banner */}
      {actionError && (
        <div className="mb-6 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3">
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

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]" dir="rtl">

        {/* ═══ MAIN COLUMN ═══ */}
        <div className="min-w-0 space-y-5">

          {/* STATS BOX */}
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
                  <Briefcase className="size-4" />
                </span>
                <div>
                  <p className="font-bold" style={{ color: P.text }}>ملخّص النشاط</p>
                  <p className="text-xs" style={{ color: P.muted }}>
                    لديك{" "}
                    <span className="font-semibold" style={{ color: P.primaryText }}>
                      {toArabicDigits(data.stats.activeJobs)}
                    </span>{" "}
                    {data.stats.activeJobs === 1 ? "بريف نشط" : "بريفات نشطة"}
                  </p>
                </div>
              </div>
              <Link
                href="/post-job"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                <Plus className="size-3.5" />
                انشر بريفاً جديداً
              </Link>
            </div>
            <div
              className="mt-4 grid grid-cols-2 gap-px sm:grid-cols-4"
              style={{ background: P.border }}
            >
              {[
                { label: "بريفات نشطة",  value: toArabicDigits(data.stats.activeJobs),     color: P.primary     },
                { label: "عروض واردة",   value: toArabicDigits(data.stats.totalProposals), color: P.primaryText },
                { label: "تعاقدات",      value: toArabicDigits(data.stats.activeHires),    color: P.green       },
                { label: "في الضمان",    value: `$${arNumber(data.stats.escrowAmount)}`,   color: P.primary     },
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

          {/* JOBS + PROPOSALS */}
          <Section
            title="بريفاتي والعروض الواردة"
            action={
              <Link
                href="/post-job"
                className="inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: P.primaryText }}
              >
                <Plus className="size-3.5" />
                بريف جديد
              </Link>
            }
          >
            {data.jobs.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="size-6" />}
                text="لم تنشر أي بريف حتى الآن"
                cta={{ label: "انشر بريفاً", href: "/post-job" }}
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
            )}
          </Section>

          {/* ACTIVE PROJECTS */}
          {data.projects.filter(
            (pr) => pr.status === "active" || pr.status === "paused" || completedProjects.has(pr.id)
          ).length > 0 && (
            <Section title="المشاريع الجارية">
              <div className="grid gap-4 sm:grid-cols-2">
                {data.projects
                  .filter((pr) => pr.status === "active" || pr.status === "paused" || completedProjects.has(pr.id))
                  .map((pr) => (
                    <ClientProjectCard
                      key={pr.id}
                      project={pr}
                      completed={completedProjects.has(pr.id)}
                      onComplete={() => onCompleteProject(pr.id)}
                    />
                  ))}
              </div>
            </Section>
          )}

          {/* BEST MATCHES */}
          {data.bestMatches.length > 0 && (
            <Section
              title="أفضل المطابقات"
              action={
                <div className="flex items-center gap-1.5 text-xs" style={{ color: P.muted }}>
                  <Sparkles className="size-3.5" style={{ color: P.primary }} />
                  بالمطابقة الذكية
                </div>
              }
            >
              <div className="flex flex-col gap-6">
                {groupMatches(data.bestMatches).map((group) => (
                  <div key={group.jobId}>
                    <p
                      className="mb-3 inline-flex items-center gap-2 text-sm font-semibold"
                      style={{ color: P.text }}
                    >
                      <Tag className="size-3.5" style={{ color: P.muted }} />
                      {group.jobTitle}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.matches.map((m) => (
                        <MatchCard
                          key={m.freelancer.id}
                          match={m}
                          hired={hired.has(m.freelancer.id)}
                          locked={filledJobs.has(m.job_id)}
                          onHire={() => onHireMatch(m)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">

          {/* CLIENT PROFILE CARD */}
          <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-3">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ background: P.primary }}
              >
                {data.client.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: P.text }}>{data.client.name}</p>
                <p className="text-xs" style={{ color: P.muted }}>صاحب عمل</p>
                <div className="mt-1 flex items-center gap-1">
                  <BadgeCheck className="size-4" style={{ color: P.green }} />
                  <span className="text-[11px] font-semibold" style={{ color: P.muted }}>حساب موثّق</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/post-job"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                <Plus className="size-3.5" />
                انشر بريفاً جديداً
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:bg-black/5"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                <BadgeCheck className="size-3.5" />
                عرض ملفي الشخصي
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
          </div>

          {/* MINI STATS */}
          <div
            className="grid grid-cols-2 gap-px"
            style={{ background: P.border, border: `1px solid ${P.border}` }}
          >
            <MiniStat
              icon={<Briefcase className="size-4" />}
              label="بريفات نشطة"
              value={toArabicDigits(data.stats.activeJobs)}
              color={P.primary}
            />
            <MiniStat
              icon={<FileText className="size-4" />}
              label="عروض واردة"
              value={toArabicDigits(data.stats.totalProposals)}
              color={P.primaryText}
            />
            <MiniStat
              icon={<Users className="size-4" />}
              label="تعاقدات"
              value={toArabicDigits(data.stats.activeHires)}
              color={P.green}
            />
            <MiniStat
              icon={<ShieldCheck className="size-4" />}
              label="في الضمان"
              value={`$${arNumber(data.stats.escrowAmount)}`}
              color={P.primary}
            />
          </div>
        </aside>
      </div>
    </div>
    </DashboardLayout>
  );
}
