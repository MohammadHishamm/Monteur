"use client";

import { MessageAvatar } from "@/components/messages/message-avatar";
import { MessageBubble } from "@/components/messages/message-bubble";
import type { ChatMessage, ConversationDetail } from "@/components/messages/types";
import { TierBadge } from "@/components/ui/tier-badge";
import { BG, P } from "@/lib/design-tokens";
import { ArrowLeft, ArrowRight, Briefcase, Paperclip, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendMessage } from "~/api/messages/mutations";

export function Conversation({
  conv,
  onBack,
  onSent,
}: {
  conv: ConversationDetail;
  onBack: () => void;
  onSent: (m: ChatMessage) => void;
}) {
  const p = conv.participant;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto-scroll to newest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conv.id, conv.messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    setDraft("");
    try {
      const res = await sendMessage({ conversationId: conv.id, text });
      if (res.ok) onSent(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message.replace(/^\d+:\s*/, "")
        : "تعذّر إرسال الرسالة. حاول مجدداً.";
      setSendError(msg);
      setDraft(text); // restore draft so user doesn't lose the message
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* header */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: P.border, background: BG.main }}
      >
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center transition-colors hover:bg-black/5 lg:hidden"
          style={{ color: P.muted }}
          aria-label="رجوع"
        >
          <ArrowRight className="size-5" />
        </button>
        <MessageAvatar participant={p} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold" style={{ color: P.text }}>
              {p.name}
            </span>
            {p.tier && <TierBadge tier={p.tier} size="sm" />}
          </div>
          <span className="text-xs" style={{ color: p.online ? P.green : P.muted }}>
            {p.online ? "متصل الآن" : p.role}
          </span>
        </div>
        {p.freelancerId && (
          <Link
            href={`/video-editors/${p.freelancerId}`}
            className="hidden h-9 items-center rounded-xl px-3 text-xs font-semibold transition-colors hover:bg-black/5 sm:inline-flex"
            style={{ border: `1px solid ${P.border}`, color: P.text }}
          >
            عرض الملف
          </Link>
        )}
      </div>

      {/* context strip */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: P.border, background: `${P.primary}08` }}
      >
        <Briefcase className="size-3.5 shrink-0" style={{ color: P.primary }} />
        <span className="truncate text-xs" style={{ color: P.muted }}>
          بخصوص: <span className="font-semibold" style={{ color: P.text }}>{conv.context.label}</span>
        </span>
        {conv.context.jobId && (
          <Link
            href={`/video-jobs/${conv.context.jobId}`}
            className="ms-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
            style={{ color: P.primaryText }}
          >
            الوظيفة
            <ArrowLeft className="size-3.5" />
          </Link>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {conv.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      {/* send error */}
      {sendError && (
        <div className="shrink-0 border-t px-4 py-2" style={{ borderColor: P.border }}>
          <p className="text-xs text-red-500">{sendError}</p>
        </div>
      )}

      {/* composer */}
      <div
        className="flex shrink-0 items-end gap-2 border-t p-3"
        style={{ borderColor: P.border, background: BG.main }}
      >
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center transition-colors hover:bg-black/5"
          style={{ color: P.muted, border: `1px solid ${P.border}` }}
          aria-label="إرفاق ملف"
        >
          <Paperclip className="size-5" />
        </button>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="اكتب رسالة…"
          className="max-h-32 min-h-[44px] flex-1 resize-none border bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#10B981]"
          style={{ borderColor: P.border, color: P.text }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || sending}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: P.primary }}
          aria-label="إرسال"
        >
          <Send className="size-5 -scale-x-100" />
        </button>
      </div>
    </>
  );
}
