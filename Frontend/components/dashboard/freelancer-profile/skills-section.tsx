"use client";

import { ChipInput, Panel } from "@/components/dashboard/freelancer-profile/controls";
import { P } from "@/lib/design-tokens";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

export function SkillsSection({
  profile,
  patch,
}: {
  profile: EditableProfile;
  patch: (p: Partial<EditableProfile>) => void;
}) {
  return (
    <Panel
      id="skills"
      title="الأدوات"
      desc="أضف برامج وأدوات المونتاج التي تتقنها — تُستخدم في مطابقتك مع البريفات."
    >
      <ChipInput
        items={profile.skills}
        onChange={(skills) => patch({ skills })}
        placeholder="اكتب أداة ثم Enter (مثال: Premiere Pro)"
        accent={P.primary}
      />
    </Panel>
  );
}
