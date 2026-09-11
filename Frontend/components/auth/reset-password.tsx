"use client";

import { AsideMetrics, AuthAsideShell } from "@/components/auth/aside";
import { BlobBackground, GlassStyles } from "@/components/auth/effects";
import { P } from "@/components/auth/tokens";
import { StudioLogo } from "@/components/brand/studio-logo";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

const ResetAside = () => (
  <AuthAsideShell footer={<AsideMetrics />}>
    <div className="flex flex-col gap-5">
      <span
        className="inline-flex w-fit items-center rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest"
        style={{ border: `1px solid ${P.mint}40`, background: `${P.mint}14`, color: P.mint }}
      >
        كلمة مرور جديدة
      </span>
      <h2 className="text-4xl font-bold leading-[1.2] tracking-tight xl:text-[2.9rem]" style={{ color: "#fff" }}>
        اختر كلمة مرور <span style={{ color: P.mint }}>قوية</span> وآمنة
      </h2>
      <p className="max-w-md text-base leading-relaxed" style={{ color: "#94A3B8" }}>
        استخدم ٦ أحرف على الأقل، ويُفضّل مزيجاً من الحروف والأرقام والرموز لحماية حسابك.
      </p>
    </div>
  </AuthAsideShell>
);

export const ResetPassword = ({ token }: { token: string }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tokenValid = token.trim().length > 0;
  const isPasswordValid = password.length >= 6;
  const isMatch = password === confirm && confirm.length > 0;
  const canSubmit = isPasswordValid && isMatch;
  const mismatch = confirm.length > 0 && !isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen w-full bg-background">
      <GlassStyles />

      {/* ── FORM COLUMN ── */}
      <div className="relative flex w-full flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <BlobBackground />
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-10">
          <StudioLogo size={52} />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            الرئيسية
            <ArrowLeft className="size-4" />
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-12">
          <div className="mx-auto flex w-full max-w-md flex-col gap-8 p-4">
            {!tokenValid ? (
              <div className="flex flex-col items-center gap-6 text-center">
                <span className="grid size-20 place-items-center rounded-full" style={{ background: "#DC262614", color: "#DC2626" }}>
                  <AlertCircle className="size-10" />
                </span>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">رابط غير صالح</h1>
                  <p className="mt-2 text-base text-muted-foreground">
                    رابط إعادة التعيين غير صحيح أو انتهت صلاحيته. اطلب رابطاً جديداً.
                  </p>
                </div>
                <Link
                  href="/forgot-password"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: P.accent }}
                >
                  طلب رابط جديد
                </Link>
              </div>
            ) : !done ? (
              <>
                <div className="text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    إعادة تعيين <span style={{ color: P.accent }}>كلمة المرور</span>
                  </h1>
                  <p className="mt-2 text-base text-muted-foreground">
                    أدخل كلمة مرور جديدة لا تقل عن ٦ أحرف.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
                  {/* New password */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="٦ أحرف على الأقل"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 w-full rounded-xl border border-border bg-background px-4 pe-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                      />
                      <button
                        type="button"
                        aria-label="إظهار كلمة المرور"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="أعد كتابة كلمة المرور"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="h-12 w-full rounded-xl border border-border bg-background px-4 pe-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                      />
                      <button
                        type="button"
                        aria-label="إظهار تأكيد كلمة المرور"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    {mismatch && (
                      <p className="text-sm font-medium" style={{ color: "#DC2626" }}>
                        كلمتا المرور غير متطابقتين.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="h-12 w-full rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: P.accent }}
                  >
                    {submitting ? "جارٍ التحديث…" : "تحديث كلمة المرور"}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4" style={{ color: P.green }} />
                  اتصال مشفّر · بياناتك محمية
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 text-center">
                <span className="grid size-20 place-items-center rounded-full" style={{ background: `${P.green}14`, color: P.green }}>
                  <CheckCircle2 className="size-10" />
                </span>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    تم <span style={{ color: P.accent }}>التحديث</span>
                  </h1>
                  <p className="mt-2 text-base text-muted-foreground">
                    تم تعيين كلمة مرورك الجديدة بنجاح. يمكنك الآن تسجيل الدخول.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: P.accent }}
                >
                  تسجيل الدخول
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
