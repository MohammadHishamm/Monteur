import { P } from "@/lib/design-tokens";
import type { BestMatch, JobStatus } from "@/types/client-dashboard";

export const STATUS_META: Record<JobStatus, { label: string; color: string }> = {
  open: { label: "مفتوح", color: P.green },
  reviewing: { label: "قيد المراجعة", color: P.primaryText },
  in_progress: { label: "قيد التنفيذ", color: P.primary },
  completed: { label: "مكتمل", color: P.muted },
  closed: { label: "مغلق", color: P.muted },
};

export function groupMatches(
  matches: BestMatch[],
): { jobId: string; jobTitle: string; matches: BestMatch[] }[] {
  const map = new Map<
    string,
    { jobId: string; jobTitle: string; matches: BestMatch[] }
  >();
  for (const m of matches) {
    const g = map.get(m.job_id) ?? {
      jobId: m.job_id,
      jobTitle: m.job_title,
      matches: [] as BestMatch[],
    };
    g.matches.push(m);
    map.set(m.job_id, g);
  }
  return Array.from(map.values());
}
