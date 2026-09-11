"use client";

import { HomeLayout } from "@/components/layout/home-layout";
import { TierBadge } from "@/components/ui/tier-badge";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Film,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import React from "react";

/* ── Data ─────────────────────────────────────────────────────────── */

const metrics = [
  { value: "+٨٠٠", label: "مونتير نشط" },
  { value: "٤٧ دق", label: "متوسط المطابقة" },
  { value: "٩٨٪", label: "نسبة الرضا" },
  { value: "+٢٠", label: "نوع مونتاج" },
];

const steps = [
  {
    num: "١",
    title: "صِف البريف",
    body: "اكتب نوع الفيديو والمدة والستايل، والذكاء الاصطناعي يحوّلها إلى متطلبات واضحة بميزانية مقترحة.",
    icon: FileText,
  },
  {
    num: "٢",
    title: "قابِل أفضل ٣",
    body: "لا تصفّح ممل — نرشّح لك أنسب المونتيرين حسب التخصص والستايل والميزانية فتوظّف بنقرة.",
    icon: Sparkles,
  },
  {
    num: "٣",
    title: "سلّم وادفع بأمان",
    body: "راجِع النسخ واطلب التعديلات، والدفع محجوز بالضمان حتى رضاك التام عن العمل.",
    icon: ShieldCheck,
  },
];

const editors = [
  {
    id: "youssef-mourad",
    name: "يوسف مراد",
    role: "مونتير ريلز وموشن",
    tier: "gold" as const,
    score: "٩٨",
    duration: "00:42",
    tools: ["Premiere", "After Effects"],
    city: "القاهرة",
  },
  {
    id: "salma-haddad",
    name: "سلمى حداد",
    role: "مونتيرة يوتيوب",
    tier: "platinum" as const,
    score: "٩٦",
    duration: "12:08",
    tools: ["Premiere", "DaVinci"],
    city: "دبي",
  },
  {
    id: "karim-adel",
    name: "كريم عادل",
    role: "موشن جرافيك",
    tier: "platinum" as const,
    score: "٩٩",
    duration: "00:30",
    tools: ["After Effects", "Cinema 4D"],
    city: "الرياض",
  },
  {
    id: "layan-khaled",
    name: "ليان خالد",
    role: "مونتيرة أعراس",
    tier: "silver" as const,
    score: "٩٤",
    duration: "03:15",
    tools: ["Premiere", "Lightroom"],
    city: "عمّان",
  },
  {
    id: "tarek-samir",
    name: "طارق سمير",
    role: "VFX وتأثيرات",
    tier: "gold" as const,
    score: "٩٧",
    duration: "01:20",
    tools: ["After Effects", "Nuke"],
    city: "بيروت",
  },
  {
    id: "nour-emad",
    name: "نور عماد",
    role: "تلوين سينمائي",
    tier: "silver" as const,
    score: "٩٥",
    duration: "02:05",
    tools: ["DaVinci Resolve"],
    city: "الكويت",
  },
];

const values = [
  {
    icon: Sparkles,
    title: "مطابقة بالذكاء الاصطناعي",
    body: "نحلّل بريفك ونرشّح أنسب ٣ مونتيرين فقط — بدل تصفّح عشرات الحسابات.",
  },
  {
    icon: ShieldCheck,
    title: "دفع مضمون (Escrow)",
    body: "أموالك محجوزة بأمان ولا تُحرَّر إلا بعد موافقتك على النسخة النهائية.",
  },
  {
    icon: Film,
    title: "شو-ريل موثّق",
    body: "تشاهد أعمالاً فعلية بأرقام مشاهدات قبل أن توظّف — لا وعود فارغة.",
  },
];

const heroTracks = [
  "إعلانات وسوشيال ميديا",
  "مونتاج يوتيوب",
  "موشن جرافيك",
  "مونتاج الشركات",
  "بودكاست وفيديو تعليمي",
];

const heroVideos = [
    { label: "ريلز",  src: "/ريلز.mp4",          gradient: "" },
  { label: "3D",   src: "/3D.mp4",        gradient: "" },
  { label: "إعلانات", src: "/إعلانات.mp4",        gradient: "" },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="font-tech text-xs font-semibold uppercase tracking-widest text-emerald-strong">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function EditorCard({ e }: { e: (typeof editors)[number] }) {
  return (
    <Link
      href={`/freelancers/${e.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-(--shadow-lift)"
    >
      {/* 16:9 showreel poster — soft neutral */}
      <div className="relative aspect-video w-full bg-linear-to-br from-secondary to-[#e4e7ec]">
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="size-4 text-primary" fill="currentColor" />
          </span>
        </span>
        <span className="font-tech tnum absolute bottom-2 inset-e-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {e.duration}
        </span>
      </div>

      {/* meta */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground">
                {e.name}
              </p>
              <TierBadge tier={e.tier} size="sm" />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{e.role}</p>
          </div>
          <span className="font-tech tnum shrink-0 text-sm font-bold text-emerald-strong">
            {e.score}٪
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {e.tools.map((t) => (
            <span
              key={t}
              className="font-tech rounded border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-strong">
            <span className="size-1.5 rounded-full bg-primary" />
            متاح الآن
          </span>
          <span className="text-[11px] text-muted-foreground">{e.city}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <HomeLayout>
      {/* ════════════ 1. HERO ════════════ */}
      <section className="relative h-screen overflow-hidden bg-black">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          preload="metadata"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-linear-to-r from-black/82 via-black/58 to-black/20" />

        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-5 py-14 lg:px-8 lg:py-20">
          <div dir="rtl" className="mx-auto max-w-3xl text-center text-white lg:mx-0 lg:max-w-xl lg:text-start">
            <p className="text-sm font-semibold tracking-widest text-white/70 uppercase">منصة مونتير بالذكاء الاصطناعي</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-wide sm:text-5xl lg:text-6xl lg:leading-[1.2] lg:tracking-normal">
              اختَر أفضل مونتير فيديو
              <br />
              لمشروعك في دقائق
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed tracking-wide text-white/80 sm:text-xl sm:leading-[1.8] lg:mx-0">
              نحلل بريف مشروعك بالذكاء الاصطناعي ونرشّح لك مستقلين مطابقين للأسلوب، الميزانية، وسرعة التسليم.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/post-job"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-foreground transition-colors hover:bg-white/90"
              >
                ابدأ مشروعك الآن
              </Link>
              <Link
                href="/video-editors"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 bg-black/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-black/55"
              >
                استكشف المونتيرين
              </Link>
            </div>
          </div>

          {/* ── Mobile-ratio video stack ── */}
          <div className="pointer-events-none absolute inset-y-0 inset-e-0 hidden items-center pe-8 lg:flex xl:pe-16" aria-hidden="true">
            <div className="relative flex items-end gap-3" style={{ willChange: 'transform' }}>
              {heroVideos.map((v, i) => (
                <div
                  key={v.label}
                  className="relative shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-2xl"
                  style={{
                    width: 140,
                    /* Each card is 8px taller than the previous, anchored at the bottom */
                    height: 200 + i * 32,
                    opacity: 0.55 + i * 0.15,
                  }}
                >
                  {/* Gradient shown while video loads / as overlay */}
                  <div className={`absolute inset-0 ${v.gradient}`} />
                  {/* Actual video — muted autoplay loop, no controls */}
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src={v.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                  />
                  {/* Label chip */}
                  <span className="absolute bottom-2 inset-x-0 flex justify-center">
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white/90">
                      {v.label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 hidden xl:block sm:bottom-5">
          <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-3 pb-1 sm:gap-3 sm:px-5 lg:px-8">
            {heroTracks.map((track, index) => (
              <div
                key={track}
                className={
                  index === 2
                    ? "min-w-55 rounded-2xl bg-white px-4 py-3 shadow-lg"
                    : "min-w-55 rounded-2xl border border-white/20 bg-black/55 px-4 py-3"
                }
              >
                <p className={index === 2 ? "text-sm font-semibold text-foreground" : "text-sm font-semibold text-white"} dir="rtl">
                  {track}
                </p>
                <p
                  className={
                    index === 2
                      ? "mt-1 text-xs text-muted-foreground"
                      : "mt-1 text-xs text-white/70"
                  }
                  dir="rtl"
                >
                  مطابقة فورية بالذكاء الاصطناعي
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 2. METRICS STRIP ════════════ */}
      <section className="border-y border-border bg-background-subtle">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-border px-5 [direction:ltr] lg:grid-cols-4 lg:px-8">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center gap-1 px-4 py-8 text-center [direction:rtl]"
            >
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {m.value}
              </span>
              <span className="text-sm text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ 3. HOW IT WORKS ════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-24 lg:px-8">
          <SectionHeading
            eyebrow="كيف يعمل"
            title="ثلاث خطوات، لا أكثر"
            subtitle="من بريف غامض إلى فيديو جاهز — صُمّمت كل خطوة لتوفّر وقتك."
          />

          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex flex-col items-center text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-tint">
                    <Icon className="size-5 text-primary" strokeWidth={2} />
                  </span>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="font-tech text-sm font-bold text-emerald-strong">
                      {s.num}
                    </span>
                    <h3 className="text-lg font-bold text-foreground">
                      {s.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════ 4. FEATURED EDITORS ════════════ */}
      <section className="border-t border-border bg-background-subtle">
        <div className="mx-auto max-w-6xl px-5 py-24 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-md">
              <span className="font-tech text-xs font-semibold uppercase tracking-widest text-emerald-strong">
                أبرز المونتيرين
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                شو-ريل موثّق، جاهز الآن
              </h2>
            </div>
            <Link
              href="/freelancers"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-strong"
            >
              تصفّح الكل
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {editors.map((e) => (
              <EditorCard key={e.id} e={e} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 5. WHY US ════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-24 lg:px-8">
          <SectionHeading
            eyebrow="لماذا مونتير"
            title="أسرع، وأكثر أماناً"
          />
          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-12">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col">
                <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-tint">
                  <Icon className="size-5 text-primary" strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ 6. CTA BAND ════════════ */}
      <section className="bg-white pb-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="rounded-3xl bg-emerald-tint px-6 py-16 text-center sm:px-12">
            <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              ابدأ أول مشروع مونتاج اليوم
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              بدون رسوم اشتراك · دفع عند الرضا فقط · ضمان استرداد الأموال.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                ابدأ مشروع
                <ArrowLeft className="size-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-8 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Film className="size-4 text-primary" />
                انضم كمونتير
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="size-4 text-primary" />
                مونتيرون موثّقون
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet className="size-4 text-primary" />
                مدفوعات محلية
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4 text-primary" />
                +٨٠٠ مونتير
              </span>
            </div>
          </div>
        </div>
      </section>
    </HomeLayout>
  );
}
