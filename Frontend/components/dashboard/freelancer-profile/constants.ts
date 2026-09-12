import { CATEGORY_LABELS, type Category } from "@/components/freelancers/types";
import { Briefcase, Languages as LanguagesIcon, User, Wrench } from "lucide-react";
import type { EditableProfile } from "~/components/dashboard/profile-editor-types";

/* ── shared field styling (sharp surfaces) ── */
export const inputCls =
  "w-full border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#10B981]";

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
export const LANG_LEVELS = ["لغة أم", "محترف", "متقدّم", "متوسّط", "مبتدئ"];

export const SECTIONS = [
  { id: "basics", label: "المعلومات الأساسية", icon: User },
  { id: "about", label: "النبذة الاحترافية", icon: Briefcase },
  { id: "skills", label: "الأدوات", icon: Wrench },
  { id: "languages", label: "اللغات", icon: LanguagesIcon },
];

export function computeCompleteness(p: EditableProfile | null): number {
  if (!p) return 0;
  const skills    = p.skills    ?? [];
  const languages = p.languages ?? [];
  const projects  = p.projects  ?? [];
  const checks = [
    (p.role    ?? "").trim().length > 0,
    (p.tagline ?? "").trim().length > 0,
    (p.about   ?? "").trim().length >= 120,
    (p.city    ?? "").trim().length > 0,
    skills.length    >= 3,
    languages.length >= 1,
    projects.length  >= 1,
    projects.length  >= 3,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
