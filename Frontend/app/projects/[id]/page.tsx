"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ArrowRight, ExternalLink, ImageIcon, Play, X } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { SectionLabel } from "@/components/marketing/section-heading";
import {
  CATEGORY_LABELS,
  type ProjectDetail,
  type ProjectImage,
} from "@/components/freelancers/types";
import { getProjectById } from "@/lib/api/projects";
import { P, BG } from "@/lib/design-tokens";

export default function ProjectCaseStudyPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [lightbox, setLightbox] = useState<ProjectImage | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getProjectById(id).then((p) => {
      if (ignore) return;
      if (!p) setMissing(true);
      else setProject(p);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [id]);

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (missing) notFound();
  if (loading || !project) return <ProjectSkeleton />;

  const p = project;

  return (
    <MarketingLayout>
      {/* ════════════ BREADCRUMB ════════════ */}
      <div
        className="border-b"
        style={{ background: BG.main, borderColor: P.border }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3.5 text-sm lg:px-8">
          <Link
            href={`/freelancers/${p.freelancerId}`}
            className="inline-flex items-center gap-1.5 font-medium transition-colors hover:opacity-70"
            style={{ color: P.muted }}
          >
            <ArrowRight className="size-4" />
            العودة
          </Link>
        </div>
      </div>

      {/* ════════════ HERO (editorial, light) ════════════ */}
      <section
        className="border-b"
        style={{ background: BG.main, borderColor: P.border }}
      >
        <div className="mx-auto max-w-6xl px-5 pt-10 lg:px-8 lg:pt-14">
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel >
              {CATEGORY_LABELS[p.category]}
            </SectionLabel>
            {p.liveUrl && (
              <a
                href={p.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: P.primaryText }}
              >
                <ExternalLink className="size-4" />
                زيارة العمل
              </a>
            )}
          </div>
          <h1
            className="tracking-tight mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.9rem]"
            style={{ color: P.text }}
          >
            {p.title}
          </h1>
          <p
            className="mt-4 max-w-2xl text-lg leading-relaxed"
            style={{ color: P.muted }}
          >
            {p.summary}
          </p>
        </div>

        {/* cover image */}
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 lg:px-8 lg:pb-16">
          {p.cover ? (
            <img
              src={p.cover}
              alt={p.title}
              className="aspect-[16/9] w-full rounded-2xl object-cover"
              style={{ border: `1px solid ${P.border}` }}
            />
          ) : (
            <div
              className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-[#e4e7ec]"
              style={{ border: `1px solid ${P.border}` }}
            >
              <span
                className="grid size-16 place-items-center rounded-full shadow-md lg:size-20"
                style={{ background: P.primary }}
              >
                <Play className="size-6 translate-x-px fill-current text-white lg:size-7" />
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ════════════ FLUSH FACTS GRID (hairline gutters) ════════════ */}
      <div
        className="border-b"
        style={{ background: BG.main, borderColor: P.border }}
      >
        <div
          className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4"
          style={{ background: P.border }}
        >
          {[
            { label: "العميل", value: p.client },
            { label: "المجال", value: p.industry },
            { label: "السنة", value: p.year },
            { label: "المدة", value: p.duration },
          ].map((s) => (
            <div
              key={s.label}
              className="px-5 py-6 lg:px-7"
              style={{ background: BG.main }}
            >
              <p
                className="font-tech text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: P.muted }}
              >
                {s.label}
              </p>
              <p className="mt-2.5 text-base font-bold" style={{ color: P.text }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ BODY (single column, editorial) ════════════ */}
      <section style={{ background: BG.main }}>
        <div className="mx-auto max-w-6xl px-5 pb-8 lg:px-8 lg:pb-12">
          <Block label="وصف العمل">
            <p className="max-w-2xl text-base leading-loose" style={{ color: P.muted }}>
              {p.description}
            </p>
          </Block>

          <Block label="الأدوات المستخدمة">
            <div className="flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 text-sm font-medium"
                  style={{
                    border: `1px solid ${p.color}40`,
                    color: p.color,
                    background: `${p.color}0A`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </Block>

          {/* GALLERY — full width, square tiles, hairline gutters, click to enlarge */}
          <Block label="معرض العمل">
            <div
              className="grid grid-cols-2 gap-px"
              style={{ background: P.border }}
            >
              {p.gallery.map((img, i) => {
                // First image is always featured (full width). If the
                // remaining images are an odd count, the last one also spans
                // full width — so the 2-col grid always fills with no empty
                // cell, for any number of images.
                const wide =
                  i === 0 ||
                  (i === p.gallery.length - 1 && p.gallery.length % 2 === 0);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightbox(img)}
                    className={`group relative block ${wide ? "col-span-2" : ""}`}
                    style={{ background: BG.main }}
                    aria-label={`تكبير: ${img.caption ?? "صورة"}`}
                  >
                    <GalleryThumb img={img} wide={wide} />
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-0.5 scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                    style={{ background: img.color ?? p.color }}
                  />
                    {img.caption && (
                      <span
                        className="block px-4 py-3 text-start text-sm font-medium"
                        style={{ color: P.text }}
                      >
                        {img.caption}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Block>
        </div>
      </section>

      {/* ════════════ LIGHTBOX ════════════ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
          style={{ background: "rgba(15,23,42,0.82)" }}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="إغلاق"
            className="absolute end-4 top-4 inline-flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <X className="size-5" />
          </button>
          <figure className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {lightbox.url ? (
              <img
                src={lightbox.url}
                alt={lightbox.caption ?? ""}
                className="max-h-[80vh] w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-[#e4e7ec]">
                <ImageIcon className="size-20" style={{ color: P.muted }} strokeWidth={1.25} />
              </div>
            )}
            {lightbox.caption && (
              <figcaption className="mt-4 text-center text-sm text-white/80">
                {lightbox.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </MarketingLayout>
  );
}

/* ── gallery thumbnail (image or neutral placeholder) ── */
function GalleryThumb({
  img,
  wide,
}: {
  img: ProjectImage;
  wide: boolean;
}) {
  const height = wide ? "h-64 sm:h-80" : "h-52 sm:h-64";
  if (img.url) {
    return (
      <img
        src={img.url}
        alt={img.caption ?? ""}
        className={`w-full object-cover transition-opacity duration-300 group-hover:opacity-90 ${height}`}
      />
    );
  }
  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-[#e4e7ec] ${height}`}
    >
      <ImageIcon className="size-9" style={{ color: P.muted }} />
    </div>
  );
}

/* ── editorial block: Cairo title on a top hairline ── */
function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-b py-12 first:border-t-0 lg:py-16"
      style={{ borderColor: P.border }}
    >
      <h2
        className="tracking-tight mb-7 text-2xl font-bold lg:text-3xl"
        style={{ color: P.text }}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

/* ── loading skeleton ── */
function ProjectSkeleton() {
  return (
    <MarketingLayout>
      <div
        className="border-b"
        style={{ background: BG.main, borderColor: P.border }}
      >
        <div className="mx-auto max-w-6xl px-5 py-3.5 lg:px-8">
          <div
            className="h-4 w-24 animate-pulse"
            style={{ background: P.subtle }}
          />
        </div>
      </div>
      <section
        className="border-b"
        style={{ background: BG.main, borderColor: P.border }}
      >
        <div className="mx-auto max-w-6xl space-y-4 px-5 pt-12 lg:px-8">
          <div
            className="h-6 w-32 animate-pulse rounded-full"
            style={{ background: P.subtle }}
          />
          <div
            className="h-10 w-3/4 animate-pulse rounded"
            style={{ background: P.subtle }}
          />
          <div
            className="h-4 w-2/3 animate-pulse rounded"
            style={{ background: P.subtle }}
          />
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-10 lg:px-8">
          <div
            className="aspect-[16/9] w-full animate-pulse rounded-2xl"
            style={{ background: P.subtle }}
          />
        </div>
      </section>
      <section style={{ background: BG.main }}>
        <div className="mx-auto max-w-3xl space-y-10 px-5 py-16 lg:px-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse"
              style={{ background: P.subtle }}
            />
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
