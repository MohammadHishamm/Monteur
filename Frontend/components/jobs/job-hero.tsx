import { CATEGORY_LABELS } from "@/components/jobs/types";
import { SectionLabel } from "@/components/marketing/section-heading";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { BadgeCheck, Clock, FileText, MapPin, Ratio, Zap } from "lucide-react";
import type { Job } from "~/types/job";

export function JobHero({ job: j }: { job: Job }) {
  return (
    <section className="border-b" style={{ background: BG.main, borderColor: P.border }}>
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-12 lg:px-8 lg:pt-14 lg:pb-14">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>{CATEGORY_LABELS[j.category as keyof typeof CATEGORY_LABELS]}</SectionLabel>
          {j.urgent && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ background: `${P.primary}14`, color: P.primaryText, border: `1px solid ${P.primary}33` }}
            >
              <Zap className="size-3.5" />
              بريف عاجل
            </span>
          )}
        </div>

        <h1
          className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.7rem]"
          style={{ color: P.text }}
        >
          {j.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed" style={{ color: P.muted }}>
          {j.summary}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: P.muted }}>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            نُشر {new Date(j.posted_at).toLocaleDateString("ar-SA")}
          </span>
          {j.aspect && (
            <span className="inline-flex items-center gap-1.5">
              <Ratio className="size-4" />
              <span className="font-tech tabular-nums">{j.aspect}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-4" />
            {toArabicDigits(j.proposals)} عرض مُقدّم
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" />
            {j.client_name}، {j.client_country}
            {j.client_verified && <BadgeCheck className="size-4" style={{ color: P.green }} />}
          </span>
        </div>
      </div>
    </section>
  );
}
