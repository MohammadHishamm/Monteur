import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
  /** mark size in px */
  size?: number;
  tone?: "default" | "invert";
}

/** 8-point-star brand mark (no emoji) — the Hiraya glyph. */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <g stroke="var(--primary-foreground)" strokeWidth="1.4" fill="none">
        <rect x="9" y="9" width="14" height="14" rx="1.5" />
        <rect
          x="9"
          y="9"
          width="14"
          height="14"
          rx="1.5"
          transform="rotate(45 16 16)"
        />
      </g>
      <circle cx="16" cy="16" r="2" fill="var(--gold)" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  showWordmark = true,
  size = 28,
  tone = "default",
}: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={cn(
            "text-[1.35rem] leading-none",
            tone === "invert" ? "text-white" : "text-foreground"
          )}
          style={{ fontWeight: 700 }}
        >
          شغلني
        </span>
      )}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}
