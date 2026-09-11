"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { StudioLogo } from "@/components/brand/studio-logo";
import { P, BG } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";

/** Shared sharp input styling. */
export const inputCls =
  "w-full border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#10B981]";

/* ════════════════════════ CHROME (top bar + progress + footer) ════════════════════════ */
export function OnboardingChrome({
  step,
  total,
  eyebrow,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "التالي",
  nextDisabled = false,
  busy = false,
  onSkip,
  exitHref = "/",
}: {
  step: number;
  total: number;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  onSkip?: () => void;
  exitHref?: string;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div dir="rtl" className="flex min-h-screen flex-col" style={{ background: BG.subtle }}>
      {/* top bar */}
      <header className="shrink-0 border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5 lg:px-8">
          <StudioLogo />
          <div className="flex items-center gap-4">
            <span className="font-tech text-xs font-semibold tabular-nums" style={{ color: P.muted }}>
              خطوة {toArabicDigits(step)} من {toArabicDigits(total)}
            </span>
            <Link
              href={exitHref}
              className="text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: P.muted }}
            >
              تخطّي الآن
            </Link>
          </div>
        </div>
        {/* progress */}
        <div className="h-1 w-full" style={{ background: P.subtle }}>
          <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: P.primary }} />
        </div>
      </header>

      {/* content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 lg:px-8 lg:py-14">
        <div className="mb-8">
          <p className="font-tech text-xs font-semibold uppercase tracking-widest" style={{ color: P.primaryText }}>
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: P.text }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm" style={{ color: P.muted }}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex-1">{children}</div>

        {/* footer nav */}
        <div className="mt-10 flex items-center justify-between gap-3 border-t pt-6" style={{ borderColor: P.border }}>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors hover:bg-black/5 disabled:opacity-50"
              style={{ border: `1px solid ${P.border}`, color: P.text }}
            >
              <ArrowRight className="size-4" />
              السابق
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={busy}
                className="text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
                style={{ color: P.muted }}
              >
                تخطّي هذه الخطوة
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || busy}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: P.primary, color: "#fff" }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {nextLabel}
              {!busy && <ArrowLeft className="size-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════ FIELD ════════════════════════ */
export function Field({
  label,
  children,
  hint,
  optional,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: P.text }}>
        {label}
        {optional && (
          <span className="text-xs font-normal" style={{ color: P.muted }}>
            (اختياري)
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="text-xs" style={{ color: P.muted }}>
          {hint}
        </span>
      )}
    </label>
  );
}

/* ════════════════════════ OPTION GRID (selectable cards) ════════════════════════ */
export interface OptionItem {
  value: string;
  label: string;
  desc?: string;
  icon?: React.ElementType;
}
export function OptionGrid({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: OptionItem[];
  value: string;
  onChange: (v: string) => void;
  cols?: 1 | 2;
}) {
  const colCls = cols === 1 ? "" : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 gap-3 ${colCls}`}>
      {options.map((o) => {
        const on = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex items-start gap-3 p-4 text-start transition-colors"
            style={{
              background: on ? `${P.primary}0D` : BG.main,
              border: `1px solid ${on ? P.primary : P.border}`,
              boxShadow: on ? `inset 0 0 0 1px ${P.primary}` : "none",
            }}
          >
            {Icon && (
              <span
                className="grid size-9 shrink-0 place-items-center"
                style={{ background: on ? `${P.primary}1A` : P.subtle, color: on ? P.primary : P.muted }}
              >
                <Icon className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold" style={{ color: P.text }}>
                  {o.label}
                </span>
                {on && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ background: P.primary }}>
                    <Check className="size-3.5 text-white" />
                  </span>
                )}
              </span>
              {o.desc && (
                <span className="mt-1 block text-xs leading-relaxed" style={{ color: P.muted }}>
                  {o.desc}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════ CHIP INPUT ════════════════════════ */
export function ChipInput({
  items,
  onChange,
  placeholder,
  accent = P.primary,
  suggestions = [],
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  accent?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  function commit(val?: string) {
    const v = (val ?? draft).trim();
    if (!v || items.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  }
  const remaining = suggestions.filter((s) => !items.includes(s));
  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {items.map((it) => (
            <span
              key={it}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium"
              style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}30` }}
            >
              {it}
              <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`حذف ${it}`} className="transition-opacity hover:opacity-60">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => commit()}
          className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          <Plus className="size-4" />
          إضافة
        </button>
      </div>
      {remaining.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {remaining.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs transition-colors hover:bg-black/5"
              style={{ border: `1px dashed ${P.border}`, color: P.muted }}
            >
              <Plus className="size-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════ TOGGLE ════════════════════════ */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: on ? P.green : P.subtle }}
    >
      <span
        className="absolute top-1 size-5 rounded-full bg-white shadow transition-all"
        style={{ insetInlineStart: on ? "1.5rem" : "0.25rem" }}
      />
    </button>
  );
}

/* ════════════════════════ AVATAR UPLOAD ════════════════════════ */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

async function uploadAvatarFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const json = await res.json();
  return json?.data?.url as string;
}

export function AvatarUpload({
  value,
  onChange,
  fallback = "؟",
  color = P.primary,
}: {
  value: string;
  onChange: (url: string) => void;
  fallback?: string;
  color?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadAvatarFile(file);
      onChange(url);
    } catch {
      // Fallback to a local preview so the user isn't blocked
      onChange(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full"
        style={{ background: `${color}1A`, color }}
        aria-label="رفع صورة"
      >
        {uploading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-2xl font-bold">{fallback}</span>
        )}
      </button>
      <div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-black/5 disabled:opacity-60"
          style={{ border: `1px solid ${P.border}`, color: P.text }}
        >
          <ImagePlus className="size-4" />
          {uploading ? "جارٍ الرفع…" : value ? "تغيير الصورة" : "رفع صورة"}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="ms-2 text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: P.muted }}
          >
            إزالة
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ════════════════════════ IMAGES FIELD ════════════════════════ */
export function ImagesField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function add(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files).filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f));
    if (urls.length) onChange([...images, ...urls]);
  }
  return (
    <div>
      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <div key={i} className="group relative aspect-[4/3] overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                aria-label="حذف الصورة"
                className="absolute end-1 top-1 grid size-6 place-items-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "rgba(15,23,42,0.7)" }}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 px-4 py-6 text-sm transition-colors hover:bg-black/[0.02]"
        style={{ border: `1px dashed ${P.border}`, color: P.muted }}
      >
        <ImagePlus className="size-6" style={{ color: P.primary }} />
        <span>اضغط لرفع الصور — يمكن اختيار أكثر من صورة</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
