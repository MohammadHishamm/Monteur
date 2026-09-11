import { TIER_LABELS, type Tier } from "@/components/freelancers/types";
import { DURATIONS } from "@/components/post-job/config";
import { Field, inputBase, inputStyle, Select, StepIntro } from "@/components/post-job/form-controls";
import type { PostJobForm } from "@/components/post-job/use-post-job-form";
import { P } from "@/lib/design-tokens";
import { Sparkles } from "lucide-react";

export function StepBudget({ form }: { form: PostJobForm }) {
  const {
    budgetType, setBudgetType,
    budgetMin, setBudgetMin,
    budgetMax, setBudgetMax,
    minNum, maxNum, matchHint,
    duration, setDuration,
    experience, setExperience,
  } = form;

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="حدّد الميزانية والمدة"
        subtitle="تساعدنا الميزانية على ترشيح المستوى المناسب من المونتيرين."
      />

      <Field label="نوع الميزانية">
        <div
          className="inline-flex rounded-full p-1"
          style={{ background: P.subtle, border: `1px solid ${P.border}` }}
        >
          {([
            { id: "fixed", label: "سعر ثابت" },
            { id: "hourly", label: "بالساعة" },
          ] as const).map((o) => {
            const active = budgetType === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setBudgetType(o.id)}
                className="rounded-full px-6 py-2 text-sm font-semibold transition-colors"
                style={
                  active
                    ? { background: P.primary, color: "#fff" }
                    : { background: "transparent", color: P.muted }
                }
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label={budgetType === "fixed" ? "نطاق ميزانية البريف" : "نطاق السعر بالساعة"}
        hint="بالدولار الأمريكي"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
              style={{ color: P.muted }}
            >
              من $
            </span>
            <input
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder={budgetType === "fixed" ? "1000" : "15"}
              className={`${inputBase} ps-14`}
              style={inputStyle()}
            />
          </div>
          <span className="shrink-0 text-sm" style={{ color: P.muted }}>
            —
          </span>
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
              style={{ color: P.muted }}
            >
              إلى $
            </span>
            <input
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder={budgetType === "fixed" ? "3000" : "40"}
              className={`${inputBase} ps-14`}
              style={inputStyle()}
            />
          </div>
          {budgetType === "hourly" && (
            <span className="shrink-0 text-sm" style={{ color: P.muted }}>
              / ساعة
            </span>
          )}
        </div>
        {minNum > 0 && maxNum > 0 && maxNum < minNum && (
          <p className="text-xs font-medium" style={{ color: "#DC2626" }}>
            الحد الأقصى يجب أن يكون أكبر من الحد الأدنى.
          </p>
        )}
        {matchHint && (
          <div
            className="mt-1 flex items-start gap-2 rounded-xl p-3"
            style={{ background: `${P.primary}0C`, border: `1px solid ${P.primary}26` }}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: P.primaryText }} />
            <p className="text-xs leading-relaxed" style={{ color: P.text }}>
              {matchHint}
            </p>
          </div>
        )}
      </Field>

      <Field label="المدة المتوقعة">
        <Select
          value={duration}
          onChange={setDuration}
          placeholder="اختر المدة المتوقعة"
          options={DURATIONS.map((d) => ({ value: d, label: d }))}
        />
      </Field>

      <Field label="مستوى الخبرة المطلوب" optional>
        <Select
          value={experience === "any" ? "" : experience}
          onChange={(v) => setExperience((v || "any") as Tier | "any")}
          placeholder="دع مونتير يقرّر (مُوصى به)"
          options={Object.entries(TIER_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Field>
    </div>
  );
}
