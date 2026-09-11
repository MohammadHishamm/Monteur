import { P } from "@/lib/design-tokens";
import React from "react";

/** Editorial section block used down the job-detail main column. */
export function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-b py-12 first:border-t-0 lg:py-16" style={{ borderColor: P.border }}>
      <h2 className="mb-7 text-2xl font-bold tracking-tight lg:text-3xl" style={{ color: P.text }}>
        {label}
      </h2>
      {children}
    </section>
  );
}
