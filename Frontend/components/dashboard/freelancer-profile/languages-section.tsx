"use client";

import { inputCls, LANG_LEVELS } from "@/components/dashboard/freelancer-profile/constants";
import { EmptyHint, Panel } from "@/components/dashboard/freelancer-profile/controls";
import type { LanguageSkill } from "@/components/freelancers/types";
import { P } from "@/lib/design-tokens";
import { Plus, Trash2 } from "lucide-react";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

export function LanguagesSection({
  profile,
  patch,
}: {
  profile: EditableProfile;
  patch: (p: Partial<EditableProfile>) => void;
}) {
  function update(i: number, next: Partial<LanguageSkill>) {
    const languages = (profile.languages ?? []).map((l: LanguageSkill, idx: number) =>
      idx === i ? { ...l, ...next } : l,
    );
    patch({ languages });
  }
  function remove(i: number) {
    patch({ languages: (profile.languages ?? []).filter((_: LanguageSkill, idx: number) => idx !== i) });
  }
  function add() {
    patch({
      languages: [...(profile.languages ?? []), { name: "", level: LANG_LEVELS[1] }],
    });
  }

  return (
    <Panel
      id="languages"
      title="اللغات"
      desc="اللغات التي تتقنها ومستواك في كل منها."
      action={
        <button
          type="button"
          onClick={add}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          <Plus className="size-4" />
          إضافة لغة
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {(profile.languages ?? []).length === 0 && (
          <EmptyHint text="لم تُضف أي لغة بعد." />
        )}
        {(profile.languages ?? []).map((l: LanguageSkill, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <input
              className={inputCls}
              value={l.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="اللغة (مثل العربية)"
            />
            <select
              className={`${inputCls} max-w-40`}
              value={l.level}
              onChange={(e) => update(i, { level: e.target.value })}
            >
              {LANG_LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="حذف اللغة"
              className="grid size-10 shrink-0 place-items-center transition-colors hover:bg-black/5"
              style={{ border: `1px solid ${P.border}`, color: P.muted }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
