"use client";

import { JobRow } from "@/components/jobs/job-row";
import {
    CATEGORY_LABELS,
    TIER_LABELS,
    type BudgetType,
    type Category,
    type JobSort,
    type JobSummary,
    type Tier,
} from "@/components/jobs/types";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { SectionLabel } from "@/components/marketing/section-heading";
import { BG, cardShadow, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import {
    Briefcase,
    ChevronDown,
    Search,
    SlidersHorizontal,
    Sparkles,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getJobsList } from "~/api/jobs/queries";

const PAGE_SIZE = 9;

const SORTS: { value: JobSort; label: string }[] = [
  { value: "recent", label: "الأحدث" },
  { value: "budget", label: "الأعلى ميزانية" },
  { value: "proposals", label: "الأقل تنافساً" },
];

const BUDGET_TYPES: { value: BudgetType; label: string }[] = [
  { value: "fixed", label: "سعر ثابت" },
  { value: "hourly", label: "بالساعة" },
];

const STATS = [
  { value: "+٢٤٠٠", label: "وظيفة مفتوحة", color: P.primaryText },
  { value: "٩٢٪", label: "عملاء موثّقون", color: P.green },
  { value: "١٨", label: "ساعة لأول عرض", color: P.primaryText },
];

/** Themed RTL select used across the filter row. */
function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 cursor-pointer appearance-none rounded-xl bg-white ps-4 pe-9 text-sm font-medium outline-none transition-colors focus:ring-2"
        style={{
          border: `1px solid ${P.border}`,
          color: value ? P.text : P.muted,
          // @ts-expect-error css var for focus ring tint
          "--tw-ring-color": `${P.primary}40`,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2"
        style={{ color: P.muted }}
      />
    </div>
  );
}

/** Placeholder row shown while results load. */
function RowSkeleton() {
  return (
    <div
      className="p-5 sm:p-6"
      style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: cardShadow }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-6 w-24 animate-pulse rounded-full" style={{ background: P.subtle }} />
          <div className="h-5 w-2/3 animate-pulse rounded" style={{ background: P.subtle }} />
          <div className="h-3 w-full animate-pulse rounded" style={{ background: P.subtle }} />
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-16 animate-pulse rounded-lg" style={{ background: P.subtle }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t pt-4 lg:w-52 lg:flex-col lg:items-end lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0" style={{ borderColor: P.border }}>
          <div className="h-8 w-28 animate-pulse rounded" style={{ background: P.subtle }} />
          <div className="h-10 w-32 animate-pulse rounded-full" style={{ background: P.subtle }} />
        </div>
      </div>
    </div>
  );
}

export default function BrowseJobsPage() {
  // filter inputs
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [experience, setExperience] = useState<Tier | "">("");
  const [budgetType, setBudgetType] = useState<BudgetType | "">("");
  const [sort, setSort] = useState<JobSort>("recent");

  // data
  const [items, setItems] = useState<JobSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo(
    () => ({ search: debouncedSearch, category, experience, budgetType, sort }),
    [debouncedSearch, category, experience, budgetType, sort],
  );

  // reset + load first page whenever filters change
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getJobsList({ ...query, page: 1, pageSize: PAGE_SIZE }).then((res) => {
      if (ignore) return;
      setItems(res.items);
      setTotal(res.total);
      setPage(1);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [query]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const res = await getJobsList({ ...query, page: nextPage, pageSize: PAGE_SIZE });
    setItems((prev) => [...prev, ...res.items]);
    setTotal(res.total);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const hasFilters = !!search || !!category || !!experience || !!budgetType;
  const hasMore = items.length < total;

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setExperience("");
    setBudgetType("");
  };

  return (
    <MarketingLayout>
      {/* ════════════ HEADER BAND ════════════ */}
      <section className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-20 text-center lg:px-8 lg:py-28">
          <div className="flex flex-col items-center">
            <SectionLabel>فرص المونتاج</SectionLabel>
            <h1
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.8rem]"
              style={{ color: P.text }}
            >
              اعثر على <span style={{ color: P.primaryText }}>وظيفتك</span> التالية
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: P.muted }}>
              تصفّح وظائف فيديو حقيقية من عملاء موثّقين في المنطقة العربية،
              وقدّم عرضك على ما يناسب أدواتك — بمساعدة المطابقة الذكية.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col items-center">
                  <span className="font-tech text-3xl font-bold tabular-nums" style={{ color: s.color }}>
                    {s.value}
                  </span>
                  <span className="mt-1 text-xs" style={{ color: P.muted }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ RESULTS BAND ════════════ */}
      <section style={{ background: BG.subtle }}>
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          {/* ── sticky filter bar ── */}
          <div
            className="sticky top-4 z-30 rounded-2xl p-3 backdrop-blur"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: `1px solid ${P.border}`,
              boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
            }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2"
                  style={{ color: P.muted }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن وظيفة (مثال: ريلز، موشن، تلوين…)"
                  className="h-11 w-full rounded-xl bg-white ps-10 pe-4 text-sm outline-none transition-colors focus:ring-2"
                  style={{
                    border: `1px solid ${P.border}`,
                    color: P.text,
                    // @ts-expect-error focus ring tint
                    "--tw-ring-color": `${P.primary}40`,
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="hidden size-4 lg:block" style={{ color: P.muted }} />
                <FilterSelect
                  value={category}
                  onChange={(v) => setCategory(v as Category | "")}
                  placeholder="نوع المونتاج"
                  options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <FilterSelect
                  value={experience}
                  onChange={(v) => setExperience(v as Tier | "")}
                  placeholder="المستوى"
                  options={Object.entries(TIER_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <FilterSelect
                  value={budgetType}
                  onChange={(v) => setBudgetType(v as BudgetType | "")}
                  placeholder="نوع الميزانية"
                  options={BUDGET_TYPES}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={{ borderColor: P.border }}>
              <div className="flex items-center gap-3">
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                    style={{ color: P.muted }}
                  >
                    <X className="size-3.5" />
                    مسح الفلاتر
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: P.muted }}>
                    عرض كل الوظائف المفتوحة
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: P.muted }}>
                  <span className="font-tech font-semibold tabular-nums" style={{ color: P.text }}>
                    {toArabicDigits(total)}
                  </span>{" "}
                  وظيفة
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs sm:inline" style={{ color: P.muted }}>ترتيب:</span>
                  <FilterSelect
                    value={sort}
                    onChange={(v) => setSort((v || "recent") as JobSort)}
                    placeholder="الأحدث"
                    options={SORTS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── grid / skeleton / empty ── */}
          {loading ? (
            <div className="mt-8 flex flex-col gap-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="mt-8 flex flex-col gap-4">
                {items.map((j) => (
                  <JobRow key={j.id} j={j} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    style={{ border: `1px solid ${P.border}`, color: P.text, boxShadow: "0 2px 10px rgba(15,23,42,0.05)" }}
                  >
                    {loadingMore ? "جارٍ التحميل…" : "عرض المزيد من الوظائف"}
                    {!loadingMore && <ChevronDown className="size-4" />}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-20 text-center" style={{ border: `1px dashed ${P.border}` }}>
              <div className="flex size-14 items-center justify-center rounded-2xl" style={{ background: `${P.primary}1A`, color: P.primary }}>
                <Briefcase className="size-6" />
              </div>
              <p className="mt-5 text-lg font-bold tracking-tight" style={{ color: P.text }}>
                لا توجد وظائف مطابقة
              </p>
              <p className="mt-2 max-w-sm text-sm" style={{ color: P.muted }}>
                جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر للعثور على مزيد من الفرص.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: P.primary }}
              >
                مسح كل الفلاتر
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ════════════ AI PROPOSAL NUDGE ════════════ */}
      <section className="border-t" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
          <div
            className="rounded-3xl px-8 py-12 text-center lg:px-16"
            style={{ background: `${P.primary}1A`, border: `1px solid ${P.primary}26` }}
          >
            <div className="flex flex-col items-center">
              <div
                className="flex size-12 items-center justify-center rounded-2xl"
                style={{ background: "#fff", color: P.primary, border: `1px solid ${P.primary}20` }}
              >
                <Sparkles className="size-6" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: P.text }}>
                لا تكتب عرضك من الصفر — دع <span style={{ color: P.primaryText }}>المطابقة الذكية</span> تكتبه لك
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: P.muted }}>
                عند فتح أي وظيفة، يولّد لك مساعد العروض رسالة مخصّصة تبرز أدواتك
                وتناسب تفاصيل الوظيفة — جاهزة للإرسال في ثوانٍ.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
