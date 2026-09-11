import type { ChatMessage, SendMessageInput, SendMessageResult } from "@/components/messages/types"
import { axios } from "@/lib/api/axios"
import { mapSession } from "@/lib/auth/session"
import type { ApiEnvelopeDto, RawMessageDto } from "~/types/message"

async function getMyID(): Promise<string> {
  const res = await axios.get("/auth/session")
  return mapSession(res.data).userId
}

function toISO(input: unknown): string {
  if (typeof input !== "string" || !input) return new Date().toISOString()
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function mapChatMessage(raw: RawMessageDto, myID: string): ChatMessage {
  const sentAtISO = toISO(raw.sent_at)
  return {
    id: raw.id ?? `${Date.now()}`,
    sender: (raw.sender_user_id ?? "") === myID ? "me" : "them",
    text: raw.body ?? "",
    time: new Date(sentAtISO).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

/** Send a message in a conversation. Returns the persisted message. */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const [myID, res] = await Promise.all([
    getMyID(),
    axios.post<ApiEnvelopeDto<RawMessageDto>>(
      `/conversations/${input.conversationId}/messages`,
      { body: input.text },
    ),
  ])

  const raw = res.data?.data ?? {
    id: `${Date.now()}`,
    sender_user_id: myID,
    body: input.text,
    sent_at: new Date().toISOString(),
  }

  return {
    ok: true,
    message: mapChatMessage(raw, myID),
  }
}
