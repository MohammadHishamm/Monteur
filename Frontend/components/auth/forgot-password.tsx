"use client";

import { AsideMetrics, AuthAsideShell } from "@/components/auth/aside";
import { BlobBackground, GlassStyles } from "@/components/auth/effects";
import { P } from "@/components/auth/tokens";
import { StudioLogo } from "@/components/brand/studio-logo";
import {
    ArrowLeft,
    ArrowRight,
    MailCheck,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const ForgotAside = () => (
  <AuthAsideShell footer={<AsideMetrics />}>
    <div className="flex flex-col gap-5">
      <span
        className="inline-flex w-fit items-center rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest"
        style={{ border: `1px solid ${P.mint}40`, background: `${P.mint}14`, color: P.mint }}
      >
        استعادة الوصول
      </span>
      <h2 className="text-4xl font-bold leading-[1.2] tracking-tight xl:text-[2.9rem]" style={{ color: "#fff" }}>
        لا تقلق، <span style={{ color: P.mint }}>سنعيدك</span> إلى حسابك
      </h2>
      <p className="max-w-md text-base leading-relaxed" style={{ color: "#94A3B8" }}>
        أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور في دقائق.
      </p>
    </div>
  </AuthAsideShell>
);

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEmailValid = /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgetpassword", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (sent) return;
    setTimeout(() => {
      const el = document.getElementById("forgot-email") as HTMLInputElement | null;
      el?.focus();
    }, 400);
  }, [sent]);

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
            {!sent ? (
              <>
                <div className="text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    نسيت <span style={{ color: P.accent }}>كلمة المرور</span>؟
                  </h1>
                  <p className="mt-2 text-base text-muted-foreground">
                    أدخل بريدك المسجّل وسنرسل لك رابط إعادة التعيين.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium text-foreground">البريد الإلكتروني</label>
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isEmailValid || submitting}
                    className="h-12 w-full rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: P.accent }}
                  >
                    {submitting ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"}
                  </button>
                </form>

                <p className="text-center text-base text-muted-foreground">
                  تذكّرت كلمة المرور؟{" "}
                  <Link href="/login" className="font-semibold transition-opacity hover:opacity-80" style={{ color: P.accent }}>
                    تسجيل الدخول
                  </Link>
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 text-center">
                <span
                  className="grid size-20 place-items-center rounded-full"
                  style={{ background: `${P.green}14`, color: P.green }}
                >
                  <MailCheck className="size-10" />
                </span>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    تحقّق من <span style={{ color: P.accent }}>بريدك</span>
                  </h1>
                  <p className="mt-2 text-base text-muted-foreground">
                    أرسلنا رابط إعادة تعيين كلمة المرور إلى
                  </p>
                  <p className="mt-1 text-base font-bold" style={{ color: P.navy }} dir="ltr">
                    {email}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4" style={{ color: P.green }} />
                  الرابط صالح لمدة ٦٠ دقيقة فقط
                </div>

                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-opacity hover:opacity-90"
                  style={{ background: P.accent, color: P.navy }}
                >
                  <ArrowRight className="size-4" />
                  العودة لتسجيل الدخول
                </Link>

                <p className="text-base text-muted-foreground">
                  لم يصلك شيء؟{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="font-semibold transition-opacity hover:opacity-80"
                    style={{ color: P.accent }}
                  >
                    أعد المحاولة
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
