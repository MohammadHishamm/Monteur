"use client";

import type { ChatMessage } from "@/components/messages/types";
import { BG, P } from "@/lib/design-tokens";
import { FileText } from "lucide-react";

export function MessageBubble({ message: m }: { message: ChatMessage }) {
  const me = m.sender === "me";
  return (
    <div className={`flex ${me ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[78%]">
        <div
          className="px-3.5 py-2.5 text-sm leading-relaxed"
          style={
            me
              ? { background: P.primary, color: "#fff" }
              : { background: BG.main, color: P.text, border: `1px solid ${P.border}` }
          }
        >
          {m.attachment && (
            <div
              className="mb-2 flex items-center gap-2 px-2.5 py-2 text-xs"
              style={{
                background: me ? "rgba(255,255,255,0.15)" : BG.subtle,
                border: `1px solid ${me ? "rgba(255,255,255,0.2)" : P.border}`,
              }}
            >
              <FileText className="size-4 shrink-0" style={{ color: me ? "#fff" : P.primaryText }} />
              <span className="truncate" dir="ltr">{m.attachment.name}</span>
            </div>
          )}
          {m.text}
        </div>
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] ${me ? "justify-start" : "justify-end"}`}
          style={{ color: P.muted }}
        >
          {m.time}
        </div>
      </div>
    </div>
  );
}
