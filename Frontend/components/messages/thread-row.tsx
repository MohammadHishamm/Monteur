"use client";

import { MessageAvatar } from "@/components/messages/message-avatar";
import type { ConversationSummary } from "@/components/messages/types";
import { P } from "@/lib/design-tokens";
import { toArabicDigits } from "@/lib/format";
import { Briefcase } from "lucide-react";

export function ThreadRow({
  conv,
  active,
  onClick,
}: {
  conv: ConversationSummary;
  active: boolean;
  onClick: () => void;
}) {
  const p = conv.participant;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b p-3.5 text-start transition-colors hover:bg-black/[0.02]"
      style={{
        borderColor: P.border,
        background: active ? `${P.primary}0D` : "transparent",
        boxShadow: active ? `inset 3px 0 0 ${P.primary}` : "none",
      }}
    >
      <MessageAvatar participant={p} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold" style={{ color: P.text }}>
            {p.name}
          </span>
          <span className="shrink-0 text-[11px]" style={{ color: P.muted }}>
            {conv.lastTime}
          </span>
        </div>
        <p
          className="mt-1 truncate text-xs"
          style={{ color: conv.unread ? P.text : P.muted, fontWeight: conv.unread ? 600 : 400 }}
        >
          {conv.lastMessage}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-[11px]" style={{ color: P.muted }}>
            <Briefcase className="size-3 shrink-0" />
            <span className="truncate">{conv.context.label}</span>
          </span>
          {conv.unread > 0 && (
            <span
              className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: P.primary }}
            >
              {toArabicDigits(conv.unread)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
