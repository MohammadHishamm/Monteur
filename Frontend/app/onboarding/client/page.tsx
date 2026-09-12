"use client";

import { saveClientOnboarding } from "@/api/onboarding/mutations";
import type { ClientOnboarding } from "@/components/onboarding/types";
import {
    Field,
    OnboardingChrome,
    OptionGrid,
    inputCls,
    type OptionItem,
} from "@/components/onboarding/ui";
import { P } from "@/lib/design-tokens";
import {
    Briefcase,
    Building,
    Building2,
    CalendarClock,
    CalendarRange,
    Clapperboard,
    Compass,
    FileText,
    GraduationCap,
    HeartPulse,
    Megaphone,
    MoreHorizontal,
    Repeat,
    ShoppingBag,
    User,
    Users,
    UsersRound,
    UtensilsCrossed,
    Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const COMPANY_SIZES: OptionItem[] = [
  { value: "solo", label: "فرد / رائد أعمال", icon: User },
  { value: "small", label: "شركة صغيرة (٢–١٠)", icon: Users },
  { value: "medium", label: "متوسطة (١١–٥٠)", icon: Building2 },
  { value: "large", label: "كبيرة (+٥٠)", icon: Building },
];

const INDUSTRIES: OptionItem[] = [
  { value: "ecommerce", label: "تجارة إلكترونية", icon: ShoppingBag },
  { value: "marketing", label: "تسويق وإعلان", icon: Megaphone },
  { value: "education", label: "تعليم ومحتوى", icon: GraduationCap },
  { value: "health", label: "صحة وعافية", icon: HeartPulse },
  { value: "food", label: "مطاعم وأغذية", icon: UtensilsCrossed },
  { value: "services", label: "خدمات احترافية", icon: Briefcase },
  { value: "content", label: "صناعة المحتوى", icon: Clapperboard },
  { value: "other", label: "أخرى", icon: MoreHorizontal },
];

const INTENTS: OptionItem[] = [
  { value: "one-project", label: "بريف واحد", desc: "لديّ فيديو محدد أريد تنفيذه الآن.", icon: FileText },
  { value: "ongoing", label: "محتوى مستمر", desc: "أحتاج مونتاجاً منتظماً على المدى الطويل.", icon: Repeat },
  { value: "team", label: "فريق مونتاج", desc: "أبحث عن عدة مونتيرين لتشكيل فريق.", icon: UsersRound },
  { value: "exploring", label: "أستكشف فقط", desc: "أتعرّف على المنصة وما تقدّمه.", icon: Compass },
];

const URGENCIES: OptionItem[] = [
  { value: "now", label: "فوراً", desc: "أريد البدء خلال أيام.", icon: Zap },
  { value: "soon", label: "قريباً", desc: "خلال الأسابيع القادمة.", icon: CalendarClock },
  { value: "later", label: "لاحقاً", desc: "ما زلت في مرحلة التخطيط.", icon: CalendarRange },
];

const BUDGETS: OptionItem[] = [
  { value: "lt500", label: "أقل من ٥٠٠$", desc: "مقاطع قصيرة وسريعة." },
  { value: "500-2k", label: "٥٠٠$ – ٢٬٠٠٠$", desc: "مشاريع متوسطة." },
  { value: "2k-10k", label: "٢٬٠٠٠$ – ١٠٬٠٠٠$", desc: "إنتاج احترافي متكامل." },
  { value: "gt10k", label: "أكثر من ١٠٬٠٠٠$", desc: "مشاريع كبيرة ومستمرة." },
];

const ENGAGEMENTS: OptionItem[] = [
  { value: "fixed", label: "سعر ثابت", desc: "ميزانية محددة لكامل البريف." },
  { value: "hourly", label: "بالساعة", desc: "أدفع مقابل وقت العمل الفعلي." },
  { value: "both", label: "كلاهما", desc: "حسب طبيعة كل بريف." },
];

const TOTAL = 4;

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ClientOnboarding>({
    fullName: "",
    website: "",
    companySize: "",
    industry: "",
    hiringIntent: "",
    urgency: "",
    budgetBand: "",
    engagement: "",
  });

  function set(p: Partial<ClientOnboarding>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  const canNext =
    step === 1
      ? data.fullName.trim().length > 0 && !!data.companySize
      : step === 2
        ? !!data.industry
        : step === 3
          ? !!data.hiringIntent && !!data.urgency
          : !!data.budgetBand && !!data.engagement;

  async function next() {
    if (step < TOTAL) {
      setStep((s) => s + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await saveClientOnboarding(data);
      if (res.ok) {
        // The onboarding handler commits onboarding_completed before responding, so the
        // session endpoint (and middleware gate) reflect completion immediately.
        router.push("/client");
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

  const meta = [
    { eyebrow: "عن شركتك", title: <>عرّفنا <span style={{ color: P.primaryText }}>بنفسك</span></>, subtitle: "نستخدم هذه المعلومات لتخصيص تجربتك واقتراح المونتيرين المناسبين." },
    { eyebrow: "مجال العمل", title: <>ما <span style={{ color: P.primaryText }}>مجالك</span>؟</>, subtitle: "يساعدنا ذلك على فهم نوع الفيديو الذي تحتاجه بشكل أدق." },
    { eyebrow: "هدف التعاون", title: <>ماذا <span style={{ color: P.primaryText }}>تحتاج</span>؟</>, subtitle: "أخبرنا بطبيعة الفيديو ومدى استعجالك." },
    { eyebrow: "الميزانية", title: <>تفضيلات <span style={{ color: P.primaryText }}>الميزانية</span></>, subtitle: "لمطابقتك مع المستوى المناسب من المونتيرين." },
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
      exitHref="/client"
    >
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Field label="اسمك الكامل">
            <input className={inputCls} value={data.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="مثال: أحمد محمد" />
          </Field>
          <Field label="الموقع الإلكتروني" optional>
            <input className={inputCls} dir="ltr" value={data.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="حجم الشركة">
            <OptionGrid options={COMPANY_SIZES} value={data.companySize} onChange={(v) => set({ companySize: v as ClientOnboarding["companySize"] })} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <OptionGrid options={INDUSTRIES} value={data.industry} onChange={(v) => set({ industry: v })} />
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <Field label="ما الذي تبحث عنه؟">
            <OptionGrid options={INTENTS} value={data.hiringIntent} onChange={(v) => set({ hiringIntent: v as ClientOnboarding["hiringIntent"] })} cols={1} />
          </Field>
          <Field label="متى تريد البدء؟">
            <OptionGrid options={URGENCIES} value={data.urgency} onChange={(v) => set({ urgency: v as ClientOnboarding["urgency"] })} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6">
          <Field label="ميزانية البريف المعتادة">
            <OptionGrid options={BUDGETS} value={data.budgetBand} onChange={(v) => set({ budgetBand: v as ClientOnboarding["budgetBand"] })} />
          </Field>
          <Field label="طريقة التعاقد المفضّلة">
            <OptionGrid options={ENGAGEMENTS} value={data.engagement} onChange={(v) => set({ engagement: v as ClientOnboarding["engagement"] })} />
          </Field>
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-center text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </OnboardingChrome>
  );
}
