"use client";

import { STEPS } from "@/components/post-job/config";
import { PostJobStepper } from "@/components/post-job/post-job-stepper";
import { PublishedScreen } from "@/components/post-job/published-screen";
import { StepBasics } from "@/components/post-job/step-basics";
import { StepBudget } from "@/components/post-job/step-budget";
import { StepReview } from "@/components/post-job/step-review";
import { StepScope } from "@/components/post-job/step-scope";
import { usePostJobForm } from "@/components/post-job/use-post-job-form";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { SectionLabel } from "@/components/marketing/section-heading";
import { BG, cardShadow, P } from "@/lib/design-tokens";
import { ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react";

export default function PostJobPage() {
  const form = usePostJobForm();
  const { step, stepValid, publishing, next, back } = form;

  if (form.published) {
    return (
      <MarketingLayout>
        <PublishedScreen form={form} />
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      {/* ════════════ HEADER BAND ════════════ */}
      <section className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <div className="flex flex-col items-center">
            <SectionLabel>انشر بريف فيديو</SectionLabel>
            <h1
              className="tracking-tight mt-4 text-3xl font-bold sm:text-4xl lg:text-[2.8rem]"
              style={{ color: P.text }}
            >
              صِف فيديوك، ودع <span style={{ color: P.primaryText }}>المطابقة الذكية</span> تجد المونتير
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: P.muted }}>
              أربع خطوات سريعة تفصلك عن أفضل ٣ مونتيرين مطابقين لبريفك — دون
              تصفّح عشرات الملفات.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════ FORM BAND ════════════ */}
      <section style={{ background: BG.subtle }}>
        <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16">
          <PostJobStepper step={step} />

          {/* ── card ── */}
          <div
            className="rounded-3xl bg-white p-6 sm:p-8 lg:p-10"
            style={{ border: `1px solid ${P.border}`, boxShadow: cardShadow }}
          >
            {step === 0 && <StepBasics form={form} />}
            {step === 1 && <StepScope form={form} />}
            {step === 2 && <StepBudget form={form} />}
            {step === 3 && <StepReview form={form} />}

            {/* ── footer nav ── */}
            <div
              className="mt-8 flex items-center justify-between gap-3 border-t pt-6"
              style={{ borderColor: P.border }}
            >
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors hover:opacity-70"
                  style={{ color: P.muted }}
                >
                  <ArrowRight className="size-4" />
                  رجوع
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={next}
                disabled={!stepValid || publishing}
                className="group inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: P.primary, color: "#fff" }}
              >
                {step === STEPS.length - 1 ? (
                  publishing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      جارٍ النشر…
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      انشر وابدأ المطابقة
                    </>
                  )
                ) : (
                  <>
                    التالي
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* reassurance line */}
          <p className="mt-5 text-center text-xs" style={{ color: P.muted }}>
            النشر مجاني تماماً · يستغرق أقل من دقيقتين
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
