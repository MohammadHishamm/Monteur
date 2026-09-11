import { STEPS } from "@/components/post-job/config";
import { P } from "@/lib/design-tokens";
import { CheckCircle2 } from "lucide-react";

export function PostJobStepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;
        return (
          <li key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className="flex size-10 items-center justify-center rounded-xl transition-colors"
                style={
                  active
                    ? { background: P.primary, color: "#fff" }
                    : done
                      ? { background: `${P.green}14`, color: P.green, border: `1px solid ${P.green}33` }
                      : { background: "#fff", color: P.muted, border: `1px solid ${P.border}` }
                }
              >
                {done ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
              </span>
              <span
                className="hidden text-xs font-semibold sm:block"
                style={{ color: active ? P.text : P.muted }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="mx-2 mb-6 h-px flex-1 sm:mb-7"
                style={{ background: i < step ? P.green : P.border }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
