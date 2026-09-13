"use client";

import { AboutSection } from "@/components/dashboard/freelancer-profile/about-section";
import { BasicsSection } from "@/components/dashboard/freelancer-profile/basics-section";
import { SECTIONS } from "@/components/dashboard/freelancer-profile/constants";
import { LanguagesSection } from "@/components/dashboard/freelancer-profile/languages-section";
import { ProfileEditorSkeleton } from "@/components/dashboard/freelancer-profile/profile-skeleton";
import { SkillsSection } from "@/components/dashboard/freelancer-profile/skills-section";
import { useProfileEditor } from "@/components/dashboard/freelancer-profile/use-profile-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { ArrowLeft, Check, Clapperboard, Eye, Save, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const PAGE_TITLE = "تعديل الملف الشخصي";
const PAGE_DESC =
  "المعلومات التي تضيفها هنا تظهر في ملفك العام، وكل مقطع تضيفه يصبح دراسة حالة يستعرضها العملاء.";

export default function ProfileEditorPage() {
  const {
    profile,
    patch,
    saved,
    saveError,
    setSaveError,
    active,
    setActive,
    completeness,
    handleSave,
    saving,
    loading,
  } = useProfileEditor();

  // Scroll-spy: highlight the section currently in view in the section list.
  const ready = !loading && !!profile;
  useEffect(() => {
    if (!ready) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Band just below the fixed header, so a section counts once its top reaches it.
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((el) => observer.observe(el));

    // Deep links like /freelancer/profile#skills: the sections only exist once
    // the profile has loaded, so the browser's own hash scroll misses them.
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "start" });

    return () => observer.disconnect();
  }, [ready, setActive]);

  if (!ready)
    return (
      <DashboardLayout
        userRole="freelancer"
        pageTitle={PAGE_TITLE}
        pageDescription={PAGE_DESC}
      >
        <ProfileEditorSkeleton />
      </DashboardLayout>
    );

  const saveButton = (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={saving}
      className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ background: P.primary }}
    >
      <Save className="size-4" />
      {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
    </button>
  );

  const savedBadge = saved && (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 text-sm font-semibold"
      style={{ color: P.green }}
    >
      <Check className="size-4" />
      تم الحفظ
    </span>
  );

  return (
    <DashboardLayout
      userRole="freelancer"
      pageTitle={PAGE_TITLE}
      pageDescription={PAGE_DESC}
      user={{
        name: profile.name || undefined,
        email: profile.email || undefined,
        avatar: profile.avatar || undefined,
        verified: true,
      }}
      actions={
        <>
          <span className="hidden sm:inline-flex">{savedBadge}</span>
          <Link
            href={`/freelancers/${profile.id}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors hover:bg-black/5"
            style={{ border: `1px solid ${P.border}`, color: P.text }}
          >
            <Eye className="size-4" />
            معاينة
          </Link>
          {saveButton}
        </>
      }
    >
      <div dir="rtl" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ═══ FORM SECTIONS ═══ */}
        <div className="flex min-w-0 flex-col gap-4">
          <BasicsSection profile={profile} patch={patch} />
          <AboutSection profile={profile} patch={patch} />
          <SkillsSection profile={profile} patch={patch} />
          <LanguagesSection profile={profile} patch={patch} />

          {saveError && (
            <div
              role="alert"
              className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3"
            >
              <p className="flex-1 text-sm text-red-600">{saveError}</p>
              <button
                type="button"
                onClick={() => setSaveError("")}
                className="shrink-0 text-red-400 transition-opacity hover:opacity-70"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedBadge}
            {saveButton}
          </div>
        </div>

        {/* ═══ SIDE COLUMN — completeness + section list ═══ */}
        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start">
          <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: P.text }}>اكتمال الملف</p>
              <span className="font-tech text-sm font-bold tabular-nums" style={{ color: P.primaryText }}>
                {toArabicDigits(completeness)}٪
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="اكتمال الملف"
              aria-valuenow={completeness}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: P.subtle }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completeness}%`, background: P.primary }}
              />
            </div>
          </div>

          {/* Portfolio lives on its own page (أعمالي) */}
          <Link
            href="/freelancer/portfolio"
            className="flex items-center gap-3 bg-white p-4 transition-colors hover:bg-black/2"
            style={{ border: `1px solid ${P.border}` }}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg"
              style={{ background: `${P.primary}14`, color: P.primary }}
            >
              <Clapperboard className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold" style={{ color: P.text }}>أعمالي</span>
              <span className="block text-xs" style={{ color: P.muted }}>
                {toArabicDigits((profile.projects ?? []).length)} فيديو في الشو-ريل · إدارة الفيديوهات
              </span>
            </span>
            <ArrowLeft className="size-4 shrink-0" style={{ color: P.muted }} />
          </Link>

          <nav
            aria-label="أقسام الملف"
            className="hidden bg-white p-2 lg:block"
            style={{ border: `1px solid ${P.border}` }}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const on = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActive(s.id)}
                  aria-current={on ? "location" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    on
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={on ? 2.3 : 1.9} />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </aside>
      </div>
    </DashboardLayout>
  );
}
