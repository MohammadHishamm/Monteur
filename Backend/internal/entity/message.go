package entity

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Message represents a single chat message.
type Message struct {
	ID             uuid.UUID       `db:"id"              json:"id"`
	ConversationID uuid.UUID       `db:"conversation_id" json:"conversation_id"`
	SenderUserID   uuid.UUID       `db:"sender_user_id"  json:"sender_user_id"`
	Body           string          `db:"body"            json:"body"`
	Attachment     json.RawMessage `db:"attachment"      json:"attachment"`
	SentAt         time.Time       `db:"sent_at"         json:"sent_at"`
	EditedAt       *time.Time      `db:"edited_at"       json:"edited_at,omitempty"`
	DeletedAt      *time.Time      `db:"deleted_at"      json:"deleted_at,omitempty"`
	// Flagged is not stored in messages table; set by service layer after filter check.
	Flagged     bool   `db:"-" json:"flagged,omitempty"`
	TriggerWord string `db:"-" json:"trigger_word,omitempty"`
}

// FlaggedMessage represents a message that was caught by the content filter.
type FlaggedMessage struct {
	ID             uuid.UUID  `db:"id"              json:"id"`
	MessageID      uuid.UUID  `db:"message_id"      json:"message_id"`
	SenderUserID   uuid.UUID  `db:"sender_user_id"  json:"sender_user_id"`
	ConversationID uuid.UUID  `db:"conversation_id" json:"conversation_id"`
	TriggerWord    string     `db:"trigger_word"    json:"trigger_word"`
	BodySnapshot   string     `db:"body_snapshot"   json:"body_snapshot"`
	Status         string     `db:"status"          json:"status"` // pending | warned | dismissed
	ReviewedBy     *uuid.UUID `db:"reviewed_by"     json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time `db:"reviewed_at"     json:"reviewed_at,omitempty"`
	CreatedAt      time.Time  `db:"created_at"      json:"created_at"`

	// Joined fields (populated when listing for admin)
	SenderName   string `db:"sender_name"   json:"sender_name,omitempty"`
	SenderEmail  string `db:"sender_email"  json:"sender_email,omitempty"`
	WarningCount int    `db:"warning_count" json:"warning_count,omitempty"`
}

// Conversation represents a chat thread.
type Conversation struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	Kind          string     `db:"kind" json:"kind"`
	ProjectID     *uuid.UUID `db:"project_id" json:"project_id,omitempty"`
	JobID         *uuid.UUID `db:"job_id" json:"job_id,omitempty"`
	Subject       string     `db:"subject" json:"subject"`
	LastMessageAt *time.Time `db:"last_message_at" json:"last_message_at,omitempty"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`

	// Populated by query join
	Participants []ConversationParticipant `db:"-" json:"participants,omitempty"`
	LastMessage  *Message                  `db:"-" json:"last_message,omitempty"`
	Unread       int                       `db:"-" json:"unread"`
}

// ConversationParticipant links a user to a conversation.
type ConversationParticipant struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	ConversationID uuid.UUID  `db:"conversation_id" json:"conversation_id"`
	UserID         uuid.UUID  `db:"user_id" json:"user_id"`
	Role           string     `db:"role" json:"role"`
	LastReadAt     *time.Time `db:"last_read_at" json:"last_read_at,omitempty"`
	JoinedAt       time.Time  `db:"joined_at" json:"joined_at"`
	Muted          bool       `db:"muted" json:"muted"`
	Archived       bool       `db:"archived" json:"archived"`

	// Joined user info
	UserName   string  `db:"user_name" json:"user_name,omitempty"`
	UserAvatar *string `db:"user_avatar" json:"user_avatar,omitempty"`
}

// SendMessageInput is the request body for sending a message.
type SendMessageInput struct {
	ConversationID string          `json:"conversation_id"`
	Body           string          `json:"body"`
	Attachment     json.RawMessage `json:"attachment,omitempty"`
}
