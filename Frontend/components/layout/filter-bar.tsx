"use client";

import React from "react";
import { Search, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  id: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchPlaceholder?: string;
  search: string;
  onSearch: (v: string) => void;
  filters?: FilterDef[];
  values?: Record<string, string>;
  onFilterChange?: (id: string, value: string) => void;
  resultCount?: number;
  className?: string;
}

/** Reusable search + dropdown filter row for every listing/table page. */
export function FilterBar({
  searchPlaceholder = "Search…",
  search,
  onSearch,
  filters = [],
  values = {},
  onFilterChange,
  resultCount,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 bg-card pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
            <SlidersHorizontal className="size-3.5" />
          </span>
          {filters.map((f) => (
            <div key={f.id} className="relative">
              <select
                value={values[f.id] ?? ""}
                onChange={(e) => onFilterChange?.(f.id, e.target.value)}
                className={cn(
                  "h-10 cursor-pointer appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                )}
              >
                <option value="">{f.label}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      {typeof resultCount === "number" && (
        <p className="text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{resultCount}</span> results
        </p>
      )}
    </div>
  );
}
