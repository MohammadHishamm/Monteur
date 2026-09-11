// Package service holds the portal's use cases: listing, filtering, creating,
// editing and deleting rows of registered models, plus the audit log and the
// first-run superuser bootstrap. Handlers call services; services call the
// repository. No SQL and no HTTP live here.
package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/google/uuid"
)

// Action is the kind of change recorded in the audit log. Values match
// Django's LogEntry flags.
type Action int16

const (
	ActionAdd    Action = 1
	ActionChange Action = 2
	ActionDelete Action = 3
)

func (a Action) String() string {
	switch a {
	case ActionAdd:
		return "Added"
	case ActionChange:
		return "Changed"
	case ActionDelete:
		return "Deleted"
	default:
		return "Unknown"
	}
}

// LogEntry is one audit record.
type LogEntry struct {
	ID         int64
	AdminID    *uuid.UUID
	AdminEmail string
	Action     Action
	AppLabel   string
	Model      string
	ObjectID   string
	ObjectRepr string
	Message    string
	CreatedAt  time.Time
}

// LogService writes and reads the audit log.
type LogService struct {
	db *sql.DB
}

// NewLogService wraps a database handle.
func NewLogService(db *sql.DB) *LogService { return &LogService{db: db} }

// Record appends an entry. Logging failures are returned rather than
// swallowed so the caller can decide; the model service treats them as
// non-fatal and logs them.
func (l *LogService) Record(ctx context.Context, admin *auth.Admin, action Action, appLabel, model, objectID, repr, message string) error {
	if len(repr) > 255 {
		repr = repr[:255]
	}
	_, err := l.db.ExecContext(ctx, `
		INSERT INTO admin_log (admin_id, admin_email, action_flag, app_label, model, object_id, object_repr, change_message)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		admin.ID, admin.Email, int16(action), appLabel, model, objectID, repr, message)
	if err != nil {
		return fmt.Errorf("service: record log: %w", err)
	}
	return nil
}

// Recent returns the newest entries by one admin — the "Recent actions"
// panel on the index page shows the signed-in admin's own history.
func (l *LogService) Recent(ctx context.Context, adminID uuid.UUID, limit int) ([]LogEntry, error) {
	rows, err := l.db.QueryContext(ctx, `
		SELECT id, admin_id, admin_email, action_flag, app_label, model, object_id, object_repr, change_message, created_at
		FROM admin_log WHERE admin_id = $1
		ORDER BY created_at DESC, id DESC LIMIT $2`, adminID, limit)
	if err != nil {
		return nil, fmt.Errorf("service: recent log: %w", err)
	}
	defer rows.Close()

	var out []LogEntry
	for rows.Next() {
		var e LogEntry
		var adminID uuid.NullUUID
		if err := rows.Scan(&e.ID, &adminID, &e.AdminEmail, &e.Action, &e.AppLabel, &e.Model,
			&e.ObjectID, &e.ObjectRepr, &e.Message, &e.CreatedAt); err != nil {
			return nil, err
		}
		if adminID.Valid {
			e.AdminID = &adminID.UUID
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
