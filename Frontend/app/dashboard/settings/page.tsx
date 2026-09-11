"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { changePassword, updateAccount } from "~/api/account/mutations";
import { apiFetch } from "~/api/utils";

type Status = { ok: boolean; msg: string } | null;

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"account" | "password">("account");

  // account info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [acctPending, setAcctPending] = useState(false);
  const [acctStatus, setAcctStatus] = useState<Status>(null);

  // password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwPending, setPwPending] = useState(false);
  const [pwStatus, setPwStatus] = useState<Status>(null);

  useEffect(() => {
    apiFetch<{ id: string; name: string; email: string; role: string }>("/auth/session")
      .then((s) => {
        setName(s.name ?? "");
        setEmail(s.email ?? "");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleAcctSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setAcctPending(true);
    setAcctStatus(null);
    try {
      await updateAccount(name.trim(), email.trim());
      setAcctStatus({ ok: true, msg: "تم حفظ المعلومات بنجاح" });
    } catch (err: unknown) {
      setAcctStatus({ ok: false, msg: err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "حدث خطأ" });
    } finally {
      setAcctPending(false);
    }
  }

  async function handlePwSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwStatus({ ok: false, msg: "كلمة المرور الجديدة غير متطابقة" });
      return;
    }
    if (newPw.length < 8) {
      setPwStatus({ ok: false, msg: "يجب أن تكون كلمة المرور 8 أحرف على الأقل" });
      return;
    }
    setPwPending(true);
    setPwStatus(null);
    try {
      await changePassword(curPw, newPw);
      setPwStatus({ ok: true, msg: "تم تغيير كلمة المرور بنجاح" });
      setCurPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: unknown) {
      setPwStatus({ ok: false, msg: err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "حدث خطأ" });
    } finally {
      setPwPending(false);
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl">

        {/* ── Tabs ── */}
        <div className="mb-6 flex gap-1 border-b border-[#ECECF0]">
          {([
            { key: "account", label: "معلومات الحساب" },
            { key: "password", label: "كلمة المرور" },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "px-4 pb-3 pt-1 text-sm font-semibold transition-colors border-b-2 -mb-px",
                tab === t.key
                  ? "border-[#10B981] text-[#10B981]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Account info ── */}
        {tab === "account" && (
        <section className="bg-white p-6" style={{ border: "1px solid #ECECF0" }}>
          <h2 className="text-base font-semibold text-[#0F172A]">معلومات الحساب</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">الاسم وعنوان البريد الإلكتروني.</p>

          <form onSubmit={handleAcctSave} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0F172A]">الاسم الكامل</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-lg border border-[#ECECF0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0F172A]">البريد الإلكتروني</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-lg border border-[#ECECF0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </label>

            {acctStatus && <StatusBanner status={acctStatus} />}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={acctPending}
                className="inline-flex h-10 items-center rounded-lg bg-[#10B981] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {acctPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
              </button>
            </div>
          </form>
        </section>
        )}

        {/* ── Password ── */}
        {tab === "password" && (
        <section className="bg-white p-6" style={{ border: "1px solid #ECECF0" }}>
          <h2 className="text-base font-semibold text-[#0F172A]">تغيير كلمة المرور</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">يجب إدخال كلمة المرور الحالية للتغيير.</p>

          <form onSubmit={handlePwSave} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0F172A]">كلمة المرور الحالية</span>
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                required
                className="h-10 rounded-lg border border-[#ECECF0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0F172A]">كلمة المرور الجديدة</span>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                className="h-10 rounded-lg border border-[#ECECF0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0F172A]">تأكيد كلمة المرور</span>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                className="h-10 rounded-lg border border-[#ECECF0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </label>

            {pwStatus && <StatusBanner status={pwStatus} />}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwPending}
                className="inline-flex h-10 items-center rounded-lg bg-[#10B981] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pwPending ? "جارٍ التغيير…" : "تغيير كلمة المرور"}
              </button>
            </div>
          </form>
        </section>
        )}
    </div>
  );
}

function StatusBanner({ status }: { status: { ok: boolean; msg: string } }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
      style={{
        background: status.ok ? "#ECFDF5" : "#FEF2F2",
        border: `1px solid ${status.ok ? "#10B981" : "#F87171"}`,
        color: status.ok ? "#065F46" : "#991B1B",
      }}
    >
      {status.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      {status.msg}
    </div>
  );
}
