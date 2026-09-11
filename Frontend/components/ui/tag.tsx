import React from "react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "primary" | "clay";
  size?: "sm" | "md";
}

/** Quiet skill/category chip — hairline, warm, no gradient. */
export function Tag({ children, className, tone = "default", size = "md" }: TagProps) {
  const tones = {
    default: "border-border bg-sand text-muted-foreground",
    primary: "border-primary/25 bg-primary/8 text-primary",
    clay: "border-clay/25 bg-clay/8 text-clay",
  };
  const sizes = {
    sm: "h-5 px-2 text-[11px]",
    md: "h-6 px-2.5 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium whitespace-nowrap",
        tones[tone],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
