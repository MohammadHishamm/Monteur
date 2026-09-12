"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Users,
  UserCheck,
  UserX,
  Video,
  Briefcase,
  DollarSign,
  ShieldAlert,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import { getAdminAnalyticsOptions } from "~/api/admin/queries"
import { P, BG } from "~/lib/design-tokens"
import type { AdminAnalytics } from "~/types/admin"

export default function AdminAnalyticsPage() {
  const { data, isPending } = useQuery(getAdminAnalyticsOptions())
  const stats = data?.data

  if (isPending) return <PageSkeleton />

  return (
    <div className="p-6 space-y-6">
      <PageHeader />
      {stats ? <StatCards stats={stats} /> : <EmptyState />}
    </div>
  )
}

function PageHeader() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest font-tech" style={{ color: P.primaryText }}>
        لوحة الإدارة
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: P.text }}>
        الإحصائيات العامة
      </h1>
      <p className="mt-1 text-sm" style={{ color: P.muted }}>
        نظرة شاملة على نشاط المنصة
      </p>
    </div>
  )
}

function StatCards({ stats }: { stats: AdminAnalytics }) {
  const cards = [
    {
      label: "إجمالي المستخدمين",
      value: stats.total_users,
      icon: Users,
      color: P.primary,
      sub: null,
    },
    {
      label: "الحسابات المفعّلة",
      value: stats.activated_users,
      icon: UserCheck,
      color: "#10b981",
      sub: `${Math.round((stats.activated_users / Math.max(stats.total_users, 1)) * 100)}٪ من الإجمالي`,
    },
    {
      label: "الحسابات غير المفعّلة",
      value: stats.non_activated_users,
      icon: UserX,
      color: "#f59e0b",
      sub: `${Math.round((stats.non_activated_users / Math.max(stats.total_users, 1)) * 100)}٪ من الإجمالي`,
    },
    {
      label: "المونتيرون",
      value: stats.total_freelancers,
      icon: Video,
      color: P.primary,
      sub: "مونتير مسجّل",
    },
    {
      label: "أصحاب العمل",
      value: stats.total_clients,
      icon: Briefcase,
      color: P.primaryText,
      sub: "عميل مسجّل",
    },
    {
      label: "إجمالي الإيرادات",
      value: `$${stats.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      color: "#10b981",
      sub: "عبر الضمان",
      isText: true,
    },
    {
      label: "وظائف في المنصة",
      value: stats.total_jobs,
      icon: Briefcase,
      color: P.muted,
      sub: "وظيفة منشورة",
    },
    {
      label: "مشاريع مكتملة",
      value: stats.total_projects,
      icon: CheckCircle2,
      color: "#10b981",
      sub: "مشروع تم تسليمه",
    },
    {
      label: "بانتظار التحقق",
      value: stats.pending_verifications,
      icon: ShieldAlert,
      color: "#f59e0b",
      sub: "طلب تحقق معلّق",
    },
    {
      label: "تذاكر الدعم المفتوحة",
      value: stats.open_support_tickets,
      icon: MessageSquare,
      color: "#ef4444",
      sub: "تذكرة تحتاج رداً",
    },
    {
      label: "مستخدمون جدد هذا الشهر",
      value: stats.new_users_this_month,
      icon: TrendingUp,
      color: P.primary,
      sub: "خلال ٣٠ يوماً",
    },
    {
      label: "معدّل إتمام المشاريع",
      value: `${stats.avg_completion_rate}٪`,
      icon: CheckCircle2,
      color: "#10b981",
      sub: "متوسط الإنجاز",
      isText: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className="flex items-start gap-4 bg-white p-5 transition-shadow hover:shadow-md"
            style={{ border: `1px solid ${P.border}` }}
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${c.color}14`, color: c.color }}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: P.muted }}>
                {c.label}
              </p>
              <p
                className="mt-1 text-2xl font-bold font-tech tabular-nums"
                style={{ color: c.isText ? c.color : P.text }}
              >
                {c.isText ? c.value : Number(c.value).toLocaleString("ar-EG")}
              </p>
              {c.sub && (
                <p className="mt-0.5 text-[11px]" style={{ color: P.muted }}>
                  {c.sub}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm" style={{ color: P.muted }}>
        تعذّر تحميل الإحصائيات. حاول مجدداً.
      </p>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded" style={{ background: P.border }} />
        <div className="h-7 w-56 rounded" style={{ background: P.border }} />
        <div className="h-3 w-40 rounded" style={{ background: P.border }} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 rounded" style={{ background: BG.subtle, border: `1px solid ${P.border}` }} />
        ))}
      </div>
    </div>
  )
}
