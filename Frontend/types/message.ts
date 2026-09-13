import type { Tier } from "~/types/freelancer"

/** Who sent a message — the logged-in user ("me") or the other party. */
export type MessageSender = "me" | "them"

export interface ChatAttachment {
  name: string
  kind: "image" | "file"
}

export interface ChatMessage {
  id: string
  sender: MessageSender
  text: string
  /** Display time label, e.g. "١٠:٣٢ ص". Backend should send ISO + format here. */
  time: string
  attachment?: ChatAttachment
}

/** The other party in a conversation (a freelancer or a client). */
export interface ChatParticipant {
  id: string
  name: string
  /** Professional title (freelancer) or "عميل". */
  role: string
  tier?: Tier
  color: string
  /** Profile photo URL, when the participant has uploaded one. */
  avatar?: string
  online?: boolean
  /** Set when the participant is a freelancer → links to /freelancers/[id]. */
  freelancerId?: string
}

/** The job/project a conversation is attached to. */
export interface ConversationContext {
  label: string
  /** Links to /jobs/[id] when present. */
  jobId?: string
}

/** List-row shape (no message history). */
export interface ConversationSummary {
  id: string
  participant: ChatParticipant
  context: ConversationContext
  lastMessage: string
  lastTime: string
  /** Unread count for the logged-in user. */
  unread: number
}

/** Full thread returned when a conversation is opened. */
export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
}

export interface SendMessageInput {
  conversationId: string
  text: string
}

export interface SendMessageResult {
  ok: boolean
  message: ChatMessage
}

/* API DTOs (transport shapes from backend) */

export interface ApiEnvelopeDto<T> {
  data?: T
}

export interface ApiMetaEnvelopeDto<T> {
  data?: T
  meta?: {
    page?: number
    limit?: number
    offset?: number
  }
}

export interface RawParticipantDto {
  user_id?: string
  role?: string
  user_name?: string
  user_avatar?: string | null
}

export interface RawConversationDto {
  id?: string
  kind?: string
  subject?: string
  job_id?: string
  last_message_at?: string
  participants?: RawParticipantDto[]
  unread?: number
}

export interface RawMessageDto {
  id?: string
  conversation_id?: string
  sender_user_id?: string
  body?: string
  attachment?: unknown
  sent_at?: string
}
