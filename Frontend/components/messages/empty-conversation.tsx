"use client";

import { P } from "@/lib/design-tokens";
import { MessageSquare } from "lucide-react";

export function EmptyConversation() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span
        className="grid size-14 place-items-center rounded-full"
        style={{ background: `${P.primary}14`, color: P.primary }}
      >
        <MessageSquare className="size-7" />
      </span>
      <p className="tracking-tight text-lg font-bold" style={{ color: P.text }}>
        اختر محادثة
      </p>
      <p className="max-w-xs text-sm" style={{ color: P.muted }}>
        اختر محادثة من القائمة لعرض الرسائل والرد على الطرف الآخر.
      </p>
    </div>
  );
}
