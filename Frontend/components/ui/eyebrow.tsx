import React from "react";
import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  /** optional leading index e.g. "01" */
  index?: string;
  className?: string;
  tone?: "primary" | "clay" | "muted";
}

/** Mono uppercase label with a small geometric tick — the editorial eyebrow. */
export function Eyebrow({ children, index, className, tone = "primary" }: EyebrowProps) {
  const toneClass =
    tone === "clay" ? "text-clay" : tone === "muted" ? "text-muted-foreground" : "text-primary";

  return (
    <span className={cn("eyebrow inline-flex items-center gap-2.5", toneClass, className)}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="shrink-0">
        <rect x="0.5" y="0.5" width="7" height="7" fill="none" stroke="currentColor" />
        <rect
          x="0.5"
          y="0.5"
          width="7"
          height="7"
          fill="none"
          stroke="currentColor"
          transform="rotate(45 4 4)"
        />
      </svg>
      {index && <span className="opacity-60">{index}</span>}
      <span>{children}</span>
    </span>
  );
}
