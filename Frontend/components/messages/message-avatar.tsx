"use client";

import type { ConversationSummary } from "@/components/messages/types";
import { BG, P } from "@/lib/design-tokens";
import { User } from "lucide-react";

export function MessageAvatar({
  participant: p,
}: {
  participant: ConversationSummary["participant"];
}) {
  const initial = p.name.trim()[0]?.toUpperCase();

  return (
    <div className="relative shrink-0">
      {p.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.avatar}
          alt={p.name}
          className="size-11 rounded-full object-cover"
          style={{ border: `1px solid ${P.border}` }}
        />
      ) : (
        <span
          className="grid size-11 place-items-center rounded-full text-sm font-bold"
          style={{ background: `${P.primary}1A`, color: P.primary }}
        >
          {initial ?? <User className="size-5" />}
        </span>
      )}
      {p.online && (
        <span
          className="absolute bottom-0 end-0 size-3 rounded-full border-2"
          style={{ background: P.green, borderColor: BG.main }}
        />
      )}
    </div>
  );
}
