package store

import (
	"context"
	"database/sql"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
)

func (s *Store) CreateNotifications(ctx context.Context, params []entity.CreateNotificationParams) ([]entity.Notification, error) {
	if len(params) == 0 {
		return []entity.Notification{}, nil
	}

	tx, err := s.DB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}

	created := make([]entity.Notification, 0, len(params))
	for _, item := range params {
		data := item.Data
		if len(data) == 0 {
			data = []byte("{}")
		}

		priority := strings.TrimSpace(item.Priority)
		if priority == "" {
			priority = "normal"
		}

		n := entity.Notification{}
		err := tx.QueryRowContext(
			ctx,
			`INSERT INTO notifications (
				user_id,
				type,
				title,
				message,
				data,
				priority
			)
			VALUES ($1, $2, $3, $4, $5::jsonb, $6)
			RETURNING id, user_id, type, title, message, data, priority, is_read, read_at, created_at`,
			item.UserID,
			item.Type,
			item.Title,
			item.Message,
			string(data),
			priority,
		).Scan(
			&n.ID,
			&n.UserID,
			&n.Type,
			&n.Title,
			&n.Message,
			&n.Data,
			&n.Priority,
			&n.IsRead,
			&n.ReadAt,
			&n.CreatedAt,
		)
		if err != nil {
			_ = tx.Rollback()
			return nil, err
		}

		created = append(created, n)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return created, nil
}

func (s *Store) ListNotifications(ctx context.Context, userID string, limit, offset int) ([]entity.Notification, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := s.DB.QueryContext(
		ctx,
		`SELECT id, user_id, type, title, message, data, priority, is_read, read_at, created_at
		 FROM notifications
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]entity.Notification, 0, limit)
	for rows.Next() {
		var n entity.Notification
		if err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.Type,
			&n.Title,
			&n.Message,
			&n.Data,
			&n.Priority,
			&n.IsRead,
			&n.ReadAt,
			&n.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, n)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (s *Store) MarkNotificationRead(ctx context.Context, id int64, userID string) (*entity.Notification, error) {
	n := &entity.Notification{}
	err := s.DB.QueryRowContext(
		ctx,
		`UPDATE notifications
		 SET is_read = TRUE,
		     read_at = COALESCE(read_at, NOW())
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, type, title, message, data, priority, is_read, read_at, created_at`,
		id,
		userID,
	).Scan(
		&n.ID,
		&n.UserID,
		&n.Type,
		&n.Title,
		&n.Message,
		&n.Data,
		&n.Priority,
		&n.IsRead,
		&n.ReadAt,
		&n.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return n, nil
}
