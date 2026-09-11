"use client";

import type { ConversationSummary } from "@/components/messages/types";
import { BG, P } from "@/lib/design-tokens";
import { User } from "lucide-react";

export function MessageAvatar({
  participant: p,
}: {
  participant: ConversationSummary["participant"];
}) {
  return (
    <div className="relative shrink-0">
      <span
        className="grid size-11 place-items-center rounded-full"
        style={{ background: `${P.primary}1A`, color: P.primary }}
      >
        <User className="size-5" />
      </span>
      {p.online && (
        <span
          className="absolute bottom-0 end-0 size-3 rounded-full border-2"
          style={{ background: P.green, borderColor: BG.main }}
        />
      )}
    </div>
  );
}
