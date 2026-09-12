"use client";

import { CATEGORIES, inputCls } from "@/components/dashboard/freelancer-profile/constants";
import { Field, Panel, Toggle } from "@/components/dashboard/freelancer-profile/controls";
import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import { AvatarUpload } from "@/components/onboarding/ui";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

export function BasicsSection({
  profile,
  patch,
}: {
  profile: EditableProfile;
  patch: (p: Partial<EditableProfile>) => void;
}) {
  return (
    <Panel
      id="basics"
      title="المعلومات الأساسية"
      desc="عنوانك المهني وموقعك وسعرك — تظهر أعلى ملفك العام."
    >
      <div className="mb-5 border-b pb-5" style={{ borderColor: P.border }}>
        <Field label="الصورة الشخصية">
          <AvatarUpload
            value={profile.avatar}
            onChange={(avatar) => patch({ avatar })}
            fallback={profile.name.trim()[0] ?? "؟"}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" className="sm:col-span-2">
          <input
            className={inputCls}
            value={profile.name ?? ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="أدخل اسمك الكامل"
          />
        </Field>

        <Field label="المسمى المهني" className="sm:col-span-2">
          <input
            className={inputCls}
            value={profile.role ?? ""}
            onChange={(e) => patch({ role: e.target.value })}
            placeholder="مثال: مونتيرة يوتيوب وريلز"
          />
        </Field>

        <Field
          label="نبذة مختصرة (سطر واحد)"
          className="sm:col-span-2"
          hint={`${toArabicDigits((profile.tagline ?? "").length)}/١٢٠ — تظهر تحت اسمك مباشرة.`}
        >
          <input
            className={inputCls}
            maxLength={120}
            value={profile.tagline ?? ""}
            onChange={(e) => patch({ tagline: e.target.value })}
            placeholder="جملة واحدة تلخّص أسلوبك وتخصصك"
          />
        </Field>

        <Field label="التخصص">
          <select
            className={inputCls}
            value={profile.category}
            onChange={(e) => patch({ category: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="السعر بالساعة (دولار)">
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 inset-s-3 flex items-center text-sm font-semibold"
              style={{ color: P.muted }}
            >
              $
            </span>
            <input
              type="number"
              min={1}
              className={`${inputCls} ps-7`}
              value={profile.rate ?? 0}
              onChange={(e) => patch({ rate: Number(e.target.value) })}
            />
          </div>
        </Field>

        <Field label="المدينة">
          <input
            className={inputCls}
            value={profile.city ?? ""}
            onChange={(e) => patch({ city: e.target.value })}
            placeholder="القاهرة"
          />
        </Field>

        <Field label="الدولة">
          <input
            className={inputCls}
            value={profile.country ?? ""}
            onChange={(e) => patch({ country: e.target.value })}
            placeholder="مصر"
          />
        </Field>
      </div>

      {/* availability toggle */}
      <div
        className="mt-5 flex items-center justify-between gap-4 border-t pt-5"
        style={{ borderColor: P.border }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: P.text }}>
            متاح لاستقبال وظائف جديدة
          </p>
          <p className="mt-0.5 text-xs" style={{ color: P.muted }}>
            عند التفعيل يظهر بجانب اسمك مؤشّر «متاح» أخضر.
          </p>
        </div>
        <Toggle
          on={profile.available}
          onChange={(v) => patch({ available: v })}
        />
      </div>
    </Panel>
  );
}
