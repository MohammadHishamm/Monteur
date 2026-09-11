package store

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

type SavedFreelancerStore struct {
	db *sql.DB
}

func newSavedFreelancerStore(db *sql.DB) *SavedFreelancerStore {
	return &SavedFreelancerStore{db: db}
}

func (s *SavedFreelancerStore) Save(ctx context.Context, userID, freelancerID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO saved_freelancers (user_id, freelancer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, freelancerID,
	)
	return err
}

func (s *SavedFreelancerStore) Unsave(ctx context.Context, userID, freelancerID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM saved_freelancers WHERE user_id = $1 AND freelancer_id = $2`,
		userID, freelancerID,
	)
	return err
}

func (s *SavedFreelancerStore) IsSaved(ctx context.Context, userID, freelancerID uuid.UUID) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM saved_freelancers WHERE user_id = $1 AND freelancer_id = $2)`,
		userID, freelancerID,
	).Scan(&exists)
	return exists, err
}

// ListSaved returns IDs of all freelancers saved by userID, newest first.
func (s *SavedFreelancerStore) ListSaved(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT freelancer_id FROM saved_freelancers WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
