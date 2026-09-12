import { SUGGESTED_SKILLS } from "@/components/post-job/config";
import { Field, inputBase, inputStyle, StepIntro } from "@/components/post-job/form-controls";
import type { PostJobForm } from "@/components/post-job/use-post-job-form";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { CheckCircle2, Loader2, Plus, Sparkles, X } from "lucide-react";

export function StepScope({ form }: { form: PostJobForm }) {
  const {
    idea, setIdea,
    summary, setSummary,
    description, setDescription,
    skills, skillInput, setSkillInput,
    deliverables, deliverableInput, setDeliverableInput,
    category,
    generating, generated,
    runScopeBuilder,
    addSkill, removeSkill,
    addDeliverable, removeDeliverable,
    setGeneratedFalse,
  } = form;

  return (
    <div className="flex flex-col gap-6">
      <StepIntro
        title="صف نطاق العمل"
        subtitle="كلما زاد الوضوح، تحسّنت دقة المطابقة وجودة العروض."
      />

      {/* AI scope builder */}
      <div
        className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background: `linear-gradient(135deg, ${P.primary}0E, ${P.primary}04)`,
          border: `1px solid ${P.primary}26`,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${P.primary}14`, color: P.primary }}
          >
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: P.text }}>
              مساعد كتابة النطاق
            </p>
            <p className="text-xs" style={{ color: P.muted }}>
              اكتب فكرتك بإيجاز، وسيحوّلها المطابقة الذكية إلى وصف ومخرجات منظّمة.
            </p>
          </div>
        </div>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          placeholder="مثال: أريد إعلاناً قصيراً لمتجر ملابس مع موشن وتلوين وموسيقى…"
          className="mt-3 w-full resize-y rounded-xl bg-white p-3 text-sm leading-relaxed outline-none transition-colors focus:ring-2"
          style={{
            border: `1px solid ${P.primary}33`,
            color: P.text,
            // @ts-expect-error focus ring tint
            "--tw-ring-color": `${P.primary}40`,
          }}
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={runScopeBuilder}
            disabled={!idea.trim() || generating}
            className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: P.primary, color: "#fff" }}
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جارٍ الإنشاء…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {generated ? "إعادة الإنشاء" : "أنشئ الوصف"}
              </>
            )}
          </button>
        </div>
      </div>

      <Field
        label="نبذة مختصرة"
        hint={`${toArabicDigits(summary.length)}/١٢٠`}
      >
        <input
          value={summary}
          maxLength={120}
          onChange={(e) => {
            setSummary(e.target.value);
            setGeneratedFalse();
          }}
          placeholder="جملة واحدة تلخّص الوظيفة وتجذب المونتيرين"
          className={inputBase}
          style={inputStyle()}
        />
      </Field>

      <Field
        label="وصف الوظيفة"
        hint={`${toArabicDigits(description.length)} حرف`}
      >
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setGeneratedFalse();
          }}
          rows={8}
          placeholder="اشرح هدف الوظيفة، المتطلبات الأساسية، والمخرجات المتوقعة…"
          className="w-full resize-y rounded-xl bg-white p-4 text-sm leading-relaxed outline-none transition-colors focus:ring-2"
          style={inputStyle()}
        />
      </Field>

      <Field
        label="الأدوات المطلوبة"
        hint="أضف حتى ١٢ أداة"
      >
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5"
          style={{ border: `1px solid ${P.border}` }}
        >
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium"
              style={{ background: `${P.primary}10`, color: P.primaryText, border: `1px solid ${P.primary}30` }}
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                aria-label={`إزالة ${s}`}
                className="transition-opacity hover:opacity-70"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addSkill(skillInput);
              } else if (e.key === "Backspace" && !skillInput && skills.length) {
                removeSkill(skills[skills.length - 1]);
              }
            }}
            placeholder={skills.length ? "أضف أداة…" : "اكتب أداة واضغط Enter"}
            className="h-8 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none"
            style={{ color: P.text }}
          />
        </div>
        {category && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs" style={{ color: P.muted }}>
              مقترحة:
            </span>
            {SUGGESTED_SKILLS[category]
              .filter((s) => !skills.includes(s))
              .slice(0, 5)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: P.subtle, color: P.muted }}
                >
                  <Plus className="size-3" />
                  {s}
                </button>
              ))}
          </div>
        )}
      </Field>

      <Field
        label="المخرجات المطلوبة"
        hint="ما الذي سيُسلَّم عند الانتهاء؟"
      >
        <div className="flex flex-col gap-2">
          {deliverables.length > 0 && (
            <ul className="flex flex-col gap-2">
              {deliverables.map((d) => (
                <li
                  key={d}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5"
                  style={{ border: `1px solid ${P.border}` }}
                >
                  <CheckCircle2 className="size-4 shrink-0" style={{ color: P.green }} />
                  <span className="flex-1 text-sm" style={{ color: P.text }}>
                    {d}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDeliverable(d)}
                    aria-label={`إزالة ${d}`}
                    className="transition-opacity hover:opacity-70"
                    style={{ color: P.muted }}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div
            className="flex items-center gap-1 rounded-xl bg-white p-2"
            style={{ border: `1px solid ${P.border}` }}
          >
            <Plus className="ms-1 size-4 shrink-0" style={{ color: P.muted }} />
            <input
              value={deliverableInput}
              onChange={(e) => setDeliverableInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDeliverable(deliverableInput);
                }
              }}
              placeholder="مثال: نسخة ٩:١٦ نهائية — اضغط Enter للإضافة"
              className="h-8 flex-1 bg-transparent px-1 text-sm outline-none"
              style={{ color: P.text }}
            />
          </div>
        </div>
      </Field>
    </div>
  );
}
