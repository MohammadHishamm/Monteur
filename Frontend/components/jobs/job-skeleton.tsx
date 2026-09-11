import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { BG, P } from "@/lib/design-tokens";

/** Loading placeholder shown while the job query is pending. */
export function JobSkeleton() {
  return (
    <MarketingLayout>
      <div className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl px-5 py-3.5 lg:px-8">
          <div className="h-4 w-40 animate-pulse rounded" style={{ background: P.subtle }} />
        </div>
      </div>
      <section className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto max-w-6xl space-y-4 px-5 pt-12 pb-14 lg:px-8">
          <div className="h-6 w-32 animate-pulse rounded-full" style={{ background: P.subtle }} />
          <div className="h-10 w-3/4 animate-pulse rounded" style={{ background: P.subtle }} />
          <div className="h-4 w-2/3 animate-pulse rounded" style={{ background: P.subtle }} />
        </div>
      </section>
      <div className="border-b" style={{ background: BG.main, borderColor: P.border }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4" style={{ background: P.border }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: P.subtle }} />
          ))}
        </div>
      </div>
      <section style={{ background: BG.main }}>
        <div className="mx-auto grid max-w-6xl gap-x-12 px-5 py-16 lg:grid-cols-[1fr_320px] lg:px-8">
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded" style={{ background: P.subtle }} />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded" style={{ background: P.subtle }} />
        </div>
      </section>
    </MarketingLayout>
  );
}
