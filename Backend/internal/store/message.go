package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

type MessageStore struct {
	db *sql.DB
}

func newMessageStore(db *sql.DB) *MessageStore {
	return &MessageStore{db: db}
}

// CreateMessage inserts a new message and returns the persisted record.
func (ms *MessageStore) CreateMessage(ctx context.Context, m *entity.Message) (*entity.Message, error) {
	attachment := m.Attachment
	if len(attachment) == 0 {
		attachment = []byte("{}")
	}

	query := `
		INSERT INTO messages (id, conversation_id, sender_user_id, body, attachment, sent_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6)
		RETURNING id, conversation_id, sender_user_id, body, attachment, sent_at, edited_at, deleted_at
	`

	var out entity.Message
	err := ms.db.QueryRowContext(ctx, query,
		m.ID, m.ConversationID, m.SenderUserID, m.Body, string(attachment), m.SentAt,
	).Scan(
		&out.ID, &out.ConversationID, &out.SenderUserID,
		&out.Body, &out.Attachment, &out.SentAt, &out.EditedAt, &out.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return &out, nil
}

// GetConversationMessages returns paginated messages for a conversation ordered oldest-first.
func (ms *MessageStore) GetConversationMessages(ctx context.Context, conversationID uuid.UUID, limit, offset int) ([]*entity.Message, error) {
	query := `
		SELECT id, conversation_id, sender_user_id, body, attachment, sent_at, edited_at, deleted_at
		FROM   messages
		WHERE  conversation_id = $1
		  AND  deleted_at IS NULL
		ORDER  BY sent_at ASC
		LIMIT  $2 OFFSET $3
	`

	rows, err := ms.db.QueryContext(ctx, query, conversationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	msgs := make([]*entity.Message, 0)
	for rows.Next() {
		var m entity.Message
		if err := rows.Scan(
			&m.ID, &m.ConversationID, &m.SenderUserID,
			&m.Body, &m.Attachment, &m.SentAt, &m.EditedAt, &m.DeletedAt,
		); err != nil {
			return nil, err
		}
		msgs = append(msgs, &m)
	}

	return msgs, rows.Err()
}

// CreateFlaggedMessage inserts a record into flagged_messages and returns it.
func (ms *MessageStore) CreateFlaggedMessage(ctx context.Context, f *entity.FlaggedMessage) (*entity.FlaggedMessage, error) {
	query := `
		INSERT INTO flagged_messages
			(id, message_id, sender_user_id, conversation_id, trigger_word, body_snapshot, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
		RETURNING id, message_id, sender_user_id, conversation_id, trigger_word, body_snapshot,
		          status, reviewed_by, reviewed_at, created_at
	`

	var out entity.FlaggedMessage
	err := ms.db.QueryRowContext(ctx, query,
		f.ID, f.MessageID, f.SenderUserID, f.ConversationID, f.TriggerWord, f.BodySnapshot, f.CreatedAt,
	).Scan(
		&out.ID, &out.MessageID, &out.SenderUserID, &out.ConversationID,
		&out.TriggerWord, &out.BodySnapshot, &out.Status,
		&out.ReviewedBy, &out.ReviewedAt, &out.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &out, nil
}

// GetFlaggedMessageByID returns a flagged message joined with sender info.
func (ms *MessageStore) GetFlaggedMessageByID(ctx context.Context, id uuid.UUID) (*entity.FlaggedMessage, error) {
	query := `
		SELECT
			fm.id, fm.message_id, fm.sender_user_id, fm.conversation_id,
			fm.trigger_word, fm.body_snapshot, fm.status,
			fm.reviewed_by, fm.reviewed_at, fm.created_at,
			u.full_name, u.email, u.warning_count
		FROM  flagged_messages fm
		JOIN  users u ON u.id = fm.sender_user_id
		WHERE fm.id = $1
	`

	var f entity.FlaggedMessage
	err := ms.db.QueryRowContext(ctx, query, id).Scan(
		&f.ID, &f.MessageID, &f.SenderUserID, &f.ConversationID,
		&f.TriggerWord, &f.BodySnapshot, &f.Status,
		&f.ReviewedBy, &f.ReviewedAt, &f.CreatedAt,
		&f.SenderName, &f.SenderEmail, &f.WarningCount,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &f, nil
}

// ListFlaggedMessages returns paginated flagged messages with total count.
// Pass status="" to list all statuses.
func (ms *MessageStore) ListFlaggedMessages(ctx context.Context, status string, limit, offset int) ([]*entity.FlaggedMessage, int, error) {
	const selectCols = `
		SELECT
			fm.id, fm.message_id, fm.sender_user_id, fm.conversation_id,
			fm.trigger_word, fm.body_snapshot, fm.status,
			fm.reviewed_by, fm.reviewed_at, fm.created_at,
			u.full_name, u.email, u.warning_count
		FROM  flagged_messages fm
		JOIN  users u ON u.id = fm.sender_user_id
	`

	var (
		total int
		rows  *sql.Rows
		err   error
	)

	if status != "" {
		if err = ms.db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM flagged_messages WHERE status = $1`, status,
		).Scan(&total); err != nil {
			return nil, 0, err
		}

		rows, err = ms.db.QueryContext(ctx,
			selectCols+`WHERE fm.status = $1 ORDER BY fm.created_at DESC LIMIT $2 OFFSET $3`,
			status, limit, offset,
		)
	} else {
		if err = ms.db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM flagged_messages`,
		).Scan(&total); err != nil {
			return nil, 0, err
		}

		rows, err = ms.db.QueryContext(ctx,
			selectCols+`ORDER BY fm.created_at DESC LIMIT $1 OFFSET $2`,
			limit, offset,
		)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]*entity.FlaggedMessage, 0)
	for rows.Next() {
		var f entity.FlaggedMessage
		if err := rows.Scan(
			&f.ID, &f.MessageID, &f.SenderUserID, &f.ConversationID,
			&f.TriggerWord, &f.BodySnapshot, &f.Status,
			&f.ReviewedBy, &f.ReviewedAt, &f.CreatedAt,
			&f.SenderName, &f.SenderEmail, &f.WarningCount,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, &f)
	}

	return list, total, rows.Err()
}

// UpdateFlaggedMessageStatus sets the review outcome and records who reviewed it.
func (ms *MessageStore) UpdateFlaggedMessageStatus(ctx context.Context, id uuid.UUID, status string, reviewedBy uuid.UUID) error {
	_, err := ms.db.ExecContext(ctx,
		`UPDATE flagged_messages SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
		status, reviewedBy, id,
	)
	return err
}

// ListConversationsByUser returns all non-archived conversations for a user, newest last-message first.
func (ms *MessageStore) ListConversationsByUser(ctx context.Context, userID uuid.UUID) ([]*entity.Conversation, error) {
	rows, err := ms.db.QueryContext(ctx, `
		SELECT c.id, c.kind, c.project_id, c.job_id, c.subject, c.last_message_at, c.created_at, c.updated_at
		FROM conversations c
		JOIN conversation_participants cp ON cp.conversation_id = c.id
		WHERE cp.user_id = $1 AND cp.archived = false
		ORDER BY c.last_message_at DESC NULLS LAST
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*entity.Conversation
	for rows.Next() {
		var c entity.Conversation
		if err := rows.Scan(
			&c.ID, &c.Kind, &c.ProjectID, &c.JobID, &c.Subject,
			&c.LastMessageAt, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

// FindConversationByID returns a conversation with its participants, or nil if not found.
func (ms *MessageStore) FindConversationByID(ctx context.Context, id uuid.UUID) (*entity.Conversation, error) {
	var c entity.Conversation
	err := ms.db.QueryRowContext(ctx, `
		SELECT id, kind, project_id, job_id, subject, last_message_at, created_at, updated_at
		FROM conversations WHERE id = $1
	`, id).Scan(
		&c.ID, &c.Kind, &c.ProjectID, &c.JobID, &c.Subject,
		&c.LastMessageAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	partRows, err := ms.db.QueryContext(ctx, `
		SELECT cp.id, cp.conversation_id, cp.user_id, cp.role, cp.last_read_at, cp.joined_at, cp.muted, cp.archived,
		       COALESCE(u.full_name,''), u.avatar_url
		FROM conversation_participants cp
		JOIN users u ON u.id = cp.user_id
		WHERE cp.conversation_id = $1
	`, id)
	if err != nil {
		return nil, err
	}
	defer partRows.Close()
	for partRows.Next() {
		var p entity.ConversationParticipant
		if err := partRows.Scan(
			&p.ID, &p.ConversationID, &p.UserID, &p.Role, &p.LastReadAt, &p.JoinedAt, &p.Muted, &p.Archived,
			&p.UserName, &p.UserAvatar,
		); err != nil {
			return nil, err
		}
		c.Participants = append(c.Participants, p)
	}

	return &c, partRows.Err()
}

// CreateDirectConversation creates a 'direct' conversation between two users if one doesn't exist.
func (ms *MessageStore) CreateDirectConversation(ctx context.Context, userA, userB uuid.UUID) (*entity.Conversation, error) {
	// Check for existing direct conversation between these two users.
	var existing uuid.UUID
	err := ms.db.QueryRowContext(ctx, `
		SELECT c.id FROM conversations c
		JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
		JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
		WHERE c.kind = 'direct'
		LIMIT 1
	`, userA, userB).Scan(&existing)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if existing != uuid.Nil {
		return ms.FindConversationByID(ctx, existing)
	}

	convID := uuid.New()
	if _, err := ms.db.ExecContext(ctx,
		`INSERT INTO conversations (id, kind) VALUES ($1, 'direct')`, convID,
	); err != nil {
		return nil, err
	}
	for _, uid := range []uuid.UUID{userA, userB} {
		if _, err := ms.db.ExecContext(ctx,
			`INSERT INTO conversation_participants (id, conversation_id, user_id) VALUES ($1, $2, $3)`,
			uuid.New(), convID, uid,
		); err != nil {
			return nil, err
		}
	}
	return ms.FindConversationByID(ctx, convID)
}

// GetConversationParticipantIDs returns the user IDs of every participant in a conversation.
func (ms *MessageStore) GetConversationParticipantIDs(ctx context.Context, conversationID uuid.UUID) ([]string, error) {
	rows, err := ms.db.QueryContext(ctx,
		`SELECT user_id::text FROM conversation_participants WHERE conversation_id = $1`,
		conversationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, rows.Err()
}
