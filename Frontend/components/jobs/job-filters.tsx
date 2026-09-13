"use client";

import { FacetChip, FacetGroup, FacetPanelHeader, FacetRow } from "@/components/ui/facet";
import {
  CATEGORY_LABELS,
  TIER_LABELS,
  type BudgetType,
  type Category,
  type Tier,
} from "./types";

/**
 * The facet state for the browse-jobs page. Mirrors exactly the filters the
 * list endpoint supports — nothing here is filtered client-side.
 */
export interface JobFilterState {
  category: Category | "";
  experience: Tier | "";
  budgetType: BudgetType | "";
}

export const EMPTY_FILTERS: JobFilterState = {
  category: "",
  experience: "",
  budgetType: "",
};

export const BUDGET_TYPE_LABELS: Record<BudgetType, string> = {
  fixed: "سعر ثابت",
  hourly: "بالساعة",
};

/** Number of facets currently narrowing the list. */
export function countActiveFilters(f: JobFilterState): number {
  return [f.category, f.experience, f.budgetType].filter(Boolean).length;
}

/**
 * Faceted filter panel — every option is visible, no hidden dropdowns.
 * Rendered both in the desktop rail and inside the mobile filter sheet.
 */
export function JobFilters({
  value,
  onChange,
  onReset,
}: {
  value: JobFilterState;
  onChange: (next: JobFilterState) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof JobFilterState>(key: K, next: JobFilterState[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div>
      <FacetPanelHeader
        title="تصفية النتائج"
        showReset={countActiveFilters(value) > 0}
        onReset={onReset}
      />

      <FacetGroup title="نوع المونتاج" first>
        <div className="flex flex-col gap-0.5">
          <FacetRow
            label="كل الأنواع"
            selected={!value.category}
            onSelect={() => set("category", "")}
          />
          {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([key, label]) => (
            <FacetRow
              key={key}
              label={label}
              selected={value.category === key}
              onSelect={() => set("category", value.category === key ? "" : key)}
            />
          ))}
        </div>
      </FacetGroup>

      <FacetGroup title="المستوى المطلوب">
        <div className="flex flex-wrap gap-1.5">
          <FacetChip
            label="الكل"
            selected={!value.experience}
            onSelect={() => set("experience", "")}
          />
          {(Object.entries(TIER_LABELS) as [Tier, string][]).map(([key, label]) => (
            <FacetChip
              key={key}
              label={label}
              selected={value.experience === key}
              onSelect={() => set("experience", value.experience === key ? "" : key)}
            />
          ))}
        </div>
      </FacetGroup>

      <FacetGroup title="نوع الميزانية">
        <div className="flex flex-wrap gap-1.5">
          <FacetChip
            label="الكل"
            selected={!value.budgetType}
            onSelect={() => set("budgetType", "")}
          />
          {(Object.entries(BUDGET_TYPE_LABELS) as [BudgetType, string][]).map(([key, label]) => (
            <FacetChip
              key={key}
              label={label}
              selected={value.budgetType === key}
              onSelect={() => set("budgetType", value.budgetType === key ? "" : key)}
            />
          ))}
        </div>
      </FacetGroup>
    </div>
  );
}
