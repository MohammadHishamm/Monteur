"use client";

import { P } from "@/lib/design-tokens";

export function ListSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b p-3.5" style={{ borderColor: P.border }}>
          <div className="size-11 rounded-full" style={{ background: P.subtle }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24" style={{ background: P.subtle }} />
            <div className="h-3 w-40" style={{ background: P.subtle }} />
          </div>
        </div>
      ))}
    </div>
  );
}
