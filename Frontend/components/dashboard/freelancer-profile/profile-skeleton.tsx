import { BG, P } from "@/lib/design-tokens";

export function ProfileEditorSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 space-y-3">
        <div className="h-4 w-24" style={{ background: P.subtle }} />
        <div className="h-9 w-80" style={{ background: P.subtle }} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="hidden h-72 lg:block" style={{ background: BG.main, border: `1px solid ${P.border}` }} />
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48" style={{ background: BG.main, border: `1px solid ${P.border}` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
