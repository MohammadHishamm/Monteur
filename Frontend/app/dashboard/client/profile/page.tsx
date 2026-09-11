"use client";

import { P } from "@/lib/design-tokens";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Globe, Mail, Phone, Save, User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSaveMyProfile } from "~/api/user/mutations";
import { getAuthUserOptions } from "~/api/user/queries";

type Status = { ok: boolean; msg: string } | null;

export default function ClientProfilePage() {
  const { data: profileData, isPending, isError } = useQuery(getAuthUserOptions());
  const profile = profileData?.data;
  const saveMutation = useSaveMyProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setCompanyName(profile.company_name ?? "");
    setCompanyWebsite(profile.company_website ?? "");
    setIndustry(profile.industry ?? "");
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await saveMutation.mutateAsync({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        company_name: companyName.trim() || null,
        company_website: companyWebsite.trim() || null,
        industry: industry.trim() || null,
      });
      setStatus({ ok: true, msg: "تم حفظ الملف الشخصي بنجاح" });
    } catch (err: unknown) {
      setStatus({
        ok: false,
        msg: err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "حدث خطأ أثناء الحفظ",
      });
    }
  }

  if (isPending) {
    return (
      <div dir="rtl" className="mx-auto max-w-2xl animate-pulse space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg" style={{ background: P.subtle }} />
        ))}
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div dir="rtl" className="mx-auto max-w-2xl p-6">
        <p className="text-sm" style={{ color: P.muted }}>تعذّر تحميل الملف الشخصي. حاول تحديث الصفحة.</p>
      </div>
    );
  }

  const fullName = profile.full_name ?? profile.email ?? "";
  const initials =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .map((s) => s![0])
      .join("")
      .toUpperCase() ||
    fullName.trim()[0]?.toUpperCase() ||
    "؟";

  return (
    <div dir="rtl" className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest" style={{ color: P.muted }}>
          الملف الشخصي
        </p>
        <h1 className="mt-1 text-2xl font-bold" style={{ color: P.text }}>
          معلوماتي
        </h1>
      </div>

      {/* Avatar strip */}
      <div
        className="mb-6 flex items-center gap-4 bg-white p-5"
        style={{ border: `1px solid ${P.border}` }}
      >
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ background: P.primary }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold" style={{ color: P.text }}>{fullName}</p>
          <p className="text-sm" style={{ color: P.muted }}>{profile.email}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {profile.is_email_verified ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: P.green }}>
                <BadgeCheck className="size-3.5" /> موثّق
              </span>
            ) : (
              <span className="text-xs" style={{ color: P.muted }}>غير موثّق</span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Personal info */}
        <section className="bg-white p-6" style={{ border: `1px solid ${P.border}` }}>
          <div className="mb-4 flex items-center gap-2">
            <User className="size-4" style={{ color: P.primary }} />
            <h2 className="text-sm font-bold" style={{ color: P.text }}>المعلومات الشخصية</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم الأول">
              <input
                type="text" value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="أدخل الاسم الأول"
                style={inputStyle}
              />
            </Field>
            <Field label="اسم العائلة">
              <input
                type="text" value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="أدخل اسم العائلة"
                style={inputStyle}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="نبذة تعريفية">
              <textarea
                rows={3} value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب نبذة مختصرة عنك…"
                className="w-full resize-none p-3 text-sm outline-none"
                style={{ border: `1px solid ${P.border}`, color: P.text, background: "white" }}
              />
            </Field>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white p-6" style={{ border: `1px solid ${P.border}` }}>
          <div className="mb-4 flex items-center gap-2">
            <Phone className="size-4" style={{ color: P.primary }} />
            <h2 className="text-sm font-bold" style={{ color: P.text }}>بيانات التواصل</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="البريد الإلكتروني">
              <input
                type="email" value={profile.email} disabled
                style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
              />
            </Field>
            <Field label="رقم الهاتف">
              <input
                type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5X XXX XXXX"
                style={inputStyle}
              />
            </Field>
          </div>
        </section>

        {/* Company */}
        <section className="bg-white p-6" style={{ border: `1px solid ${P.border}` }}>
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="size-4" style={{ color: P.primary }} />
            <h2 className="text-sm font-bold" style={{ color: P.text }}>معلومات الشركة</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم الشركة">
              <input
                type="text" value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="اسم الشركة أو المؤسسة"
                style={inputStyle}
              />
            </Field>
            <Field label="المجال / القطاع">
              <input
                type="text" value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="مثل: تقنية، تسويق، تعليم…"
                style={inputStyle}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="الموقع الإلكتروني">
              <div className="flex items-center" style={{ border: `1px solid ${P.border}`, background: "white" }}>
                <span className="flex h-10 items-center border-l px-3" style={{ borderColor: P.border, color: P.muted }}>
                  <Globe className="size-4" />
                </span>
                <input
                  type="url" value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="h-10 flex-1 bg-transparent px-3 text-sm outline-none"
                  style={{ color: P.text }}
                />
              </div>
            </Field>
          </div>
        </section>

        {/* Status banner */}
        {status && (
          <div
            className="flex items-center gap-2 px-4 py-3 text-sm"
            style={{
              background: status.ok ? "#ECFDF5" : "#FEF2F2",
              border: `1px solid ${status.ok ? "#10B981" : "#F87171"}`,
              color: status.ok ? "#065F46" : "#991B1B",
            }}
          >
            <Mail className="size-4 shrink-0" />
            {status.msg}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end pb-8">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex h-10 items-center gap-2 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: P.primary }}
          >
            <Save className="size-4" />
            {saveMutation.isPending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── helpers ── */
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "2.5rem",
  padding: "0 0.75rem",
  fontSize: "0.875rem",
  border: `1px solid ${P.border}`,
  background: "white",
  color: P.text,
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" style={{ color: P.text }}>{label}</span>
      {children}
    </label>
  );
}

