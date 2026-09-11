"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Trash2,
  Ban,
  AlertTriangle,
  Wallet,
  MoreVertical,
  BadgeCheck,
  X,
  CheckCircle2,
} from "lucide-react"
import { getAdminUsersOptions } from "~/api/admin/queries"
import {
  useAdminBanUser,
  useAdminDeleteUser,
  useAdminSendWarning,
  useAdminAddBalance,
  useAdminDeductBalance,
} from "~/api/admin/mutations"
import { P, BG } from "~/lib/design-tokens"
import type { AdminUser } from "~/types/admin"

type Filter = "all" | "client" | "Freelance"

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [warningModal, setWarningModal] = useState<AdminUser | null>(null)
  const [balanceModal, setBalanceModal] = useState<{ user: AdminUser; mode: "add" | "deduct" } | null>(null)
  const [actionError, setActionError] = useState("")

  const { data, isPending } = useQuery(
    getAdminUsersOptions(filter === "all" ? undefined : filter),
  )
  const users = data?.data ?? []

  const banMutation = useAdminBanUser()
  const deleteMutation = useAdminDeleteUser()
  const warningMutation = useAdminSendWarning()
  const balanceMutation = useAdminAddBalance()
  const deductMutation = useAdminDeductBalance()

  async function handleBan(user: AdminUser) {
    setOpenMenu(null)
    try {
      await banMutation.mutateAsync({ userId: user.id, banned: user.status !== "banned" })
    } catch {
      setActionError("تعذّر تنفيذ الإجراء. حاول مجدداً.")
    }
  }

  async function handleDelete(user: AdminUser) {
    setOpenMenu(null)
    if (!confirm(`هل أنت متأكد من حذف حساب ${user.name}؟`)) return
    try {
      await deleteMutation.mutateAsync(user.id)
    } catch {
      setActionError("تعذّر حذف المستخدم. حاول مجدداً.")
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
          المستخدمون
        </h1>
      </div>

      {/* error banner */}
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
        {(["all", "client", "Freelance"] as Filter[]).map((f) => {
          const labels: Record<Filter, string> = { all: "الكل", client: "العملاء", Freelance: "المونتيرون" }
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: filter === f ? P.primary : P.muted,
                borderBottom: filter === f ? `2px solid ${P.primary}` : "2px solid transparent",
              }}
            >
              {labels[f]}
            </button>
          )
        })}
      </div>

      {/* table */}
      <div className="overflow-hidden bg-white" style={{ border: `1px solid ${P.border}` }}>
        {isPending ? (
          <TableSkeleton />
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: P.muted }}>
            لا يوجد مستخدمون في هذه الفئة.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: BG.subtle, borderBottom: `1px solid ${P.border}` }}>
                  {["المستخدم", "البريد الإلكتروني", "النوع", "الحالة", "الرصيد", "تاريخ الانضمام", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: P.muted }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    menuOpen={openMenu === user.id}
                    onMenuToggle={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                    onBan={() => handleBan(user)}
                    onDelete={() => handleDelete(user)}
                    onWarning={() => { setOpenMenu(null); setWarningModal(user) }}
                    onAddBalance={() => { setOpenMenu(null); setBalanceModal({ user, mode: "add" }) }}
                    onDeductBalance={() => { setOpenMenu(null); setBalanceModal({ user, mode: "deduct" }) }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* warning modal */}
      {warningModal && (
        <WarningModal
          user={warningModal}
          onClose={() => setWarningModal(null)}
          onSend={async (msg) => {
            await warningMutation.mutateAsync({ userId: warningModal.id, message: msg })
            setWarningModal(null)
          }}
          pending={warningMutation.isPending}
        />
      )}

      {/* balance modal */}
      {balanceModal && (
        <BalanceModal
          user={balanceModal.user}
          mode={balanceModal.mode}
          onClose={() => setBalanceModal(null)}
          onSubmit={async (amount) => {
            if (balanceModal.mode === "add") {
              await balanceMutation.mutateAsync({ userId: balanceModal.user.id, amount })
            } else {
              await deductMutation.mutateAsync({ userId: balanceModal.user.id, amount })
            }
            setBalanceModal(null)
          }}
          pending={balanceMutation.isPending || deductMutation.isPending}
        />
      )}
    </div>
  )
}

/* ─── User Row ─── */
function UserRow({
  user,
  menuOpen,
  onMenuToggle,
  onBan,
  onDelete,
  onWarning,
  onAddBalance,
  onDeductBalance,
}: {
  user: AdminUser
  menuOpen: boolean
  onMenuToggle: () => void
  onBan: () => void
  onDelete: () => void
  onWarning: () => void
  onAddBalance: () => void
  onDeductBalance: () => void
}) {
  const statusColors: Record<AdminUser["status"], string> = {
    active: "#10b981",
    banned: "#ef4444",
    inactive: "#94a3b8",
  }
  const statusLabels: Record<AdminUser["status"], string> = {
    active: "نشط",
    banned: "محظور",
    inactive: "غير نشط",
  }
  const roleLabels: Record<AdminUser["role"], string> = {
    client: "عميل",
    Freelance: "مونتير",
  }

  return (
    <tr
      className="transition-colors hover:bg-[#fafafa]"
      style={{ borderBottom: `1px solid ${P.border}` }}
    >
      {/* name + avatar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold"
            style={{
              background: `${user.avatar_color ?? P.primary}18`,
              color: user.avatar_color ?? P.primary,
            }}
          >
            {user.name.trim()[0]}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold" style={{ color: P.text }}>
                {user.name}
              </span>
              {user.is_email_verified && (
                <BadgeCheck className="size-3.5" style={{ color: P.primary }} />
              )}
            </div>
            {user.is_id_verified && (
              <span className="text-[10px]" style={{ color: P.muted }}>
                موثّق بالهوية
              </span>
            )}
          </div>
        </div>
      </td>

      {/* email */}
      <td className="px-4 py-3 font-tech text-sm" style={{ color: P.muted }}>
        {user.email}
      </td>

      {/* role */}
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            background: user.role === "Freelance" ? `${P.primary}14` : "#f1f5f9",
            color: user.role === "Freelance" ? P.primaryText : P.muted,
          }}
        >
          {roleLabels[user.role]}
        </span>
      </td>

      {/* status */}
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: statusColors[user.status] }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: statusColors[user.status] }}
          />
          {statusLabels[user.status]}
        </span>
      </td>

      {/* balance */}
      <td className="px-4 py-3 font-tech font-semibold tabular-nums" style={{ color: P.text }}>
        ${user.balance.toLocaleString()}
      </td>

      {/* joined */}
      <td className="px-4 py-3 text-[11px]" style={{ color: P.muted }}>
        {new Date(user.joined_at).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </td>

      {/* actions */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            type="button"
            onClick={onMenuToggle}
            className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-black/5"
            style={{ color: P.muted }}
          >
            <MoreVertical className="size-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute end-0 top-9 z-20 w-44 overflow-hidden rounded-xl py-1 shadow-lg"
              style={{ background: "#fff", border: `1px solid ${P.border}` }}
            >
              <MenuItem
                icon={<Ban className="size-4" />}
                label={user.status === "banned" ? "رفع الحظر" : "حظر المستخدم"}
                color={user.status === "banned" ? P.primary : "#ef4444"}
                onClick={onBan}
              />
              <MenuItem
                icon={<AlertTriangle className="size-4" />}
                label="إرسال تحذير"
                color="#f59e0b"
                onClick={onWarning}
              />
              <MenuItem
                icon={<Wallet className="size-4" />}
                label="إضافة رصيد"
                color={P.primary}
                onClick={onAddBalance}
              />
              <MenuItem
                icon={<Wallet className="size-4" />}
                label="خصم رصيد"
                color="#f59e0b"
                onClick={onDeductBalance}
              />
              <div style={{ borderTop: `1px solid ${P.border}`, margin: "4px 0" }} />
              <MenuItem
                icon={<Trash2 className="size-4" />}
                label="حذف الحساب"
                color="#ef4444"
                onClick={onDelete}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function MenuItem({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-[#fafafa]"
      style={{ color }}
    >
      {icon}
      {label}
    </button>
  )
}

/* ─── Warning Modal ─── */
function WarningModal({
  user,
  onClose,
  onSend,
  pending,
}: {
  user: AdminUser
  onClose: () => void
  onSend: (msg: string) => void
  pending: boolean
}) {
  const [msg, setMsg] = useState("")

  return (
    <Modal title={`إرسال تحذير لـ ${user.name}`} onClose={onClose}>
      <textarea
        rows={4}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="اكتب نص التحذير هنا…"
        className="w-full resize-none rounded-xl p-3 text-sm outline-none focus:ring-2"
        style={{
          border: `1px solid ${P.border}`,
          color: P.text,
          // @ts-expect-error css var
          "--tw-ring-color": P.primary,
        }}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.muted }}
        >
          إلغاء
        </button>
        <button
          type="button"
          disabled={!msg.trim() || pending}
          onClick={() => onSend(msg)}
          className="h-9 rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "#f59e0b" }}
        >
          {pending ? "جارٍ الإرسال…" : "إرسال التحذير"}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Balance Modal (add & deduct) ─── */
function BalanceModal({
  user,
  mode,
  onClose,
  onSubmit,
  pending,
}: {
  user: AdminUser
  mode: "add" | "deduct"
  onClose: () => void
  onSubmit: (amount: number) => void
  pending: boolean
}) {
  const [amount, setAmount] = useState("")
  const isAdd = mode === "add"

  return (
    <Modal
      title={isAdd ? `إضافة رصيد لـ ${user.name}` : `خصم رصيد من ${user.name}`}
      onClose={onClose}
    >
      <p className="mb-3 text-sm" style={{ color: P.muted }}>
        الرصيد الحالي:{" "}
        <span className="font-tech font-bold tabular-nums" style={{ color: P.text }}>
          ${user.balance.toLocaleString()}
        </span>
      </p>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="المبلغ بالدولار"
        className="w-full rounded-xl p-3 text-sm outline-none focus:ring-2"
        style={{ border: `1px solid ${P.border}`, color: P.text }}
      />
      {!isAdd && (
        <p className="mt-2 text-[11px]" style={{ color: "#f59e0b" }}>
          سيتوقف الخصم عند الصفر — لن يصبح الرصيد سالباً.
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.muted }}
        >
          إلغاء
        </button>
        <button
          type="button"
          disabled={!amount || Number(amount) <= 0 || pending}
          onClick={() => onSubmit(Number(amount))}
          className="h-9 rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: isAdd ? P.primary : "#f59e0b" }}
        >
          {pending ? (isAdd ? "جارٍ الإضافة…" : "جارٍ الخصم…") : (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              {isAdd ? "إضافة الرصيد" : "خصم الرصيد"}
            </span>
          )}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Generic Modal ─── */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        style={{ border: `1px solid ${P.border}` }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold" style={{ color: P.text }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-black/5"
            style={{ color: P.muted }}
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5"
          style={{ borderBottom: `1px solid ${P.border}` }}
        >
          <div className="size-9 rounded-full" style={{ background: P.border }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded" style={{ background: P.border }} />
            <div className="h-2.5 w-48 rounded" style={{ background: P.border }} />
          </div>
        </div>
      ))}
    </div>
  )
}
