"use client";

import { getNavbarSession } from "@/api/auth/queries";
import { StudioLogo } from "@/components/brand/studio-logo";
import { Conversation } from "@/components/messages/conversation";
import { EmptyConversation } from "@/components/messages/empty-conversation";
import { ListSkeleton } from "@/components/messages/list-skeleton";
import { ThreadRow } from "@/components/messages/thread-row";
import type {
    ChatMessage,
    ConversationDetail,
    ConversationSummary,
} from "@/components/messages/types";
import { BG, P } from "@/lib/design-tokens";
import { subscribeRealtimeNotifications } from "@/lib/socket/realtime";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
    getConversation,
    getConversations,
    type RawMessage,
} from "~/api/messages/queries";

function mapIncomingMessage(raw: RawMessage, myID: string): ChatMessage {
  const sentAt = raw.sent_at ? new Date(raw.sent_at) : new Date();
  return {
    id: raw.id ?? `${Date.now()}`,
    sender: raw.sender_user_id === myID ? "me" : "them",
    text: raw.body ?? "",
    time: sentAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [myUserID, setMyUserID] = useState("");

  // derived — true while the open thread doesn't yet match the selected id
  const threadReady = !!active && active.id === activeId;

  // initial load
  useEffect(() => {
    let ignore = false;
    getConversations().then((cs) => {
      if (ignore) return;
      setList(cs);
      setLoadingList(false);
      const requested = searchParams.get("c");
      const preferred = requested && cs.some((item) => item.id === requested) ? requested : null;
      if (preferred) {
        setActiveId(preferred);
      } else if (cs.length) {
        setActiveId((cur) => cur ?? cs[0].id);
      }
    });
    return () => {
      ignore = true;
    };
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    void (async () => {
      try {
        const session = await getNavbarSession();
        if (ignore) return;
        const uid = session.userId ?? "";
        if (uid) setMyUserID(uid);
      } catch {
        // Keep myUserID empty when session cannot be resolved.
        // This prevents websocket connections with stale user_id cookies.
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!myUserID) return;

    return subscribeRealtimeNotifications(myUserID, (payload) => {
      if (payload.type !== "new_message" || !payload.notification || typeof payload.notification !== "object") {
        return;
      }

      const incoming = payload.notification as RawMessage;
      const conversationID = incoming.conversation_id;
      if (!conversationID) return;

      const mapped = mapIncomingMessage(incoming, myUserID);
      if (mapped.sender === "me") return;

      setList((prev) =>
        prev.map((item) => {
          if (item.id !== conversationID) return item;
          return {
            ...item,
            lastMessage: mapped.text,
            lastTime: mapped.time,
            unread: activeId === conversationID ? 0 : item.unread + 1,
          };
        }),
      );

      setActive((prev) => {
        if (!prev || prev.id !== conversationID) return prev;
        if (prev.messages.some((m) => m.id === mapped.id)) return prev;
        return { ...prev, messages: [...prev.messages, mapped] };
      });
    });
  }, [activeId, myUserID]);

  // load thread when active changes
  useEffect(() => {
    if (!activeId) return;
    let ignore = false;
    getConversation(activeId).then((c) => {
      if (ignore) return;
      setActive(c);
      // mark read locally once the thread is open
      setList((prev) =>
        prev.map((x) => (x.id === activeId ? { ...x, unread: 0 } : x)),
      );
    });
    return () => {
      ignore = true;
    };
  }, [activeId]);

  function handleSent(message: ChatMessage) {
    setActive((prev) =>
      prev ? { ...prev, messages: [...prev.messages, message] } : prev,
    );
    setList((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, lastMessage: message.text, lastTime: message.time }
          : c,
      ),
    );
  }

  const filtered = list.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.participant.name.toLowerCase().includes(q) ||
      c.context.label.toLowerCase().includes(q)
    );
  });

  return (
    <div dir="rtl" className="flex h-screen flex-col" style={{ background: BG.subtle }}>
      {/* top bar */}
      <header
        className="z-40 shrink-0 border-b"
        style={{ background: BG.main, borderColor: P.border }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <StudioLogo />
            <Link
              href="/dashboard/freelancer"
              className="hidden items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70 sm:inline-flex"
              style={{ color: P.muted }}
            >
              <ArrowRight className="size-4" />
              لوحة التحكم
            </Link>
          </div>
          <h1 className="tracking-tight text-lg font-bold" style={{ color: P.text }}>
            الرسائل
          </h1>
        </div>
      </header>

      {/* chat shell */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden lg:px-8 lg:py-6">
        <div
          className="flex h-full w-full overflow-hidden"
          style={{ border: `1px solid ${P.border}`, background: BG.main }}
        >
          {/* ── thread list ── */}
          <aside
            className={`${activeId ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-e lg:w-[340px]`}
            style={{ borderColor: P.border }}
          >
            <div className="shrink-0 border-b p-3" style={{ borderColor: P.border }}>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4"
                  style={{ color: P.muted }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في المحادثات"
                  className="w-full border bg-white py-2.5 ps-9 pe-3 text-sm outline-none transition-colors focus:border-[#10B981]"
                  style={{ borderColor: P.border, color: P.text }}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList ? (
                <ListSkeleton />
              ) : filtered.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm" style={{ color: P.muted }}>
                  لا توجد محادثات مطابقة.
                </p>
              ) : (
                filtered.map((c) => (
                  <ThreadRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    onClick={() => setActiveId(c.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* ── conversation ── */}
          <section
            className={`${activeId ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col`}
            style={{ background: BG.subtle }}
          >
            {!activeId ? (
              <EmptyConversation />
            ) : threadReady && active ? (
              <Conversation
                conv={active}
                onBack={() => setActiveId(null)}
                onSent={handleSent}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-sm" style={{ color: P.muted }}>
                  جارٍ التحميل…
                </span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
