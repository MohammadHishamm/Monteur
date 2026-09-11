package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type MessageService struct {
	store *store.Store
}

func newMessageService(s *store.Store) *MessageService {
	return &MessageService{store: s}
}

// SendMessageParams is the input required to send a message.
type SendMessageParams struct {
	ConversationID uuid.UUID
	SenderUserID   uuid.UUID
	Body           string
	Attachment     []byte
}

// SendMessageResult is returned by SendMessage.
type SendMessageResult struct {
	Message *entity.Message
	Flagged bool
}

// SendMessage saves the message, runs the content filter, and creates a
// flagged_message record (plus an admin notification) when a violation is found.
// The message is always delivered regardless of whether it is flagged.
func (ms *MessageService) SendMessage(ctx context.Context, params SendMessageParams) (*SendMessageResult, error) {
	if params.Body == "" {
		return nil, apperror.ErrInvalidInput
	}

	msg := &entity.Message{
		ID:             uuid.New(),
		ConversationID: params.ConversationID,
		SenderUserID:   params.SenderUserID,
		Body:           params.Body,
		Attachment:     params.Attachment,
		SentAt:         time.Now(),
	}

	saved, err := ms.store.Message.CreateMessage(ctx, msg)
	if err != nil {
		return nil, err
	}

	result := &SendMessageResult{Message: saved}

	filter := FilterMessage(params.Body)
	if !filter.Flagged {
		return result, nil
	}

	// Message triggered the content filter — record and notify admins.
	saved.Flagged = true
	saved.TriggerWord = filter.TriggerWord
	result.Flagged = true

	flag := &entity.FlaggedMessage{
		ID:             uuid.New(),
		MessageID:      saved.ID,
		SenderUserID:   params.SenderUserID,
		ConversationID: params.ConversationID,
		TriggerWord:    filter.TriggerWord,
		BodySnapshot:   params.Body,
		CreatedAt:      time.Now(),
	}

	if _, err := ms.store.Message.CreateFlaggedMessage(ctx, flag); err != nil {
		// Non-fatal: log and continue so the message is still delivered.
		common.Logger.Error("failed to persist flagged message record",
			slog.Any("error", err),
			slog.String("message_id", saved.ID.String()),
			slog.String("component", "service.message"),
			slog.String("method", "SendMessage"))
	} else {
		_, _ = ms.store.CreateNotifications(ctx, []entity.CreateNotificationParams{{
			UserID:   params.SenderUserID.String(),
			Type:     "flagged_message",
			Title:    "Flagged Message Detected",
			Message:  "A message triggered the content filter (keyword: " + filter.TriggerWord + "). Please review.",
			Data:     []byte(`{"flagged_message_id":"` + flag.ID.String() + `"}`),
			Priority: "urgent",
		}})
	}

	common.Logger.Warn("message flagged by content filter",
		slog.String("trigger_word", filter.TriggerWord),
		slog.String("sender_id", params.SenderUserID.String()),
		slog.String("message_id", saved.ID.String()),
		slog.String("component", "service.message"),
		slog.String("method", "SendMessage"))

	return result, nil
}

// GetMessages returns paginated messages for a conversation.
func (ms *MessageService) GetMessages(ctx context.Context, conversationID uuid.UUID, limit, offset int) ([]*entity.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	return ms.store.Message.GetConversationMessages(ctx, conversationID, limit, offset)
}
