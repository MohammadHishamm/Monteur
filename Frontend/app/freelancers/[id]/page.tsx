"use client";

import { FreelancerCard } from "@/components/freelancers/freelancer-card";
import {
    TIER_LABELS,
    type Freelancer as ComponentFreelancer,
    type VerificationKind
} from "@/components/freelancers/types";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { ProgressRing } from "@/components/ui/progress-ring";
import { RatingStars } from "@/components/ui/rating-stars";
import { TierBadge } from "@/components/ui/tier-badge";
import { BG, P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Bookmark,
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    Languages as LanguagesIcon,
    Mail,
    MapPin,
    MessageCircle,
    Play,
    ShieldCheck,
    Star,
    User,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams, usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSaveFreelancer, useUnsaveFreelancer } from "~/api/freelancers/mutations";
import {
    getFreelancer,
    getFreelancerReviews,
    getFreelancerSavedStatus,
    getSimilarFreelancers,
} from "~/api/freelancers/queries";
import type { Freelancer as ApiFreelancer, FreelancerProfile as ApiFreelancerProfile, Showcase } from "~/types/freelancer";
import type { Review } from "~/types/review";

/** Charcoal brand-panel gradient (matches the auth split-screen spec). */
const CHARCOAL =
  "linear-gradient(135deg, #15171b 0%, #111316 55%, #0c0d10 100%)";

const VERIFICATION_META: Record<
  VerificationKind,
  { label: string; Icon: React.ElementType }
> = {
  identity: { label: "الهوية", Icon: User },
  email: { label: "البريد الإلكتروني", Icon: Mail },
  payment: { label: "وسيلة الدفع", Icon: CreditCard },
};

const SECTIONS = [
  { id: "about", label: "نبذة" },
  { id: "skills", label: "الأدوات" },
  { id: "portfolio", label: "الشو-ريل" },
  { id: "reviews", label: "الآراء" },
] as const;

function toCardFreelancer(freelancer: ApiFreelancer): ComponentFreelancer {
  return {
    id: freelancer.id,
    name: freelancer.full_name,
    role: freelancer.role ?? "",
    category: freelancer.category ?? "youtube",
    showreelDuration: freelancer.showreel_duration,
    tier: freelancer.tier,
    matchScore: freelancer.match_score ?? 0,
    rating: freelancer.rating ?? 0,
    reviews: freelancer.total_reviews ?? 0,
    skills: freelancer.skills ?? [],
    city: freelancer.city ?? "",
    country: freelancer.country ?? "",
    rate: freelancer.hourly_rate ?? 0,
    available: freelancer.available ?? false,
    verified: freelancer.verified ?? false,
    completed: freelancer.completed_jobs ?? 0,
    color: freelancer.color ?? "#10b981",
    tagline: freelancer.tagline ?? "",
    avatar: freelancer.avatar_url ?? undefined,
  };
}

export default function FreelancerProfileRedesignPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const id = params.id;

  const { data: profileData, isPending: profilePending } = useQuery(getFreelancer({ id })) as {
    data: { data: ApiFreelancerProfile } | undefined; isPending: boolean;
  };
  const { data: similarData } = useQuery(getSimilarFreelancers({ id })) as {
    data: { data: import("~/types/freelancer").Freelancer[] } | undefined;
  };
  const { data: savedData } = useQuery(getFreelancerSavedStatus({ id })) as {
    data: { data: { saved: boolean } } | undefined;
  };
  const { data: reviewsData } = useQuery(getFreelancerReviews({ id })) as {
    data: { data: Review[] } | undefined;
  };

  const saveMutation    = useSaveFreelancer(id);
  const unsaveMutation  = useUnsaveFreelancer(id);

  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  const saved       = savedOverride ?? savedData?.data?.saved ?? false;
  const savePending = saveMutation.isPending || unsaveMutation.isPending;

  const f       = profileData?.data as any;
  const similar = ((similarData?.data ?? []) as ApiFreelancer[]).map(toCardFreelancer);
  const reviews = reviewsData?.data ?? [];

  // Highlight the anchor for the section currently in view.
  useEffect(() => {
    if (!f) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [f]);

  if (!profilePending && !f) notFound();
  if (profilePending || !f) return <ProfileSkeleton />;

  const profile = f; // keep alias so JSX below still compiles
  void profile;

  /** Convenience aliases for snake_case → readable names */
  const name          = f.full_name;
  const avatar        = f.avatar_url;
  const verified      = f.verified ?? false;
  const tier          = f.tier;
  const role          = f.role ?? "";
  const city          = f.city ?? "";
  const country       = f.country ?? "";
  const memberSince   = new Date(f.created_at).getFullYear().toString();
  const responseTime  = f.response_time ?? "–";
  const available     = f.available ?? false;
  const rating        = f.rating ?? 0;
  const totalReviews  = f.total_reviews ?? 0;
  const completed     = f.completed_jobs ?? 0;
  const onTimeRate    = f.on_time_rate ?? 0;
  const about         = f.bio ?? "";
  const skills        = f.skills ?? [];
  const languages     = f.languages ?? [];
  const rate          = f.hourly_rate ?? 0;
  const showreelDuration = f.showreel_duration;
  const MINT          = P.green;
  const currentTier   = f.tier as keyof typeof TIER_LABELS;
  const nextTier      = (f.nextTier ?? null) as keyof typeof TIER_LABELS | null;
  const isVideoEditorsDetailAlias = /^\/video-editors\/[^/]+$/.test(pathname ?? "");
  const backToListHref = isVideoEditorsDetailAlias
    ? "/video-editors"
    : "/freelancers";

  const content = (
    <>
      {/* ════════════ CHARCOAL SHOWREEL HERO ════════════ */}
      <section
        className="relative overflow-hidden"
          style={{ background: CHARCOAL, borderBottom: `1px solid ${P.primary}26` }}
      >
        {/* soft emerald glows (match the auth split-screen panel) */}
        <div
          className="pointer-events-none absolute -top-24 -inset-s-24 size-105 rounded-full"
          style={{ background: `radial-gradient(ellipse, ${P.primary}1f, transparent 60%)` }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -inset-e-24 size-105 rounded-full"
          style={{ background: `radial-gradient(ellipse, ${P.primary}1a, transparent 60%)` }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center">
            {/* ── identity ── */}
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="size-16 shrink-0 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 2px ${MINT}` }}
                  />
                ) : (
                  <span
                    className="grid size-16 shrink-0 place-items-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", boxShadow: `0 0 0 2px ${MINT}55` }}
                  >
                    <User className="size-7 text-slate-300" strokeWidth={1.5} />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
                      {name}
                    </h1>
                    {verified && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: "rgba(52,211,153,0.15)", color: MINT }}
                      >
                        <BadgeCheck className="size-3.5" />
                        موثّق
                      </span>
                    )}
                    <TierBadge tier={tier} size="md" />
                  </div>
                  <p className="mt-1 text-base text-slate-300">{role}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {city}، {country}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  عضو منذ {memberSince}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  يرد خلال {responseTime}
                </span>
                {available && (
                  <span className="inline-flex items-center gap-1.5" style={{ color: MINT }}>
                    <span className="size-1.5 rounded-full" style={{ background: MINT }} />
                    متاح للعمل الآن
                  </span>
                )}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/post-job"
                  className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ background: P.primary }}
                >
                  <Briefcase className="size-4" />
                  وظّف الآن
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <MessageCircle className="size-4" />
                  مراسلة
                </Link>
                <button
                  type="button"
                  disabled={savePending}
                  onClick={async () => {
                    const next = !saved;
                    setSavedOverride(next);
                    try {
                      if (next) await saveMutation.mutateAsync();
                      else await unsaveMutation.mutateAsync();
                    } catch {
                      setSavedOverride(!next);
                    }
                  }}
                  aria-label="حفظ الملف"
                  aria-pressed={saved}
                  className="inline-flex size-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                  style={{ border: "1px solid rgba(255,255,255,0.25)", color: saved ? MINT : "#fff" }}
                >
                  <Bookmark className="size-5" style={saved ? { fill: MINT } : undefined} />
                </button>
              </div>
            </div>

            {/* ── showreel (16:9) ── */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-linear-to-br from-[#1b1d22] to-[#0c0d10] ring-1 ring-white/10">
              <span
                className="font-tech absolute top-3 inset-s-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest"
                style={{ background: "rgba(255,255,255,0.08)", color: MINT }}
              >
                شو-ريل
              </span>
              <span className="absolute inset-0 grid place-items-center">
                <span
                  className="grid size-14 place-items-center rounded-full shadow-lg transition-transform duration-300 hover:scale-110"
                  style={{ background: P.primary }}
                >
                  <Play className="size-5 translate-x-px fill-current text-white" />
                </span>
              </span>
              {showreelDuration && (
                <span className="font-tech absolute bottom-3 inset-e-3 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                  {showreelDuration}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FLUSH STAT GRID (hairline gutters, no cards) ════════════ */}
      <div className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div
          className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4"
          style={{ background: P.border }}
        >
          {[
            {
              label: "التقييم",
              value: rating.toFixed(1),
              sub: `${toArabicDigits(totalReviews)} مراجعة`,
              icon: <Star className="size-4 fill-current" />,
              color: P.star,
            },
            {
              label: "أعمال مكتملة",
              value: toArabicDigits(completed),
              sub: "بنجاح",
              icon: <CheckCircle2 className="size-4" />,
              color: P.green,
            },
            {
              label: "الالتزام بالموعد",
              value: `${toArabicDigits(onTimeRate)}٪`,
              sub: "تسليم في الوقت",
              icon: <Clock className="size-4" />,
              color: P.primary,
            },
            {
              label: "وقت الرد",
              value: responseTime,
              sub: "متوسط الاستجابة",
              icon: <MessageCircle className="size-4" />,
              color: P.primary,
            },
          ].map((s) => (
            <div key={s.label} className="px-5 py-6 lg:px-7" style={{ background: BG.main }}>
              <div className="flex items-center gap-2" style={{ color: s.color }}>
                {s.icon}
                <span
                  className="font-tech text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: P.muted }}
                >
                  {s.label}
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums" style={{ color: P.text }}>
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: P.muted }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ STICKY ANCHOR TABS ════════════ */}
      <div
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{ background: "rgba(255,255,255,0.88)", borderColor: P.border }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-5 lg:px-8">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center whitespace-nowrap border-b-2 py-3.5 text-sm font-semibold transition-colors"
                style={
                  isActive
                    ? { color: P.primaryText, borderColor: P.primary }
                    : { color: P.muted, borderColor: "transparent" }
                }
              >
                {s.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* ════════════ BODY (editorial, no cards) ════════════ */}
      <section style={{ background: BG.main }}>
        <div className="mx-auto grid max-w-6xl gap-x-12 px-5 lg:grid-cols-[1fr_300px] lg:px-8">
          {/* ── MAIN COLUMN ── */}
          <div className="min-w-0">
            {/* ABOUT */}
            <Section id="about" label="نبذة">
              <p className="max-w-2xl text-base leading-loose" style={{ color: P.muted }}>
                {about}
              </p>
            </Section>

            {/* TOOLS */}
            <Section id="skills" label="الأدوات">
              <div className="flex flex-wrap gap-2.5">
                {skills.map((s: string) => (
                  <span
                    key={s}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium"
                    style={{ border: `1px solid ${P.border}`, color: P.primaryText, background: P.subtle }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>

            {/* SHOWREEL / PORTFOLIO */}
            <Section id="portfolio" label="الشو-ريل والأعمال">
              <ShowcasesGrid freelancerId={id} />
            </Section>

            {/* REVIEWS */}
            <Section id="reviews" label="آراء العملاء">
              <div className="flex flex-col gap-8 border-b pb-8" style={{ borderColor: P.border }}>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold leading-none tracking-tight tabular-nums" style={{ color: P.text }}>
                    {rating.toFixed(1)}
                  </span>
                  <div>
                    <RatingStars value={rating} showValue={false} size={15} />
                    <p className="mt-1 text-[11px]" style={{ color: P.muted }}>
                      {toArabicDigits(totalReviews)} مراجعة
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                {reviews.map((r) => (
                  <blockquote
                    key={r.id}
                    className="border-s-2 py-5 ps-5"
                    style={{ borderColor: P.primary }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {r.reviewer_avatar ? (
                          <img
                            src={r.reviewer_avatar}
                            alt={r.reviewer_name}
                            className="size-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold"
                            style={{ background: P.subtle, color: P.primaryText }}
                          >
                            {r.reviewer_name[0]}
                          </div>
                        )}
                        <p className="text-sm font-bold" style={{ color: P.text }}>
                          {r.reviewer_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RatingStars value={r.rating} showValue={false} size={12} />
                        <span className="text-[11px]" style={{ color: P.muted }}>
                          {new Date(r.created_at).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: P.text }}>
                      {r.body}
                    </p>
                  </blockquote>
                ))}
              </div>
            </Section>
          </div>

          {/* ── HIRE RAIL (one sharp block, internal hairline dividers) ── */}
          <aside className="pb-14 lg:sticky lg:top-16 lg:self-start lg:pt-14">
            <div className="rounded-2xl" style={{ border: `1px solid ${P.border}` }}>
              {/* price + CTA */}
              <div className="border-b p-5" style={{ borderColor: P.border }}>
                <p className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
                  السعر يبدأ من
                </p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums" style={{ color: P.text }}>
                ${toArabicDigits(rate)}
                  <span className="text-base font-medium" style={{ color: P.muted }}>
                    {" "}
                    / فيديو
                  </span>
                </p>
                <Link
                  href="/offers"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: P.primary }}
                >
                  أرسل عرضاً
                  <ArrowLeft className="size-4" />
                </Link>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: P.muted }}>
                  <ShieldCheck className="size-3.5" style={{ color: P.green }} />
                  مدفوعات محمية بالضمان
                </div>
              </div>

              {/* tier */}
              <div className="border-b p-5" style={{ borderColor: P.border }}>
                <p className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
                  المستوى
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <ProgressRing progress={f.tierProgress} size={68} strokeWidth={6} color={P.primary}>
                    <TierBadge tier={f.tier} size="sm" showIcon />
                  </ProgressRing>
                  <div className="text-sm">
                    <p className="font-bold" style={{ color: P.text }}>
                      {TIER_LABELS[currentTier]}
                    </p>
                    {nextTier ? (
                      <p className="mt-0.5 text-xs" style={{ color: P.muted }}>
                        {toArabicDigits(f.tierProgress)}٪ نحو {TIER_LABELS[nextTier]}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs" style={{ color: P.muted }}>
                        أعلى مستوى
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* verifications */}
              <div className="border-b p-5" style={{ borderColor: P.border }}>
                <p className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
                  التوثيقات
                </p>
              {/* verifications — simplified: email only from user type */}
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2" style={{ color: P.text }}>
                    <Mail className="size-4" style={{ color: P.muted }} />
                    البريد الإلكتروني
                  </span>
                  {verified ? (
                    <CheckCircle2 className="size-4" style={{ color: P.green }} />
                  ) : (
                    <span className="text-[11px]" style={{ color: P.muted }}>غير موثّق</span>
                  )}
                </li>
              </ul>
              </div>

              {/* languages */}
              <div className="p-5">
                <p className="font-tech text-[10px] font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
                  اللغات
                </p>
                <ul className="mt-3 space-y-2 text-sm" style={{ color: P.text }}>
                  {f.languages.map((l: { name: string; level: string }) => (
                    <li key={l.name} className="flex items-center gap-2">
                      <LanguagesIcon className="size-4" style={{ color: P.muted }} />
                      {l.name}{" "}
                      <span className="text-xs" style={{ color: P.muted }}>
                        ({l.level})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ════════════ SIMILAR TALENT ════════════ */}
      {similar.length > 0 && (
        <section className="border-t" style={{ background: BG.subtle, borderColor: P.border }}>
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: P.text }}>
                مونتيرون <span style={{ color: P.primaryText }}>مشابهون</span>
              </h2>
              <Link
                href="/freelancers"
                className="inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: P.primaryText }}
              >
                عرض الكل
                <ArrowLeft className="size-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((x) => (
                <FreelancerCard key={x.id} f={x} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════ MOBILE STICKY CTA ════════════ */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t bg-white/95 p-3 backdrop-blur lg:hidden"
        style={{ borderColor: P.border }}
      >
        <Link
          href="/post-job"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white"
          style={{ background: P.primary }}
        >
          <Briefcase className="size-4" />
          وظّف الآن
        </Link>
        <Link
          href="/messages"
          className="flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          <MessageCircle className="size-4" />
          مراسلة
        </Link>
      </div>
    </>
  );



  return <MarketingLayout>{content}</MarketingLayout>;
}

/* ── editorial section: clean bold title on a top hairline ── */
function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-16 border-b py-12 first:border-t-0 lg:py-16"
      style={{ borderColor: P.border }}
    >
      <div className="mb-7">
        <h2 className="text-2xl font-bold tracking-tight lg:text-3xl" style={{ color: P.text }}>
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

/* ── loading skeleton ── */
function ProfileSkeleton() {
  const bar = (w: string, h = "h-4") => (
    <div className={`${h} ${w} animate-pulse rounded`} style={{ background: "rgba(255,255,255,0.15)" }} />
  );
  return (
    <MarketingLayout>
      <div className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-3.5 lg:px-8">
          <div className="h-4 w-40 animate-pulse rounded" style={{ background: P.subtle }} />
        </div>
      </div>
      <section className="relative" style={{ background: CHARCOAL }}>
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="size-16 shrink-0 animate-pulse rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                <div className="flex-1 space-y-2">
                  {bar("w-48", "h-7")}
                  {bar("w-32")}
                </div>
              </div>
              {bar("w-64", "h-3")}
            </div>
            <div className="aspect-video w-full animate-pulse rounded-2xl" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>
      </section>
      <div className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4" style={{ background: P.border }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse" style={{ background: P.subtle }} />
          ))}
        </div>
      </div>
      <section style={{ background: BG.main }}>
        <div className="mx-auto grid max-w-6xl gap-x-12 px-5 py-16 lg:grid-cols-[1fr_300px] lg:px-8">
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded" style={{ background: P.subtle }} />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded" style={{ background: P.subtle }} />
        </div>
      </section>
    </MarketingLayout>
  );
}

/* ════════════ SHOWCASES GRID ════════════ */
import { getFreelancerShowcases } from "~/api/freelancers/queries";

function ShowcasesGrid({ freelancerId }: { freelancerId: string }) {
  const { data, isPending } = useQuery(getFreelancerShowcases({ id: freelancerId })) as {
    data: { data: Showcase[] } | undefined;
    isPending: boolean;
  };
  const [playingId, setPlayingId] = useState<string | null>(null);
  const items = data?.data ?? [];

  if (isPending) return (
    <div className="grid grid-cols-2 gap-px animate-pulse" style={{ background: P.border }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-44 ${i === 0 ? "col-span-2" : ""}`} style={{ background: BG.main }} />
      ))}
    </div>
  );

  if (!items.length) return (
    <p className="text-sm py-6" style={{ color: P.muted }}>لا توجد أعمال منشورة حتى الآن.</p>
  );

  return (
    <div className="grid grid-cols-2 gap-px" style={{ background: P.border }}>
      {items.map((p, i) => {
        const feature = i === 0 || (i === items.length - 1 && items.length % 2 === 0);
        const hasVideo = !!p.video_url;
        const isPlaying = playingId === p.id;
        const colClass = feature ? "col-span-2" : "";

        const mediaPart = (
          <div className="relative overflow-hidden">
            {isPlaying && p.video_url ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                src={p.video_url}
                poster={p.cover ?? undefined}
                controls
                autoPlay
                className="h-44 w-full object-cover bg-black"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {p.cover ? (
                  <img
                    src={p.cover}
                    alt={p.title}
                    className="h-44 w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                  />
                ) : (
                  <div className="relative flex h-44 w-full items-center justify-center bg-linear-to-br from-secondary to-[#e4e7ec]">
                    <span
                      className="grid size-11 place-items-center rounded-full shadow-md transition-transform duration-300 group-hover:scale-110"
                      style={{ background: P.primary }}
                    >
                      <Play className="size-4 translate-x-px fill-current text-white" />
                    </span>
                  </div>
                )}
                {hasVideo && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span
                      className="grid size-11 place-items-center rounded-full shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                      style={{ background: "rgba(0,0,0,0.45)" }}
                    >
                      <Play className="size-4 translate-x-px fill-current text-white" />
                    </span>
                  </span>
                )}
              </>
            )}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
              style={{ background: P.primary }}
            />
          </div>
        );

        const metaPart = (
          <div className="px-4 py-3.5">
            <p className="text-sm font-bold" style={{ color: P.text }}>{p.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {(p.tags ?? []).filter(Boolean).map((t) => (
                <span key={t} className="font-tech text-[11px] uppercase tracking-wide" style={{ color: P.muted }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        );

        if (hasVideo) {
          return (
            <div
              key={p.id}
              className={`group block cursor-pointer ${colClass}`}
              style={{ background: BG.main }}
              onClick={() => setPlayingId(isPlaying ? null : p.id)}
            >
              {mediaPart}
              {metaPart}
            </div>
          );
        }

        return (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={`group block ${colClass}`}
            style={{ background: BG.main }}
          >
            {mediaPart}
            {metaPart}
          </Link>
        );
      })}
    </div>
  );
}
