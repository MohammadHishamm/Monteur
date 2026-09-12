"use client";

import { inputCls } from "@/components/dashboard/freelancer-profile/constants";
import { Panel } from "@/components/dashboard/freelancer-profile/controls";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

export function AboutSection({
  profile,
  patch,
}: {
  profile: EditableProfile;
  patch: (p: Partial<EditableProfile>) => void;
}) {
  return (
    <Panel
      id="about"
      title="النبذة الاحترافية"
      desc="عرّف العملاء بأسلوبك وخبرتك في المونتاج — هذا أول ما يقرؤونه."
    >
      <textarea
        rows={6}
        className={`${inputCls} resize-y leading-relaxed`}
        value={profile.about ?? ""}
        onChange={(e) => patch({ about: e.target.value })}
        placeholder="اكتب نبذة واضحة عن خبرتك، التخصصات التي تتقنها، والأدوات التي تستخدمها…"
      />
      <p className="mt-2 text-xs" style={{ color: P.muted }}>
        {toArabicDigits((profile.about ?? "").length)} حرف · يُنصح بـ ٤٠٠–٦٠٠ حرف.
      </p>
    </Panel>
  );
}
