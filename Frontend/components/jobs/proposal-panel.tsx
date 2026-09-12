"use client";

import { formatJobBudget } from "@/components/jobs/job-budget";
import type { JobGating } from "@/components/jobs/job-gating";
import type { JobProposal } from "@/components/jobs/use-job-proposal";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Job } from "~/types/job";

export function ProposalPanel({
  job: j,
  id,
  proposal,
  gating,
}: {
  job: Job;
  id: string;
  proposal: JobProposal;
  gating: JobGating;
}) {
  const {
    showProposal,
    setShowProposal,
    coverLetter,
    setCoverLetter,
    bid,
    setBid,
    deliveryTime,
    setDeliveryTime,
    generating,
    generated,
    setGenerated,
    submitted,
    proposalError,
    proposalRef,
    submitting,
    proposalValid,
    openProposal,
    generateProposal,
    handleSubmit,
    DELIVERY_OPTIONS,
  } = proposal;
  const { mounted, authLoading, hasSession, effectiveLoggedIn, effectiveClient, isUnverifiedFreelancer, verificationStatus } = gating;
  const fmtBudget = formatJobBudget(j);

  return (
    <div
      ref={proposalRef}
      className="scroll-mt-4 border-b py-12 lg:py-16"
      style={{ borderColor: P.border }}
    >
      {j.already_applied && !submitted ? (
        <div
          className="flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: BG.subtle, border: `1px solid ${P.green}33` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${P.green}14`, border: `1px solid ${P.green}33` }}
            >
              <CheckCircle2 className="size-6" style={{ color: P.green }} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: P.text }}>
                قدّمت عرضاً على هذه الوظيفة
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: P.muted }}>
                لا يمكنك تقديم أكثر من عرض واحد. تابع حالته من لوحة التحكم.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/freelancer"
            className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ border: `1px solid ${P.border}`, color: P.text }}
          >
            عروضي
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

      ) : !mounted || (authLoading && !hasSession) ? (
        /* ── AUTH LOADING: session fetch in-flight, avoid flashing wrong state ── */
        <div
          className="h-20 animate-pulse rounded-2xl"
          style={{ background: BG.subtle }}
        />

      ) : !effectiveLoggedIn ? (
        /* ── GUEST: prompt to login ── */
        <div
          className="flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${P.primary}14`, color: P.primary }}
            >
              <Lock className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: P.text }}>
                هل أنت مونتير؟
              </h2>
              <p className="mt-1 text-sm" style={{ color: P.muted }}>
                سجّل دخولك بحساب المونتير لتقديم عرضك على هذه الوظيفة.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href={`/login?redirectTo=/video-jobs/${id}`}
              className="group inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: P.primary }}
            >
              تسجيل الدخول
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </Link>
            <Link
              href="/register"
              className="group inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ border: `1px solid ${P.border}`, color: P.text }}
            >
              إنشاء حساب
            </Link>
          </div>
        </div>

      ) : effectiveClient ? (
        /* ── CLIENT: can't apply to their own jobs ── */
        <div
          className="flex items-center gap-4 rounded-2xl p-6"
          style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
        >
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${P.primary}14`, color: P.primary }}
          >
            <Briefcase className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: P.text }}>أنت مسجّل كعميل</h2>
            <p className="mt-0.5 text-sm" style={{ color: P.muted }}>
              تقديم العروض متاح للمونتيرين فقط. يمكنك نشر وظائفك الخاصة من
              {" "}<Link href="/post-job" className="underline underline-offset-2" style={{ color: P.primary }}>هنا</Link>.
            </p>
          </div>
        </div>

      ) : isUnverifiedFreelancer ? (
        /* ── UNVERIFIED FREELANCER: must verify before submitting ── */
        <div
          className="flex flex-col items-start gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: `#FFF7ED`, border: `1px solid #F97316` + "40" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `#F9731614`, color: `#EA580C` }}
            >
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: P.text }}>
                تحتاج إلى التحقق من هويتك
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: P.muted }}>
                للحفاظ على بيئة عمل آمنة، يجب التحقق من هويتك قبل تقديم أي عرض.
                العملية سريعة ولا تستغرق سوى دقيقتين.
              </p>
              {verificationStatus === "pending" && (
                <p className="mt-2 text-sm font-semibold" style={{ color: `#EA580C` }}>
                  طلبك قيد المراجعة — سنُعلمك فور الانتهاء.
                </p>
              )}
            </div>
          </div>
          {verificationStatus !== "pending" && (
            <Link
              href="/verify"
              className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: `#EA580C` }}
            >
              ابدأ التحقق
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          )}
        </div>

      ) : !showProposal ? (
        <div
          className="flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: BG.subtle, border: `1px solid ${P.border}` }}
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: P.text }}>
              مهتمّ بهذه الوظيفة؟
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: P.muted }}>
              قدّم عرضك الآن — تكتبه لك المطابقة الذكية في ثوانٍ.
            </p>
          </div>
          <button
            type="button"
            onClick={openProposal}
            className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: P.primary }}
          >
            قدّم عرضك
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      ) : submitted ? (
        <div
          className="flex flex-col items-center rounded-2xl px-6 py-12 text-center"
          style={{ background: BG.subtle, border: `1px solid ${P.green}33` }}
        >
          <div
            className="flex size-16 items-center justify-center rounded-2xl"
            style={{ background: `${P.green}14`, border: `1px solid ${P.green}33` }}
          >
            <CheckCircle2 className="size-8" style={{ color: P.green }} />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight" style={{ color: P.text }}>
            تم إرسال <span style={{ color: P.green }}>عرضك</span> بنجاح
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: P.muted }}>
            وصل عرضك إلى {j.client_name}. سيراجعه العميل ويتواصل معك عبر الرسائل
            في حال كان مناسباً. يمكنك متابعة حالة عروضك من لوحة التحكم.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: P.primary }}
            >
              تصفّح وظائف أخرى
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl" style={{ color: P.text }}>
            قدّم <span style={{ color: P.primaryText }}>عرضك</span>
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: P.muted }}>
            اكتب رسالة مقنعة للعميل، أو دع المطابقة الذكية تكتبها لك.
          </p>

          {/* AI proposal generator */}
          <div
            className="mt-6 overflow-hidden rounded-2xl p-4"
            style={{ background: P.subtle, border: `1px solid ${P.primary}26` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "#fff", color: P.primary, border: `1px solid ${P.primary}20` }}
                >
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold" style={{ color: P.text }}>
                    مساعد كتابة العروض
                  </p>
                  <p className="text-xs" style={{ color: P.muted }}>
                    يكتب رسالة مخصّصة تبرز أدواتك وتناسب هذه الوظيفة.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={generateProposal}
                disabled={generating}
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: P.primary }}
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    جارٍ الكتابة…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    {generated ? "إعادة الكتابة" : "اكتب لي عرضاً"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* cover letter */}
          <div className="mt-6 flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: P.text }}>
              رسالة العرض
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => {
                setCoverLetter(e.target.value);
                setGenerated(false);
              }}
              rows={9}
              placeholder="عرّف العميل بنفسك، واشرح كيف ستنفّذ المونتاج ولماذا أنت الأنسب…"
              className="w-full resize-y rounded-xl bg-white p-4 text-sm leading-relaxed outline-none transition-colors focus:ring-2"
              style={{
                border: `1px solid ${P.border}`,
                color: P.text,
                // @ts-expect-error focus ring tint
                "--tw-ring-color": `${P.primary}40`,
              }}
            />
            <span className="text-xs" style={{ color: P.muted }}>
              {toArabicDigits(coverLetter.length)} حرف · يُنصح بـ ٤٠ حرفاً على الأقل
            </span>
          </div>

          {/* bid + delivery */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold" style={{ color: P.text }}>
                {j.budget_type === "fixed" ? "سعرك للفيديو" : "سعرك بالساعة"}
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-s-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: P.muted }}
                >
                  $
                </span>
                <input
                  value={bid}
                  onChange={(e) => setBid(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder={String(Math.round((j.budget_min + j.budget_max) / 2))}
                  className="h-12 w-full rounded-xl bg-white ps-8 pe-4 text-sm outline-none transition-colors focus:ring-2"
                  style={{
                    border: `1px solid ${P.border}`,
                    color: P.text,
                    // @ts-expect-error focus ring tint
                    "--tw-ring-color": `${P.primary}40`,
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: P.muted }}>
              ميزانية العميل: {fmtBudget}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold" style={{ color: P.text }}>
                مدة التسليم
              </label>
              <div className="relative">
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl bg-white ps-4 pe-10 text-sm font-medium outline-none transition-colors focus:ring-2"
                  style={{
                    border: `1px solid ${P.border}`,
                    color: deliveryTime ? P.text : P.muted,
                    // @ts-expect-error focus ring tint
                    "--tw-ring-color": `${P.primary}40`,
                  }}
                >
                  <option value="">اختر مدة التسليم</option>
                  {DELIVERY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <Clock className="pointer-events-none absolute inset-e-3.5 top-1/2 size-4 -translate-y-1/2" style={{ color: P.muted }} />
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!proposalValid || submitting}
              className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: P.primary }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جارٍ الإرسال…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  إرسال العرض
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowProposal(false)}
              className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors hover:opacity-70"
              style={{ color: P.muted }}
            >
              إلغاء
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: P.muted }}>
              <ShieldCheck className="size-4" style={{ color: P.green }} />
              مدفوعاتك محمية بنظام الضمان
            </span>
          </div>
          {proposalError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {proposalError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
