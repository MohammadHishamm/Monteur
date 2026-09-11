import { experienceLabel, formatJobBudget, jobBudgetLabel } from "@/components/jobs/job-budget";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { Clock, FileText, Users, Wallet } from "lucide-react";
import type { Job } from "~/types/job";

export function JobFactsGrid({ job: j }: { job: Job }) {
  const facts = [
    { label: jobBudgetLabel(j), value: formatJobBudget(j), icon: <Wallet className="size-4" />, color: P.green },
    { label: "المدة المتوقعة", value: j.duration, icon: <Clock className="size-4" />, color: P.primary },
    { label: "المستوى", value: experienceLabel(j.experience as Job["experience"]), icon: <Users className="size-4" />, color: P.primary },
    { label: "العروض المقدّمة", value: toArabicDigits(j.proposals), icon: <FileText className="size-4" />, color: P.primaryText },
  ];

  return (
    <div className="border-b" style={{ background: BG.main, borderColor: P.border }}>
      <div
        className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4"
        style={{ background: P.border }}
      >
        {facts.map((s) => (
          <div key={s.label} className="px-5 py-6 lg:px-7" style={{ background: BG.main }}>
            <div className="flex items-center gap-2" style={{ color: s.color }}>
              {s.icon}
              <span className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
                {s.label}
              </span>
            </div>
            <p className="mt-3 text-xl font-bold tracking-tight tabular-nums lg:text-2xl" style={{ color: P.text }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
