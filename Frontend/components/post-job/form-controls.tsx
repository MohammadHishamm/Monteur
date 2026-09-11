import { P } from "@/lib/design-tokens";
import { ChevronDown } from "lucide-react";
import React from "react";

export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold" style={{ color: P.text }}>
          {label}
          {optional && (
            <span className="ms-2 text-xs font-normal" style={{ color: P.muted }}>
              (اختياري)
            </span>
          )}
        </label>
        {hint && (
          <span className="text-xs" style={{ color: P.muted }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export const inputBase =
  "h-12 w-full rounded-xl bg-white px-4 text-sm outline-none transition-colors focus:ring-2";

export function inputStyle(): React.CSSProperties {
  return {
    border: `1px solid ${P.border}`,
    color: P.text,
    // @ts-expect-error focus ring tint via css var
    "--tw-ring-color": `${P.primary}40`,
  };
}

export function Select({
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
        className="h-12 w-full cursor-pointer appearance-none rounded-xl bg-white ps-4 pe-10 text-sm font-medium outline-none transition-colors focus:ring-2"
        style={{
          border: `1px solid ${P.border}`,
          color: value ? P.text : P.muted,
          // @ts-expect-error focus ring tint
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
        className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2"
        style={{ color: P.muted }}
      />
    </div>
  );
}

export function StepIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="tracking-tight text-2xl font-bold" style={{ color: P.text }}>
        {title}
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: P.muted }}>
        {subtitle}
      </p>
    </div>
  );
}
