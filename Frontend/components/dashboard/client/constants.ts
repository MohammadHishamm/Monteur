import { P } from "@/lib/design-tokens";
import type { JobStatus } from "@/types/client-dashboard";

export const STATUS_META: Record<JobStatus, { label: string; color: string }> = {
  open: { label: "مفتوح", color: P.green },
  reviewing: { label: "قيد المراجعة", color: P.primaryText },
  in_progress: { label: "قيد التنفيذ", color: P.primary },
  completed: { label: "مكتمل", color: P.muted },
  closed: { label: "مغلق", color: P.muted },
};
