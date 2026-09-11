"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Send, MessageSquare, User } from "lucide-react"
import {
  getAdminSupportConversationsOptions,
  getAdminSupportMessagesOptions,
} from "~/api/admin/queries"
import { useAdminReplySupportMessage } from "~/api/admin/mutations"
import { P, BG } from "~/lib/design-tokens"
import type { AdminSupportMessage } from "~/types/admin"

export default function AdminSupportPage() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data: convData, isPending: convLoading } = useQuery(
    getAdminSupportConversationsOptions(),
  )
  const conversations = convData?.data ?? []

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  return (
    <div className="flex h-full" style={{ background: BG.subtle }}>
      {/* conversation list — left panel in RTL layout means it's on the visual left */}
      <aside
        className="flex w-72 shrink-0 flex-col border-e"
        style={{ background: "#fff", borderColor: P.border }}
      >
        <div className="border-b px-4 py-3.5" style={{ borderColor: P.border }}>
          <h2 className="font-bold" style={{ color: P.text }}>
            دعم العملاء
          </h2>
          <p className="text-xs mt-0.5" style={{ color: P.muted }}>
            {conversations.filter((c) => c.status === "open").length} تذكرة مفتوحة
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <ConvListSkeleton />
          ) : conversations.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm" style={{ color: P.muted }}>
              لا توجد تذاكر دعم.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveId(conv.id)}
                className="flex w-full items-start gap-3 border-b p-3.5 text-start transition-colors hover:bg-[#fafafa]"
                style={{
                  borderColor: P.border,
                  background: activeId === conv.id ? `${P.primary}08` : "transparent",
                  boxShadow: activeId === conv.id ? `inset -3px 0 0 ${P.primary}` : "none",
                }}
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full"
                  style={{ background: `${P.primary}14`, color: P.primary }}
                >
                  <User className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold" style={{ color: P.text }}>
                      {conv.user_name}
                    </span>
                    {conv.unread > 0 && (
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: P.primary }}
                      >
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-0.5 truncate text-xs"
                    style={{
                      color: conv.unread > 0 ? P.text : P.muted,
                      fontWeight: conv.unread > 0 ? 600 : 400,
                    }}
                  >
                    {conv.last_message}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: P.muted }}>
                      {new Date(conv.last_message_at).toLocaleDateString("ar-EG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: conv.status === "open" ? "#10b981" : P.muted }}
                    >
                      {conv.status === "open" ? "مفتوحة" : "مغلقة"}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* chat area */}
      <section className="flex min-w-0 flex-1 flex-col">
        {activeId ? (
          <ChatArea conversationId={activeId} />
        ) : (
          <EmptyChat />
        )}
      </section>
    </div>
  )
}

/* ─── Chat Area ─── */
function ChatArea({ conversationId }: { conversationId: string }) {
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const replyMutation = useAdminReplySupportMessage()
  const [localMessages, setLocalMessages] = useState<AdminSupportMessage[]>([])

  const { data, isPending } = useQuery(
    getAdminSupportMessagesOptions(conversationId),
  )

  useEffect(() => {
    setLocalMessages(data?.data ?? [])
  }, [data?.data])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [localMessages.length])

  async function send() {
    const text = draft.trim()
    if (!text || replyMutation.isPending) return
    setDraft("")
    const optimistic: AdminSupportMessage = {
      id: `opt-${Date.now()}`,
      sender: "admin",
      text,
      sent_at: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, optimistic])
    try {
      await replyMutation.mutateAsync({ conversationId, text })
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(text)
    }
  }

  return (
    <>
      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {isPending ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm" style={{ color: P.muted }}>جارٍ التحميل…</span>
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm" style={{ color: P.muted }}>لا توجد رسائل بعد.</span>
          </div>
        ) : (
          localMessages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      {/* send error */}
      {replyMutation.isError && (
        <div className="shrink-0 border-t px-4 py-2" style={{ borderColor: P.border }}>
          <p className="text-xs text-red-500">تعذّر إرسال الرسالة. حاول مجدداً.</p>
        </div>
      )}

      {/* composer */}
      <div
        className="flex shrink-0 items-end gap-2 border-t p-3"
        style={{ borderColor: P.border, background: "#fff" }}
      >
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="اكتب ردّاً على المستخدم…"
          className="max-h-32 min-h-[44px] flex-1 resize-none border bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#10B981]"
          style={{ borderColor: P.border, color: P.text }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim() || replyMutation.isPending}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: P.primary }}
          aria-label="إرسال"
        >
          <Send className="size-5 -scale-x-100" />
        </button>
      </div>
    </>
  )
}

/* ─── Message Bubble ─── */
function Bubble({ message: m }: { message: AdminSupportMessage }) {
  const isAdmin = m.sender === "admin"
  return (
    <div className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[78%]">
        <div
          className="px-3.5 py-2.5 text-sm leading-relaxed"
          style={
            isAdmin
              ? { background: P.primary, color: "#fff" }
              : { background: "#fff", color: P.text, border: `1px solid ${P.border}` }
          }
        >
          {m.text}
        </div>
        <p
          className={`mt-1 text-[10px] ${isAdmin ? "text-start" : "text-end"}`}
          style={{ color: P.muted }}
        >
          {isAdmin ? "الإدارة · " : ""}
          {new Date(m.sent_at).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}

function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <span
        className="grid size-14 place-items-center rounded-full"
        style={{ background: `${P.primary}14`, color: P.primary }}
      >
        <MessageSquare className="size-7" />
      </span>
      <p className="text-lg font-bold tracking-tight" style={{ color: P.text }}>
        اختر محادثة
      </p>
      <p className="max-w-xs text-sm" style={{ color: P.muted }}>
        اختر تذكرة دعم من القائمة للرد على المستخدم.
      </p>
    </div>
  )
}

function ConvListSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b p-3.5" style={{ borderColor: P.border }}>
          <div className="size-9 rounded-full" style={{ background: P.border }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded" style={{ background: P.border }} />
            <div className="h-2.5 w-40 rounded" style={{ background: P.border }} />
          </div>
        </div>
      ))}
    </div>
  )
}
