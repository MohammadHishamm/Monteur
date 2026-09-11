import { formatBudget } from "@/components/jobs/job-row";
import { TIER_LABELS } from "@/components/jobs/types";
import type { Job } from "~/types/job";

/** Adapter so formatBudget (camelCase JobSummary) works with snake_case Job. */
export function formatJobBudget(job: Job): string {
  return formatBudget({
    budgetMin: job.budget_min,
    budgetMax: job.budget_max,
    budgetType: job.budget_type as "fixed" | "hourly",
  });
}

export function jobBudgetLabel(job: Job): string {
  return job.budget_type === "fixed" ? "ميزانية البريف" : "السعر بالساعة";
}

export function experienceLabel(exp: Job["experience"]): string {
  return exp === "any" ? "كل المستويات" : TIER_LABELS[exp as keyof typeof TIER_LABELS];
}
