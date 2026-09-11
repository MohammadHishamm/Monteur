"use client";

import { AboutSection } from "@/components/dashboard/freelancer-profile/about-section";
import { BasicsSection } from "@/components/dashboard/freelancer-profile/basics-section";
import { SECTIONS } from "@/components/dashboard/freelancer-profile/constants";
import { LanguagesSection } from "@/components/dashboard/freelancer-profile/languages-section";
import { PortfolioSection } from "@/components/dashboard/freelancer-profile/portfolio-section";
import { ProfileEditorSkeleton } from "@/components/dashboard/freelancer-profile/profile-skeleton";
import { SkillsSection } from "@/components/dashboard/freelancer-profile/skills-section";
import { useProfileEditor } from "@/components/dashboard/freelancer-profile/use-profile-editor";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { Check, Eye, Save, X } from "lucide-react";
import Link from "next/link";

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

  if (loading || !profile)
    return (
      <div dir="rtl">
        <ProfileEditorSkeleton />
      </div>
    );

  return (
    <div dir="rtl">
      {/* header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
        <p
          className="font-tech text-xs font-semibold uppercase tracking-widest"
          style={{ color: P.primaryText }}
        >
          الملف الشخصي
        </p>
        <h1
          className="tracking-tight mt-2 text-3xl font-bold sm:text-4xl"
          style={{ color: P.text }}
        >
          حرّر <span style={{ color: P.primaryText }}>شو-ريلك وأدواتك</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm" style={{ color: P.muted }}>
          المعلومات التي تضيفها هنا تظهر في ملفك العام، وكل مقطع تضيفه يصبح
          دراسة حالة كاملة يستعرضها العملاء.
        </p>
        </div>

        <div className="flex items-center gap-2.5">
          {saved && (
            <span
              className="hidden items-center gap-1.5 text-sm font-semibold sm:inline-flex"
              style={{ color: P.green }}
            >
              <Check className="size-4" />
              محفوظ
            </span>
          )}
          <Link
            href={`/freelancers/${profile.id}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-black/5"
            style={{ border: `1px solid ${P.border}`, color: P.text }}
          >
            <Eye className="size-4" />
            <span className="hidden sm:inline">معاينة</span>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: P.primary }}
          >
            <Save className="size-4" />
            {saving ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* ── section nav ── */}
        <aside className="hidden lg:block">
          <nav
            className="sticky top-24 flex flex-col"
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
                  className="flex items-center gap-2.5 border-b px-4 py-3 text-sm font-medium transition-colors last:border-b-0"
                  style={{
                    borderColor: P.border,
                    background: on ? `${P.primary}10` : BG.main,
                    color: on ? P.primaryText : P.muted,
                    boxShadow: on ? `inset 3px 0 0 ${P.primary}` : "none",
                  }}
                >
                  <Icon className="size-4" />
                  {s.label}
                </a>
              );
            })}
          </nav>

          {/* completeness */}
          <div
            className="mt-4 p-4"
            style={{ border: `1px solid ${P.border}`, background: BG.main }}
          >
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: P.muted }}>اكتمال الملف</span>
              <span
                className="font-tech font-bold tnum"
                style={{ color: P.text }}
              >
                {toArabicDigits(completeness)}٪
              </span>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden"
              style={{ background: P.subtle }}
            >
              <div
                className="h-full transition-all"
                style={{ width: `${completeness}%`, background: P.primary }}
              />
            </div>
          </div>
        </aside>

        {/* ── form sections ── */}
        <div className="flex flex-col gap-6">
          <BasicsSection profile={profile} patch={patch} />
          <AboutSection profile={profile} patch={patch} />
          <SkillsSection profile={profile} patch={patch} />
          <LanguagesSection profile={profile} patch={patch} />
          <PortfolioSection profile={profile} patch={patch} />

          {/* bottom save (mobile-friendly) */}
          {saveError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
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
          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span
                className="inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: P.green }}
              >
                <Check className="size-4" />
                تم حفظ التغييرات
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: P.primary }}
            >
              <Save className="size-4" />
              {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
