"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { P } from "@/lib/design-tokens";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Check, Globe, Save, User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSaveClientProfile } from "~/api/user/mutations";
import { getAuthUserOptions } from "~/api/user/queries";

const PAGE_TITLE = "الملف الشخصي";
const PAGE_DESC = "بيانات حسابك وشركتك — تظهر للمونتيرين عند التعاقد معك.";

const inputCls =
  "w-full border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#10B981]";

export default function ClientProfilePage() {
  const { data: profileData, isPending, isError } = useQuery(getAuthUserOptions());
  const profile = profileData?.data;
  const saveMutation = useSaveClientProfile();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seed the form from the loaded profile (render-phase update, not an effect).
  if (profile && seededFor !== (profile.id ?? "")) {
    setSeededFor(profile.id ?? "");
    setFullName(profile.full_name ?? "");
    setCompanyName(profile.company_name ?? "");
    setCompanyWebsite(profile.company_website ?? "");
    setIndustry(profile.industry ?? "");
  }

  // Fade the "saved" badge after 2.6 s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  if (isPending)
    return (
      <DashboardLayout
        userRole="client"
        pageTitle={PAGE_TITLE}
        pageDescription={PAGE_DESC}
        user={{ name: "مستخدم", email: "", verified: false }}
      >
        <div dir="rtl" className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="h-52" style={{ background: P.subtle }} />
            <div className="h-64" style={{ background: P.subtle }} />
          </div>
          <div className="order-first h-40 lg:order-none" style={{ background: P.subtle }} />
        </div>
      </DashboardLayout>
    );

  if (isError || !profile)
    return (
      <DashboardLayout
        userRole="client"
        pageTitle={PAGE_TITLE}
        pageDescription={PAGE_DESC}
        user={{ name: "مستخدم", email: "", verified: false }}
      >
        <p dir="rtl" className="bg-white p-5 text-sm" style={{ border: `1px solid ${P.border}`, color: P.muted }}>
          تعذّر تحميل الملف الشخصي. حاول تحديث الصفحة.
        </p>
      </DashboardLayout>
    );

  const email = profile.email ?? "";
  const displayName = fullName.trim() || profile.full_name || email;
  const initials = displayName.trim()[0]?.toUpperCase() ?? "؟";

  async function handleSave() {
    setError("");
    if (!fullName.trim()) {
      setError("الاسم الكامل مطلوب");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        full_name: fullName.trim(),
        email,
        company_name: companyName.trim(),
        company_website: companyWebsite.trim(),
        industry: industry.trim(),
      });
      setSaved(true);
    } catch {
      setError("تعذّر حفظ الملف الشخصي. حاول مجدداً.");
    }
  }

  const savedBadge = saved && (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: P.green }}>
      <Check className="size-4" />
      تم الحفظ
    </span>
  );

  const saveButton = (
    <button
      type="submit"
      form="client-profile-form"
      disabled={saveMutation.isPending}
      className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ background: P.primary }}
    >
      <Save className="size-4" />
      {saveMutation.isPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
    </button>
  );

  return (
    <DashboardLayout
      userRole="client"
      pageTitle={PAGE_TITLE}
      pageDescription={PAGE_DESC}
      user={{ name: displayName, email, verified: Boolean(profile.is_email_verified) }}
      actions={
        <>
          <span className="hidden sm:inline-flex">{savedBadge}</span>
          {saveButton}
        </>
      }
    >
      <div dir="rtl" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ═══ FORM ═══ */}
        <form
          id="client-profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          {/* BASICS */}
          <Panel
            icon={<User className="size-4" />}
            title="المعلومات الأساسية"
            desc="الاسم الذي يظهر للمونتيرين في العروض والمحادثات."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم الكامل" className="sm:col-span-2">
                <input
                  className={inputCls}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                />
              </Field>
              <Field
                label="البريد الإلكتروني"
                className="sm:col-span-2"
                hint="لتغيير البريد الإلكتروني تواصل مع الدعم."
              >
                <input
                  className={inputCls}
                  value={email}
                  disabled
                  dir="ltr"
                  style={{ background: P.subtle, color: P.muted }}
                />
              </Field>
            </div>
          </Panel>

          {/* COMPANY */}
          <Panel
            icon={<Briefcase className="size-4" />}
            title="معلومات الشركة"
            desc="تساعد المونتيرين على فهم طبيعة عملك."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الشركة">
                <input
                  className={inputCls}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="اسم الشركة أو المؤسسة"
                />
              </Field>
              <Field label="المجال / القطاع">
                <input
                  className={inputCls}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="مثل: تقنية، تسويق، تعليم…"
                />
              </Field>
              <Field label="الموقع الإلكتروني" className="sm:col-span-2">
                <div className="relative">
                  <Globe
                    className="pointer-events-none absolute inset-y-0 inset-s-3 my-auto size-4"
                    style={{ color: P.muted }}
                  />
                  <input
                    className={`${inputCls} ps-9`}
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                </div>
              </Field>
            </div>
          </Panel>

          {error && (
            <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedBadge}
            {saveButton}
          </div>
        </form>

        {/* ═══ SIDE COLUMN ═══ */}
        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start">
          <div className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-3">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: P.primary }}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: P.text }}>{displayName}</p>
                <p className="truncate text-xs" style={{ color: P.muted }} dir="ltr">{email}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
              <div className="flex items-center justify-between">
                <dt style={{ color: P.muted }}>نوع الحساب</dt>
                <dd className="font-semibold" style={{ color: P.text }}>صاحب عمل</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt style={{ color: P.muted }}>حالة التوثيق</dt>
                <dd>
                  {profile.is_email_verified ? (
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: P.green }}>
                      <BadgeCheck className="size-3.5" />
                      موثّق
                    </span>
                  ) : (
                    <span style={{ color: P.muted }}>غير موثّق</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}

/* ════════════ PANEL ════════════ */
function Panel({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white p-5" style={{ border: `1px solid ${P.border}` }}>
      <div className="mb-4 flex items-start gap-2 border-b pb-3" style={{ borderColor: P.border }}>
        <span className="mt-0.5" style={{ color: P.primary }}>{icon}</span>
        <div>
          <h2 className="font-bold" style={{ color: P.text }}>{title}</h2>
          {desc && <p className="mt-0.5 text-xs" style={{ color: P.muted }}>{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ════════════ FIELD ════════════ */
function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold" style={{ color: P.text }}>{label}</span>
      {children}
      {hint && <span className="text-xs" style={{ color: P.muted }}>{hint}</span>}
    </label>
  );
}
