"use client";

import { FreelancerCard } from "@/components/freelancers/freelancer-card";
import {
    CATEGORY_LABELS,
    TIER_LABELS,
    type Category,
    type Freelancer,
    type FreelancerSort,
    type Tier,
} from "@/components/freelancers/types";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { SectionLabel } from "@/components/marketing/section-heading";
import { axios } from "@/lib/api/axios";
import { BG, cardShadow, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import {
    ArrowLeft,
    ChevronDown,
    Search,
    SlidersHorizontal,
    Sparkles,
    Users,
    X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ResWithDataMeta, TListMeta } from "~/types/response";

const PAGE_SIZE = 9;

const SORTS: { value: FreelancerSort; label: string }[] = [
  { value: "match", label: "الأعلى تطابقاً" },
  { value: "rating", label: "الأعلى تقييماً" },
  { value: "rate", label: "الأقل سعراً" },
  { value: "completed", label: "الأكثر خبرة" },
];

const STATS = [
  { value: "+١٠٬٠٠٠", label: "مونتير موثّق", color: P.primaryText },
  { value: "٤٫٩", label: "متوسط التقييم", color: P.green },
  { value: "١٢", label: "دولة عربية", color: P.primaryText },
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

/** Placeholder card shown while results load — mirrors the EditorCard shape. */
function CardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-3"
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
  const [category, setCategory] = useState<Category | "">("");
  const [tier, setTier] = useState<Tier | "">("");
  const [city, setCity] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<FreelancerSort>("match");

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

  // city dropdown options (hardcoded for now)
  useEffect(() => {
    setCities(["القاهرة", "الرياض", "دبي", "بيروت", "عمّان", "الكويت", "الدوحة"]);
  }, []);

  // the active query (memoized so the fetch effect only reruns on real changes)
  const query = useMemo(
    () => ({ search: debouncedSearch, category, tier, city, availableOnly, sort }),
    [debouncedSearch, category, tier, city, availableOnly, sort],
  );

  // reset + load first page whenever filters change
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    axios
      .get<ResWithDataMeta<Freelancer[], TListMeta>>("/freelancers", {
        params: { ...query, page: 1, page_size: PAGE_SIZE },
      })
      .then((res) => {
        if (ignore) return;
        setItems(res.data.data);
        setTotal(res.data.meta?.total ?? 0);
        setPage(1);
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      const res = await axios.get<ResWithDataMeta<Freelancer[], TListMeta>>("/freelancers", {
        params: { ...query, page: next, page_size: PAGE_SIZE },
      });
      setItems((prev) => [...prev, ...res.data.data]);
      setTotal(res.data.meta?.total ?? 0);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasFilters = !!search || !!category || !!tier || !!city || availableOnly;
  const hasMore = items.length < total;

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setTier("");
    setCity("");
    setAvailableOnly(false);
  };

  return (
    <MarketingLayout>
      {/* ════════════ HEADER BAND ════════════ */}
      <section className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-20 text-center lg:px-8 lg:py-28">
          <div className="flex flex-col items-center">
            <SectionLabel>تصفّح المونتيرين</SectionLabel>
            <h1
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.8rem]"
              style={{ color: P.text }}
            >
              اعثر على <span style={{ color: P.primaryText }}>المونتير</span> المناسب لفيديوك القادم
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: P.muted }}>
              تصفّح أفضل مونتيري الفيديو الموثّقين في المنطقة العربية، أو دع
              المطابقة الذكية ترشّح لك أنسبهم خلال دقائق.
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
                  placeholder="ابحث بالاسم أو الأداة (مثال: Premiere، موشن…)"
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
                  value={tier}
                  onChange={(v) => setTier(v as Tier | "")}
                  placeholder="المستوى"
                  options={Object.entries(TIER_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <FilterSelect
                  value={city}
                  onChange={(v) => setCity(v)}
                  placeholder="المدينة"
                  options={cities.map((c) => ({ value: c, label: c }))}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={{ borderColor: P.border }}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAvailableOnly((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    availableOnly
                      ? { background: `${P.green}14`, border: `1px solid ${P.green}40`, color: P.green }
                      : { background: "#fff", border: `1px solid ${P.border}`, color: P.muted }
                  }
                >
                  <span className="size-1.5 rounded-full" style={{ background: availableOnly ? P.green : P.muted }} />
                  متاح للعمل الآن
                </button>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                    style={{ color: P.muted }}
                  >
                    <X className="size-3.5" />
                    مسح الفلاتر
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: P.muted }}>
                  <span className="font-tech font-semibold tabular-nums" style={{ color: P.text }}>
                    {toArabicDigits(total)}
                  </span>{" "}
                  نتيجة
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs sm:inline" style={{ color: P.muted }}>ترتيب:</span>
                  <FilterSelect
                    value={sort}
                    onChange={(v) => setSort((v || "match") as FreelancerSort)}
                    placeholder="الأعلى تطابقاً"
                    options={SORTS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── grid / skeleton / empty ── */}
          {loading ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => (
                  <FreelancerCard key={f.id} f={f} />
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
                    {loadingMore ? "جارٍ التحميل…" : "عرض المزيد من المونتيرين"}
                    {!loadingMore && <ChevronDown className="size-4" />}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-20 text-center" style={{ border: `1px dashed ${P.border}` }}>
              <div className="mb-6 grid size-16 place-items-center rounded-2xl" style={{ background: `${P.primary}1A`, color: P.primary }}>
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

      {/* ════════════ AI NUDGE BANNER ════════════ */}
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
                لا وقت للبحث؟ دع <span style={{ color: P.primaryText }}>المطابقة الذكية</span> تختار لك
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: P.muted }}>
                صِف الفيديو الذي تريده وسنرشّح لك أفضل ٣ مونتيرين مناسبين خلال
                دقائق — دون مراجعة عشرات الملفات.
              </p>
              <Link
                href="/post-job"
                className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
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
