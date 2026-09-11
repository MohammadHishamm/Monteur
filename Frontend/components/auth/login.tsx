"use client";

import { AsideMetrics, AuthAsideShell } from "@/components/auth/aside";
import { BlobBackground, GlassStyles } from "@/components/auth/effects";
import { SocialButtons } from "@/components/auth/social-buttons";
import { P } from "@/components/auth/tokens";
import { StudioLogo } from "@/components/brand/studio-logo";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useEmailSigninMutation } from "~/api/auth/mutations";
import { getRedirectHome } from "~/lib/utils/auth-cookies";

// --- LOGIN BRAND ASIDE (minimal) ---
const LoginAside = () => (
  <AuthAsideShell footer={<AsideMetrics />}>
    <div className="flex flex-col gap-5">
      <span
        className="inline-flex w-fit items-center rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest"
        style={{
          border: `1px solid ${P.mint}40`,
          background: `${P.mint}14`,
          color: P.mint,
        }}
      >
        أهلاً بعودتك
      </span>
      <h2
        className="text-4xl font-bold leading-[1.2] tracking-tight xl:text-[2.9rem]"
        style={{ color: "#fff" }}
      >
        سعداء <span style={{ color: P.mint }}>بعودتك</span> إلى مونتير
      </h2>
      <p className="max-w-md text-base leading-relaxed" style={{ color: "#94A3B8" }}>
        سجّل الدخول لتكمل من حيث توقفت — مشاريعك، عروضك، ومحفظتك في مكان واحد.
      </p>
    </div>
  </AuthAsideShell>
);

// --- MAIN COMPONENT ---
export const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const signinMutation = useEmailSigninMutation();
  const loading = signinMutation.isPending;

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const canSubmit = isEmailValid && password.length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    try {
      const result = await signinMutation.mutateAsync({ email, password });
      const dest = new URLSearchParams(window.location.search).get("redirectTo");
      router.push(dest ?? getRedirectHome(result.data.user.roles ?? []));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(typeof msg === "string" ? msg : "فشل تسجيل الدخول. حاول مجدداً.");
    }
  };

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById("login-email") as HTMLInputElement | null;
      el?.focus();
    }, 400);
  }, []);

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
            {/* Heading */}
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                تسجيل <span style={{ color: P.accent }}>الدخول</span>
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                أهلاً بعودتك — أدخل بياناتك للمتابعة
              </p>
            </div>

            {/* Social login */}
            <div className="flex w-full flex-col items-center gap-4">
              <SocialButtons verb="تسجيل الدخول" />
              <div className="flex w-full items-center gap-3">
                <hr className="flex-1 border-border" />
                <span className="text-sm font-medium text-muted-foreground">أو</span>
                <hr className="flex-1 border-border" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium text-foreground">البريد الإلكتروني</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium text-foreground">كلمة المرور</label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة المرور"
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

              {/* Forgot password */}
              <div className="flex justify-start">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: P.accent }}
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              {/* Error message */}
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-base font-medium text-red-600">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-12 w-full rounded-xl text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: P.accent }}
              >
                {loading ? "جاري تسجيل الدخول…" : "تسجيل الدخول"}
              </button>
            </form>

            {/* Trust + register link */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" style={{ color: P.green }} />
                تسجيل دخول آمن ومحمي
              </div>
              <p className="text-base text-muted-foreground">
                ليس لديك حساب؟{" "}
                <Link
                  href="/register"
                  className="font-semibold transition-opacity hover:opacity-80"
                  style={{ color: P.accent }}
                >
                  سجّل الآن
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
