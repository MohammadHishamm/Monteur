"use client";

import { FreelancerCard } from "@/components/freelancers/freelancer-card";
import {
  EMPTY_FILTERS,
  FreelancerFilters,
  countActiveFilters,
  type FreelancerFilterState,
} from "@/components/freelancers/freelancer-filters";
import {
  CATEGORY_LABELS,
  TIER_LABELS,
  type Freelancer,
  type FreelancerSort,
} from "@/components/freelancers/types";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { axios } from "@/lib/api/axios";
import { BG, cardShadow, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { ArrowLeft, ChevronDown, Search, SlidersHorizontal, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ResWithData, ResWithDataMeta, TListMeta } from "~/types/response";

const PAGE_SIZE = 9;

const SORTS: { value: FreelancerSort; label: string }[] = [
  { value: "match", label: "الأعلى تطابقاً" },
  { value: "rating", label: "الأعلى تقييماً" },
  { value: "rate", label: "الأقل سعراً" },
  { value: "completed", label: "الأكثر خبرة" },
];

/** One removable filter shown above the results. */
interface ActiveChip {
  key: string;
  label: string;
  clear: () => void;
}

/** Placeholder card shown while results load — mirrors the FreelancerCard shape. */
function CardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 p-3"
      style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: cardShadow }}
    >
      <div className="aspect-video w-full animate-pulse rounded-xl" style={{ background: P.subtle }} />
      <div className="flex items-start gap-3 px-2">
        <div className="size-10 shrink-0 animate-pulse rounded-full" style={{ background: P.subtle }} />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded" style={{ background: P.subtle }} />
          <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: P.subtle }} />
        </div>
      </div>
      <div className="flex gap-1.5 px-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 w-16 animate-pulse rounded-lg" style={{ background: P.subtle }} />
        ))}
      </div>
      <div className="mx-2 mt-1 h-8 animate-pulse rounded" style={{ background: P.subtle }} />
    </div>
  );
}

export default function BrowseFreelancersPage() {
  // filter inputs
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<FreelancerFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<FreelancerSort>("match");
  const [sheetOpen, setSheetOpen] = useState(false);

  // data
  const [items, setItems] = useState<Freelancer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cities, setCities] = useState<string[]>([]);

  // debounce the search box (so the API isn't hit on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // real city options, so the facet matches who is actually on the marketplace
  useEffect(() => {
    let ignore = false;
    axios
      .get<ResWithData<string[]>>("/freelancers/cities")
      .then((res) => {
        if (!ignore) setCities(res.data.data ?? []);
      })
      .catch(() => {
        if (!ignore) setCities([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // the active query (memoized so the fetch effect only reruns on real changes)
  const query = useMemo(
    () => ({ search: debouncedSearch, ...filters, sort }),
    [debouncedSearch, filters, sort],
  );

  // Bumped every time the filters change. A load-more request that started
  // under an older generation must not append its rows to a list that has
  // since been replaced, nor advance the page counter that goes with it.
  const generation = useRef(0);

  // reset + load first page whenever filters change
  useEffect(() => {
    const id = ++generation.current;
    setLoading(true);
    axios
      .get<ResWithDataMeta<Freelancer[], TListMeta>>("/freelancers", {
        params: { ...query, page: 1, pageSize: PAGE_SIZE },
      })
      .then((res) => {
        if (id !== generation.current) return;
        // A zero-result page serializes as `data: null`, not `[]`.
        setItems(Array.isArray(res.data.data) ? res.data.data : []);
        setTotal(res.data.meta?.total ?? 0);
        setPage(1);
        setLoading(false);
      })
      .catch(() => {
        if (id === generation.current) setLoading(false);
      });
  }, [query]);

  const loadMore = async () => {
    const id = generation.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await axios.get<ResWithDataMeta<Freelancer[], TListMeta>>("/freelancers", {
        params: { ...query, page: next, pageSize: PAGE_SIZE },
      });
      if (id !== generation.current) return;
      setItems((prev) => [...prev, ...(Array.isArray(res.data.data) ? res.data.data : [])]);
      setTotal(res.data.meta?.total ?? 0);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const activeFilterCount = countActiveFilters(filters);
  const hasMore = items.length < total;

  const resetAll = () => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
  };

  // removable chips shown above the results
  const chips: ActiveChip[] = [];
  if (search) {
    chips.push({ key: "search", label: `بحث: ${search}`, clear: () => setSearch("") });
  }
  if (filters.availableOnly) {
    chips.push({
      key: "available",
      label: "متاح للعمل الآن",
      clear: () => setFilters((f) => ({ ...f, availableOnly: false })),
    });
  }
  if (filters.category) {
    chips.push({
      key: "category",
      label: CATEGORY_LABELS[filters.category],
      clear: () => setFilters((f) => ({ ...f, category: "" })),
    });
  }
  if (filters.tier) {
    chips.push({
      key: "tier",
      label: TIER_LABELS[filters.tier],
      clear: () => setFilters((f) => ({ ...f, tier: "" })),
    });
  }
  if (filters.city) {
    chips.push({
      key: "city",
      label: filters.city,
      clear: () => setFilters((f) => ({ ...f, city: "" })),
    });
  }

  return (
    <MarketingLayout>
      {/* ════════════ HEADER + SEARCH ════════════ */}
      <section className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl" style={{ color: P.text }}>
                تصفّح المونتيرين
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: P.muted }}>
                مونتيرو فيديو موثّقون في المنطقة العربية — شاهد أعمالهم واختر من يناسب فيديوك.
              </p>
            </div>

            <div className="flex items-center gap-2 lg:w-[28rem] lg:shrink-0">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2"
                  style={{ color: P.muted }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو الأداة (مثال: Premiere، موشن…)"
                  aria-label="ابحث عن مونتير"
                  className="h-12 w-full rounded-lg bg-white ps-10 pe-9 text-sm outline-none transition-colors focus:ring-2"
                  style={{
                    border: `1px solid ${P.border}`,
                    color: P.text,
                    // @ts-expect-error css var for focus ring tint
                    "--tw-ring-color": `${P.primary}40`,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="مسح البحث"
                    className="absolute end-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: P.muted }}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold lg:hidden"
                style={{ border: `1px solid ${P.border}`, background: P.card, color: P.text }}
              >
                <SlidersHorizontal className="size-4" />
                الفلاتر
                {activeFilterCount > 0 && (
                  <span
                    className="font-tech inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-white"
                    style={{ background: P.primary }}
                  >
                    {toArabicDigits(activeFilterCount)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ RAIL + RESULTS ════════════ */}
      <section style={{ background: BG.subtle }}>
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
          <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
            {/* ── filter rail (desktop) ── */}
            <aside className="hidden lg:block">
              <div
                className="sticky top-20 p-5"
                style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: cardShadow }}
              >
                <FreelancerFilters
                  value={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(EMPTY_FILTERS)}
                  cities={cities}
                />
              </div>
            </aside>

            {/* ── results ── */}
            <div className="min-w-0">
              {/* toolbar: count + sort */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm" style={{ color: P.muted }}>
                  <span className="font-tech font-semibold tabular-nums" style={{ color: P.text }}>
                    {toArabicDigits(total)}
                  </span>{" "}
                  مونتير
                </p>

                <div className="flex items-center gap-1.5">
                  <span className="hidden shrink-0 text-xs sm:inline" style={{ color: P.muted }}>
                    ترتيب:
                  </span>
                  <div
                    className="flex items-center gap-0.5 overflow-x-auto rounded-lg p-0.5"
                    style={{ background: P.card, border: `1px solid ${P.border}` }}
                  >
                    {SORTS.map((s) => {
                      const on = sort === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSort(s.value)}
                          aria-pressed={on}
                          className="shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors"
                          style={{
                            background: on ? `${P.primary}14` : "transparent",
                            color: on ? P.primaryText : P.muted,
                            fontWeight: on ? 600 : 500,
                          }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* active filter chips */}
              {chips.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {chips.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={c.clear}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-70"
                      style={{
                        background: `${P.primary}14`,
                        color: P.primaryText,
                        border: `1px solid ${P.primary}33`,
                      }}
                    >
                      <span className="truncate">{c.label}</span>
                      <X className="size-3 shrink-0" aria-hidden />
                      <span className="sr-only">إزالة الفلتر</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                    style={{ color: P.muted }}
                  >
                    مسح الكل
                  </button>
                </div>
              )}

              {/* grid / skeleton / empty */}
              {loading ? (
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : items.length > 0 ? (
                <>
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((f) => (
                      <FreelancerCard key={f.id} f={f} />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-10 flex justify-center">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-7 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                        style={{ border: `1px solid ${P.border}`, color: P.text }}
                      >
                        {loadingMore ? "جارٍ التحميل…" : "عرض المزيد من المونتيرين"}
                        {!loadingMore && <ChevronDown className="size-4" />}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div
                  className="mt-5 flex flex-col items-center justify-center bg-white px-6 py-16 text-center"
                  style={{ border: `1px dashed ${P.border}` }}
                >
                  <div
                    className="flex size-14 items-center justify-center rounded-lg"
                    style={{ background: `${P.primary}1A`, color: P.primary }}
                  >
                    <Users className="size-6" />
                  </div>
                  <p className="mt-5 text-lg font-bold tracking-tight" style={{ color: P.text }}>
                    لا توجد نتائج مطابقة
                  </p>
                  <p className="mt-2 max-w-sm text-sm" style={{ color: P.muted }}>
                    جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر للعثور على مزيد من المونتيرين.
                  </p>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: P.primary }}
                  >
                    مسح كل الفلاتر
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ MOBILE FILTER SHEET ════════════ */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="تصفية النتائج"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col"
            style={{ background: P.card, borderTop: `1px solid ${P.border}` }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: P.border }}
            >
              <p className="text-sm font-bold" style={{ color: P.text }}>
                تصفية النتائج
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="إغلاق"
                className="transition-opacity hover:opacity-70"
                style={{ color: P.muted }}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FreelancerFilters
                value={filters}
                onChange={setFilters}
                onReset={() => setFilters(EMPTY_FILTERS)}
                cities={cities}
              />
            </div>

            <div className="border-t px-5 py-4" style={{ borderColor: P.border }}>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                عرض <span className="font-tech mx-1 tabular-nums">{toArabicDigits(total)}</span> مونتير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ AI NUDGE BANNER ════════════ */}
      <section className="border-t" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <div
            className="px-8 py-12 text-center lg:px-16"
            style={{ background: `${P.primary}1A`, border: `1px solid ${P.primary}26` }}
          >
            <div className="flex flex-col items-center">
              <div
                className="flex size-12 items-center justify-center rounded-lg"
                style={{ background: "#fff", color: P.primary, border: `1px solid ${P.primary}20` }}
              >
                <Sparkles className="size-6" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: P.text }}>
                لا وقت للبحث؟ دع <span style={{ color: P.primaryText }}>المطابقة الذكية</span> تختار لك
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: P.muted }}>
                صِف الفيديو الذي تريده وسنرشّح لك أفضل ٣ مونتيرين مناسبين خلال
                دقائق — دون مراجعة عشرات الملفات.
              </p>
              <Link
                href="/post-job"
                className="group mt-7 inline-flex h-12 items-center gap-2 rounded-lg px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                ابدأ المطابقة الذكية
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
