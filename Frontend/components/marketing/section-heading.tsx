import React from "react";
import { P } from "@/lib/design-tokens";

/** Tech uppercase eyebrow pill — tinted to the given accent color. */
export function SectionLabel({
  color = P.primaryText,
  children,
}: {
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
      style={{ border: `1px solid ${color}40`, background: `${color}10` }}
    >
      <span
        className="font-tech text-xs font-semibold uppercase tracking-widest"
        style={{ color }}
      >
        {children}
      </span>
    </div>
  );
}

/** Standard section header: eyebrow pill → bold tracking-tight h2 → muted subtitle. */
export function SectionHeading({
  eyebrow,
  eyebrowColor = P.primaryText,
  title,
  subtitle,
  align = "center",
  className = "",
}: {
  eyebrow: string;
  eyebrowColor?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: "center" | "start";
  className?: string;
}) {
  const alignment =
    align === "center" ? "text-center items-center" : "text-start items-start";
  return (
    <div className={`mb-14 flex flex-col ${alignment} ${className}`}>
      <SectionLabel color={eyebrowColor}>{eyebrow}</SectionLabel>
      <h2
        className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.6rem]"
        style={{ color: P.text }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-3 max-w-lg text-base leading-relaxed ${
            align === "center" ? "mx-auto" : ""
          }`}
          style={{ color: P.muted }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
