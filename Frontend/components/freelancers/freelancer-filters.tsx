"use client";

import {
  FacetChip,
  FacetGroup,
  FacetPanelHeader,
  FacetRow,
  FacetToggle,
} from "@/components/ui/facet";
import { P } from "@/lib/design-tokens";
import { CATEGORY_LABELS, TIER_LABELS, type Category, type Tier } from "./types";

/**
 * The facet state for the browse-editors page. Mirrors exactly the filters the
 * list endpoint supports — nothing here is filtered client-side.
 */
export interface FreelancerFilterState {
  category: Category | "";
  tier: Tier | "";
  city: string;
  availableOnly: boolean;
}

export const EMPTY_FILTERS: FreelancerFilterState = {
  category: "",
  tier: "",
  city: "",
  availableOnly: false,
};

/** Number of facets currently narrowing the list. */
export function countActiveFilters(f: FreelancerFilterState): number {
  return [f.category, f.tier, f.city, f.availableOnly].filter(Boolean).length;
}

/**
 * Faceted filter panel for browsing editors.
 *
 * Availability leads: a client picking someone almost always wants to know who
 * can start now, so it sits above the taxonomy rather than buried in it.
 */
export function FreelancerFilters({
  value,
  onChange,
  onReset,
  cities,
}: {
  value: FreelancerFilterState;
  onChange: (next: FreelancerFilterState) => void;
  onReset: () => void;
  cities: string[];
}) {
  const set = <K extends keyof FreelancerFilterState>(
    key: K,
    next: FreelancerFilterState[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <div>
      <FacetPanelHeader
        title="تصفية النتائج"
        showReset={countActiveFilters(value) > 0}
        onReset={onReset}
      />

      <FacetGroup title="التوفر" first>
        <FacetToggle
          label="متاح للعمل الآن"
          hint="يستقبل مشاريع جديدة"
          on={value.availableOnly}
          onToggle={() => set("availableOnly", !value.availableOnly)}
          accent={P.green}
        />
      </FacetGroup>

      {/* NOTE: this facet is currently a no-op. `users` has no category column,
          so the list endpoint accepts `category` and ignores it (see
          store.ListFreelancersFiltered). Kept visible on purpose until the
          backend persists the specialty the profile editor already collects. */}
      <FacetGroup title="التخصّص">
        <div className="flex flex-col gap-0.5">
          <FacetRow
            label="كل التخصّصات"
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

      <FacetGroup title="المستوى">
        <div className="flex flex-wrap gap-1.5">
          <FacetChip label="الكل" selected={!value.tier} onSelect={() => set("tier", "")} />
          {(Object.entries(TIER_LABELS) as [Tier, string][]).map(([key, label]) => (
            <FacetChip
              key={key}
              label={label}
              selected={value.tier === key}
              onSelect={() => set("tier", value.tier === key ? "" : key)}
            />
          ))}
        </div>
      </FacetGroup>

      {cities.length > 0 && (
        <FacetGroup title="المدينة">
          {/* The city list grows with the marketplace, so it scrolls in place
              instead of pushing the rest of the rail off the rail. */}
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            <FacetRow label="كل المدن" selected={!value.city} onSelect={() => set("city", "")} />
            {cities.map((c) => (
              <FacetRow
                key={c}
                label={c}
                selected={value.city === c}
                onSelect={() => set("city", value.city === c ? "" : c)}
              />
            ))}
          </div>
        </FacetGroup>
      )}
    </div>
  );
}
