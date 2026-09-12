import { CATEGORY_LABELS, TIER_LABELS } from "@/components/freelancers/types";
import { StepIntro } from "@/components/post-job/form-controls";
import type { PostJobForm } from "@/components/post-job/use-post-job-form";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { CheckCircle2, Clock, ShieldCheck, Tag, Wallet } from "lucide-react";

export function StepReview({ form }: { form: PostJobForm }) {
  const {
    title, summary, category, setStep,
    description, deliverables, skills,
    budgetType, minNum, maxNum, duration, experience,
    publishError,
  } = form;

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="راجع بريفك"
        subtitle="تأكد من التفاصيل قبل النشر — يمكنك الرجوع لأي خطوة للتعديل."
      />

      <div
        className="overflow-hidden rounded-2xl"
        style={{ border: `1px solid ${P.border}` }}
      >
        <div
          className="flex items-start justify-between gap-3 p-5"
          style={{ background: BG.subtle }}
        >
          <div>
            <p className="tracking-tight text-lg font-bold" style={{ color: P.text }}>
              {title || "—"}
            </p>
            {summary && (
              <p className="mt-1 text-sm" style={{ color: P.muted }}>
                {summary}
              </p>
            )}
            {category && (
              <span
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: `${P.primary}10`, color: P.primaryText, border: `1px solid ${P.primary}30` }}
              >
                <Tag className="size-3" />
                {CATEGORY_LABELS[category]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: P.primaryText }}
          >
            تعديل
          </button>
        </div>

        <div className="p-5">
          <p
            className="whitespace-pre-line text-sm leading-relaxed"
            style={{ color: P.muted }}
          >
            {description || "—"}
          </p>
          {deliverables.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {deliverables.map((d) => (
                <li
                  key={d}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: P.text }}
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: P.green }} />
                  {d}
                </li>
              ))}
            </ul>
          )}
          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium"
                  style={{ background: P.subtle, color: P.text }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="grid grid-cols-3 gap-px border-t"
          style={{ background: P.border, borderColor: P.border }}
        >
          {[
            {
              icon: Wallet,
              label: budgetType === "fixed" ? "الميزانية" : "بالساعة",
              value:
                minNum && maxNum
                  ? `$${toArabicDigits(minNum)} – $${toArabicDigits(maxNum)}${budgetType === "hourly" ? "/س" : ""}`
                  : "—",
            },
            { icon: Clock, label: "المدة", value: duration || "—" },
            {
              icon: ShieldCheck,
              label: "الخبرة",
              value: experience === "any" ? "تلقائي" : TIER_LABELS[experience],
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white px-4 py-4 text-center">
                <Icon className="mx-auto size-4" style={{ color: P.muted }} />
                <p className="mt-1.5 text-[11px]" style={{ color: P.muted }}>
                  {s.label}
                </p>
                <p className="mt-0.5 text-sm font-bold" style={{ color: P.text }}>
                  {s.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: P.muted }}>
        <ShieldCheck className="size-4" style={{ color: P.green }} />
        مدفوعاتك محمية بنظام الضمان · لا رسوم حتى تبدأ العمل.
      </div>

      {publishError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-center text-sm font-medium text-red-600">
          {publishError}
        </p>
      )}
    </div>
  );
}
