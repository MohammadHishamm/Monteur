"use client";

import {
    ProjectEditor,
    newEditableProject,
} from "@/components/dashboard/project-editor";
import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import type { FreelancerOnboarding } from "@/components/onboarding/types";
import {
    AvatarUpload,
    ChipInput,
    Field,
    OnboardingChrome,
    OptionGrid,
    inputCls,
    type OptionItem,
} from "@/components/onboarding/ui";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { Award, Crown, Plus, Sprout, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveFreelancerOnboarding } from "~/api/onboarding/mutations";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const EXPERIENCE: OptionItem[] = [
  { value: "junior", label: "مبتدئ", desc: "أقل من سنتين خبرة.", icon: Sprout },
  { value: "mid", label: "متوسط", desc: "٢–٥ سنوات خبرة.", icon: TrendingUp },
  { value: "senior", label: "محترف", desc: "٥–١٠ سنوات خبرة.", icon: Award },
  { value: "expert", label: "خبير", desc: "أكثر من ١٠ سنوات.", icon: Crown },
];

/** Video-editing tools suggested in the chip input. */
const TOOL_SUGGESTIONS = [
  "Premiere Pro", "After Effects", "DaVinci Resolve", "Final Cut Pro",
  "Cinema 4D", "CapCut", "Audition", "Photoshop", "Illustrator", "Figma",
  "Motion", "Nuke",
];

const TOTAL = 4;

export default function FreelancerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [data, setData] = useState<FreelancerOnboarding>({
    fullName: "",
    role: "",
    city: "",
    country: "",
    avatar: "",
    tagline: "",
    about: "",
    category: "",
    skills: [],
    experience: "",
    portfolio: [],
  });

  function set(p: Partial<FreelancerOnboarding>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  const canNext =
    step === 1
      ? data.fullName.trim().length > 0 && data.role.trim().length > 0 && data.city.trim().length > 0
      : step === 2
        ? data.tagline.trim().length > 0 && data.about.trim().length >= 60
        : step === 3
          ? !!data.category && data.skills.length >= 3 && !!data.experience
          : true; // step 4 (portfolio) is optional

  async function finish() {
    setBusy(true);
    setError("");
    try {
      const res = await saveFreelancerOnboarding(data);
      if (res.ok) {
        // The onboarding handler commits onboarding_completed before responding, so the
        // session endpoint (and middleware gate) reflect completion immediately.
        router.push("/freelancer");
      } else {
        setError("حدث خطأ أثناء الحفظ. حاول مجدداً.");
        setBusy(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر الاتصال بالخادم";
      setError(msg);
      setBusy(false);
    }
  }

  function next() {
    if (step < TOTAL) setStep((s) => s + 1);
    else finish();
  }

  /* portfolio helpers — identical model to the profile editor */
  function addProject() {
    const proj = newEditableProject(
      (data.category || "youtube") as Category,
      data.portfolio.length,
    );
    set({ portfolio: [...data.portfolio, proj] });
    setEditingId(proj.id);
  }
  function updateProject(id: string, next: FreelancerOnboarding["portfolio"][number]) {
    set({ portfolio: data.portfolio.map((x) => (x.id === id ? next : x)) });
  }
  function removeProject(id: string) {
    set({ portfolio: data.portfolio.filter((x) => x.id !== id) });
    if (editingId === id) setEditingId(null);
  }

  const meta = [
    { eyebrow: "الملف الأساسي", title: <>لنبدأ <span style={{ color: P.primaryText }}>بملفك</span></>, subtitle: "هذه المعلومات تظهر في أعلى ملفك العام أمام العملاء." },
    { eyebrow: "نبذة عنك", title: <>عرّف العملاء <span style={{ color: P.primaryText }}>بأسلوبك</span></>, subtitle: "اكتب نبذة واضحة عمّا تقدّمه من خبرة في المونتاج وما يميّزك." },
    { eyebrow: "أدواتك", title: <>ما الذي <span style={{ color: P.primaryText }}>تتقنه</span>؟</>, subtitle: "نستخدم أدواتك لمطابقتك مع الوظائف المناسبة." },
    { eyebrow: "الشو-ريل والأعمال", title: <>أضف <span style={{ color: P.primaryText }}>أعمالك</span></>, subtitle: "كل مقطع تضيفه يصبح دراسة حالة كاملة. يمكنك التخطّي وإضافتها لاحقاً." },
  ][step - 1];

  return (
    <OnboardingChrome
      step={step}
      total={TOTAL}
      eyebrow={meta.eyebrow}
      title={meta.title}
      subtitle={meta.subtitle}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      onNext={next}
      nextLabel={step === TOTAL ? "إنهاء والانتقال للوحة" : "التالي"}
      nextDisabled={!canNext}
      busy={busy}
      onSkip={step === TOTAL ? finish : undefined}
      exitHref="/freelancer"
    >
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Field label="الصورة الشخصية" optional>
            <AvatarUpload
              value={data.avatar}
              onChange={(avatar) => set({ avatar })}
              fallback={data.fullName.trim()[0] ?? "؟"}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="الاسم الكامل">
              <input className={inputCls} value={data.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="مثال: سارة خليل" />
            </Field>
            <Field label="المسمى المهني">
              <input className={inputCls} value={data.role} onChange={(e) => set({ role: e.target.value })} placeholder="مثال: مونتيرة يوتيوب وريلز" />
            </Field>
            <Field label="المدينة">
              <input className={inputCls} value={data.city} onChange={(e) => set({ city: e.target.value })} placeholder="القاهرة" />
            </Field>
            <Field label="الدولة">
              <input className={inputCls} value={data.country} onChange={(e) => set({ country: e.target.value })} placeholder="مصر" />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Field label="نبذة مختصرة (سطر واحد)" hint={`${toArabicDigits(data.tagline.length)}/١٢٠`}>
            <input className={inputCls} maxLength={120} value={data.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="جملة تلخّص أسلوبك وتخصصك في المونتاج" />
          </Field>
          <Field label="نبذة احترافية" hint={`${toArabicDigits(data.about.length)} حرف · ٦٠ حرفاً على الأقل`}>
            <textarea rows={6} className={`${inputCls} resize-y leading-relaxed`} value={data.about} onChange={(e) => set({ about: e.target.value })} placeholder="اكتب عن خبرتك في المونتاج، التخصصات التي تتقنها، والأدوات التي تستخدمها…" />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <Field label="تخصصك الرئيسي">
            <select className={inputCls} value={data.category} onChange={(e) => set({ category: e.target.value as Category })}>
              <option value="" disabled>اختر نوع المونتاج</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="الأدوات" hint="أضف ٣ أدوات على الأقل.">
            <ChipInput items={data.skills} onChange={(skills) => set({ skills })} placeholder="اكتب أداة ثم Enter (مثال: Premiere Pro)" suggestions={TOOL_SUGGESTIONS} />
          </Field>
          <Field label="مستوى الخبرة">
            <OptionGrid options={EXPERIENCE} value={data.experience} onChange={(v) => set({ experience: v as FreelancerOnboarding["experience"] })} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addProject}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: P.primary }}
            >
              <Plus className="size-4" />
              فيديو جديد
            </button>
          </div>
          {data.portfolio.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ background: BG.subtle, border: `1px dashed ${P.border}`, color: P.muted }}>
              لم تُضف أي مقطع بعد. أضف فيديو من شو-ريلك أو تخطَّ هذه الخطوة.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data.portfolio.map((proj) => (
                <ProjectEditor
                  key={proj.id}
                  project={proj}
                  open={editingId === proj.id}
                  onToggle={() => setEditingId((cur) => (cur === proj.id ? null : proj.id))}
                  onChange={(nextProj) => updateProject(proj.id, nextProj)}
                  onRemove={() => removeProject(proj.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </OnboardingChrome>
  );
}
