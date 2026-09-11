"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, Clock, ImageOff, ShieldCheck, ShieldX, X } from "lucide-react"
import { useState } from "react"
import { useAdminReviewVerification } from "~/api/admin/mutations"
import { getAdminVerificationsOptions } from "~/api/admin/queries"
import { BG, P } from "~/lib/design-tokens"
import type { AdminVerification } from "~/types/admin"

type StatusFilter = "pending" | "approved" | "rejected"

export default function AdminVerificationPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending")
  const [actionError, setActionError] = useState("")

  const { data, isPending } = useQuery(getAdminVerificationsOptions(filter))
  const verifications = data?.data ?? []

  const reviewMutation = useAdminReviewVerification()

  async function handleAction(id: string, action: "approved" | "rejected") {
    // Clear any stale error from a previous attempt — otherwise the banner
    // sticks across later successful actions and looks like every approve failed.
    setActionError("")
    try {
      await reviewMutation.mutateAsync({ verificationId: id, action })
    } catch {
      setActionError("تعذّر تنفيذ الإجراء. حاول مجدداً.")
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest font-tech" style={{ color: P.primaryText }}>
          لوحة الإدارة
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: P.text }}>
          التحقق من الهوية
        </h1>
        <p className="mt-1 text-sm" style={{ color: P.muted }}>
          راجع طلبات توثيق الهوية واعتمدها أو ارفضها
        </p>
      </div>

      {/* error */}
      {actionError && (
        <div className="flex items-center justify-between gap-3 border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-sm text-red-600">{actionError}</p>
          <button type="button" onClick={() => setActionError("")}>
            <X className="size-4 text-red-400" />
          </button>
        </div>
      )}

      {/* filter tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: P.border }}>
        {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => {
          const meta: Record<StatusFilter, { label: string; color: string }> = {
            pending: { label: "بانتظار المراجعة", color: "#f59e0b" },
            approved: { label: "معتمدة", color: P.primary },
            rejected: { label: "مرفوضة", color: "#ef4444" },
          }
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className="px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: filter === s ? meta[s].color : P.muted,
                borderBottom: filter === s ? `2px solid ${meta[s].color}` : "2px solid transparent",
              }}
            >
              {meta[s].label}
            </button>
          )
        })}
      </div>

      {/* cards */}
      {isPending ? (
        <GridSkeleton />
      ) : verifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span
            className="grid size-12 place-items-center rounded-full"
            style={{ background: `${P.primary}14`, color: P.primary }}
          >
            <ShieldCheck className="size-6" />
          </span>
          <p className="text-sm" style={{ color: P.muted }}>
            لا توجد طلبات في هذه الفئة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {verifications.map((v) => (
            <VerificationCard
              key={v.id}
              verification={v}
              onApprove={() => handleAction(v.id, "approved")}
              onReject={() => handleAction(v.id, "rejected")}
              pending={reviewMutation.isPending && reviewMutation.variables?.verificationId === v.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Verification Card ─── */
function VerificationCard({
  verification: v,
  onApprove,
  onReject,
  pending,
}: {
  verification: AdminVerification
  onApprove: () => void
  onReject: () => void
  pending: boolean
}) {
  const isPending = v.status === "pending"
  const isApproved = v.status === "approved"

  return (
    <div
      className="flex flex-col gap-4 bg-white p-5"
      style={{ border: `1px solid ${isApproved ? P.primary : v.status === "rejected" ? "#ef4444" : P.border}` }}
    >
      {/* user info */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold" style={{ color: P.text }}>
            {v.user_name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: P.muted }}>
            {v.user_email}
          </p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      {/* ID images */}
      <div className="grid grid-cols-2 gap-2">
        <IDImage label="الوجه الأمامي" src={v.id_front_url} />
        <IDImage label="الوجه الخلفي" src={v.id_back_url} />
        {v.selfie_url && (
          <div className="col-span-2">
            <IDImage label="صورة سيلفي" src={v.selfie_url} />
          </div>
        )}
      </div>

      {/* submitted at */}
      <p className="flex items-center gap-1.5 text-[11px]" style={{ color: P.muted }}>
        <Clock className="size-3.5 shrink-0" />
        تم الإرسال:{" "}
        {new Date(v.submitted_at).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {/* actions */}
      {isPending && (
        <div className="flex gap-2 border-t pt-4" style={{ borderColor: P.border }}>
          <button
            type="button"
            disabled={pending}
            onClick={onApprove}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: P.primary }}
          >
            <CheckCircle2 className="size-4" />
            {pending ? "جارٍ…" : "اعتماد"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onReject}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors hover:bg-red-50 disabled:opacity-40"
            style={{ border: "1px solid #ef4444", color: "#ef4444" }}
          >
            <ShieldX className="size-4" />
            {pending ? "جارٍ…" : "رفض"}
          </button>
        </div>
      )}

      {isApproved && (
        <div className="flex items-center gap-1.5 border-t pt-3" style={{ borderColor: P.border }}>
          <ShieldCheck className="size-4" style={{ color: P.primary }} />
          <span className="text-sm font-semibold" style={{ color: P.primary }}>
            تم الاعتماد
          </span>
        </div>
      )}

      {v.status === "rejected" && (
        <div className="flex items-center gap-1.5 border-t pt-3" style={{ borderColor: P.border }}>
          <ShieldX className="size-4" style={{ color: "#ef4444" }} />
          <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
            مرفوض
          </span>
        </div>
      )}
    </div>
  )
}

function IDImage({ label, src }: { label: string; src: string }) {
  const [error, setError] = useState(false)

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold" style={{ color: P.muted }}>
        {label}
      </p>
      {error ? (
        <div
          className="flex aspect-video items-center justify-center rounded-lg"
          style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
        >
          <ImageOff className="size-5" style={{ color: P.muted }} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          onError={() => setError(true)}
          className="aspect-video w-full rounded-lg object-cover"
          style={{ border: `1px solid ${P.border}` }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: AdminVerification["status"] }) {
  const meta = {
    pending: { label: "بانتظار المراجعة", color: "#f59e0b", bg: "#fef3c7" },
    approved: { label: "معتمد", color: P.primary, bg: `${P.primary}14` },
    rejected: { label: "مرفوض", color: "#ef4444", bg: "#fee2e2" },
  }[status]

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 rounded"
          style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
        />
      ))}
    </div>
  )
}
