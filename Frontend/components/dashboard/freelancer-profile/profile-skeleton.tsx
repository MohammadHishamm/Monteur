import { BG, P } from "@/lib/design-tokens";

export function ProfileEditorSkeleton() {
  return (
    <div
      dir="rtl"
      className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48" style={{ background: BG.main, border: `1px solid ${P.border}` }} />
        ))}
      </div>
      <div className="order-first space-y-4 lg:order-none">
        <div className="h-20" style={{ background: BG.main, border: `1px solid ${P.border}` }} />
        <div className="hidden h-60 lg:block" style={{ background: BG.main, border: `1px solid ${P.border}` }} />
      </div>
    </div>
  );
}
