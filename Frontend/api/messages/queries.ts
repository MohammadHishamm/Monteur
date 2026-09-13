import type {
    ChatMessage,
    ConversationDetail,
    ConversationSummary,
} from "@/components/messages/types"
import { axios } from "@/lib/api/axios"
import { mapSession } from "@/lib/auth/session"
import type {
    ApiEnvelopeDto,
    ApiMetaEnvelopeDto,
    RawConversationDto,
    RawMessageDto,
} from "~/types/message"

function toISO(input: unknown): string {
  if (typeof input !== "string" || !input) return new Date().toISOString()
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function formatClockAr(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRelativeAr(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return formatClockAr(iso)
  }

  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
  })
}

async function getMyID(): Promise<string> {
  const res = await axios.get("/auth/session")
  return mapSession(res.data).userId
}

function pickOtherParticipant(conversation: RawConversationDto, myID: string) {
  const participants = Array.isArray(conversation.participants) ? conversation.participants : []
  const other = participants.find((p) => (p.user_id ?? "") !== myID) ?? participants[0]

  const role = other?.role === "freelancer" ? "فريلانسر" : "عميل"
  const name = other?.user_name?.trim() || "مستخدم"

  return {
    id: other?.user_id ?? "",
    name,
    role,
    color: "#10B981",
    // Served through the /uploads proxy, so the raw backend path works as-is.
    avatar: other?.user_avatar || undefined,
    online: false,
    freelancerId: other?.role === "freelancer" ? other?.user_id : undefined,
  }
}

function mapChatMessage(raw: RawMessageDto, myID: string): ChatMessage {
  const sentAtISO = toISO(raw.sent_at)
  return {
    id: raw.id ?? `${Date.now()}`,
    sender: (raw.sender_user_id ?? "") === myID ? "me" : "them",
    text: raw.body ?? "",
    time: formatClockAr(sentAtISO),
  }
}

function mapConversationSummary(raw: RawConversationDto, myID: string): ConversationSummary {
  const lastAt = toISO(raw.last_message_at)
  const participant = pickOtherParticipant(raw, myID)

  return {
    id: raw.id ?? "",
    participant,
    context: {
      label: raw.subject?.trim() || "محادثة مباشرة",
      jobId: raw.job_id,
    },
    lastMessage: "افتح المحادثة لعرض آخر الرسائل",
    lastTime: formatRelativeAr(lastAt),
    unread: typeof raw.unread === "number" ? raw.unread : 0,
  }
}

/** List the logged-in user's conversations (newest first). */
export async function getConversations(): Promise<ConversationSummary[]> {
  const [myID, res] = await Promise.all([
    getMyID(),
    axios.get<ApiEnvelopeDto<RawConversationDto[]>>("/conversations"),
  ])

  const rows = Array.isArray(res.data?.data) ? res.data.data : []
  return rows
    .map((row) => mapConversationSummary(row, myID))
    .filter((row) => row.id)
}

/** Full thread for one conversation, or null if not found. */
export async function getConversation(id: string): Promise<ConversationDetail | null> {
  try {
    const [myID, convRes, messagesRes] = await Promise.all([
      getMyID(),
      axios.get<ApiEnvelopeDto<RawConversationDto>>(`/conversations/${id}`),
      axios.get<ApiMetaEnvelopeDto<RawMessageDto[]>>(`/conversations/${id}/messages`, {
        params: { limit: 50 },
      }),
    ])

    const convRaw = convRes.data?.data
    if (!convRaw?.id) return null

    const messagesRaw = Array.isArray(messagesRes.data?.data) ? messagesRes.data?.data : []
    const messages = messagesRaw.map((m) => mapChatMessage(m, myID))
    const summary = mapConversationSummary(convRaw, myID)

    if (messages.length > 0) {
      const latest = messages[messages.length - 1]
      summary.lastMessage = latest.text
      summary.lastTime = latest.time
    }

    return {
      ...summary,
      messages,
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("404")) return null
    throw err
  }
}

export type { RawMessageDto as RawMessage }
