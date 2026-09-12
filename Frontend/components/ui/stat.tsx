import React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/** Editorial stat tile — big display numeral, mono label, hairline frame. */
export function Stat({ label, value, sub, icon, className }: StatProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="font-display text-3xl leading-none tracking-tight text-foreground">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
