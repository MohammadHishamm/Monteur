import type { Category } from "@/components/freelancers/types";
import { CheckCircle2, FileText, Sparkles, Wallet } from "lucide-react";

export const STEPS = [
  { key: "basics", label: "الأساسيات", icon: FileText },
  { key: "scope", label: "الوصف والأدوات", icon: Sparkles },
  { key: "budget", label: "الميزانية والمدة", icon: Wallet },
  { key: "review", label: "المراجعة والنشر", icon: CheckCircle2 },
] as const;

export type BudgetType = "fixed" | "hourly";

export const DURATIONS = [
  "أقل من أسبوع",
  "١ - ٤ أسابيع",
  "١ - ٣ أشهر",
  "أكثر من ٣ أشهر",
];

/** Suggested tools per editing niche — seeds the chip input. */
export const SUGGESTED_SKILLS: Record<Category, string[]> = {
  reels: ["Premiere Pro", "After Effects", "CapCut", "موشن", "تلوين", "ترانزيشن"],
  youtube: ["Premiere Pro", "DaVinci Resolve", "After Effects", "Audition", "ثَمبنيل"],
  motion: ["After Effects", "Cinema 4D", "Illustrator", "موشن جرافيك", "أنيميشن"],
  ads: ["Premiere Pro", "After Effects", "DaVinci Resolve", "موشن", "تلوين"],
  weddings: ["Premiere Pro", "DaVinci Resolve", "تلوين سينمائي", "معالجة صوت"],
  podcast: ["Premiere Pro", "Audition", "DaVinci Resolve", "معالجة صوت"],
  vfx: ["After Effects", "Nuke", "Cinema 4D", "Houdini", "تتبّع", "كومبوزيت"],
  color: ["DaVinci Resolve", "Premiere Pro", "تلوين سينمائي", "LUTs"],
};

/** Smart-matching hint: budget band → recommended tiers (per design spec). */
export function tierHintForBudget(amount: number, type: BudgetType): string | null {
  if (!amount) return null;
  const monthly = type === "hourly" ? amount * 160 : amount;
  if (monthly < 1000) return "وظيفة بميزانية اقتصادية — سنرشّح لك مونتيرين من فئتي البرونزي والفضي.";
  if (monthly < 5000) return "ميزانية متوسطة — سنرشّح لك مونتيرين من فئتي الفضي والذهبي.";
  return "وظيفة مميّزة — سنرشّح لك نخبة المونتيرين من فئتي الذهبي والبلاتيني.";
}
