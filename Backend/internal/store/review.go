package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

var ErrAlreadyReviewed = errors.New("you have already reviewed this project")
var ErrProjectNotComplete = errors.New("project must be completed before leaving a review")
var ErrNotProjectClient = errors.New("only the project client can leave a review")

type ReviewStore struct {
	db *sql.DB
}

func newReviewStore(db *sql.DB) *ReviewStore {
	return &ReviewStore{db: db}
}

// Create inserts a review and recomputes the reviewee's rating in one transaction.
// Guards: project must be completed, caller must be the client, no duplicate review.
func (s *ReviewStore) Create(ctx context.Context, projectID, reviewerID uuid.UUID, rating int, body string) (*entity.Review, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	// Verify project state and ownership.
	var clientID, freelancerID uuid.UUID
	var status string
	err = tx.QueryRowContext(ctx,
		`SELECT client_id, freelancer_id, status FROM projects WHERE id = $1`,
		projectID,
	).Scan(&clientID, &freelancerID, &status)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if clientID != reviewerID {
		return nil, ErrNotProjectClient
	}
	if status != "completed" {
		return nil, ErrProjectNotComplete
	}

	// Insert — unique constraint catches duplicates.
	var rev entity.Review
	err = tx.QueryRowContext(ctx, `
		INSERT INTO reviews (project_id, reviewer_id, reviewee_id, rating, body)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, project_id, reviewer_id, reviewee_id, rating, body, created_at
	`, projectID, reviewerID, freelancerID, rating, body).Scan(
		&rev.ID, &rev.ProjectID, &rev.ReviewerID, &rev.RevieweeID,
		&rev.Rating, &rev.Body, &rev.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrAlreadyReviewed
		}
		return nil, err
	}

	// Recompute the freelancer's aggregate rating.
	if _, err = tx.ExecContext(ctx, `
		UPDATE users
		SET rating       = (SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE reviewee_id = $1),
		    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1),
		    updated_at   = NOW()
		WHERE id = $1
	`, freelancerID); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &rev, nil
}

// ListByFreelancer returns all reviews for a freelancer, newest first, with reviewer info.
func (s *ReviewStore) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID) ([]*entity.Review, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT r.id, r.project_id, r.reviewer_id, r.reviewee_id, r.rating, r.body, r.created_at,
		       COALESCE(u.full_name, ''), u.avatar_url
		FROM reviews r
		JOIN users u ON u.id = r.reviewer_id
		WHERE r.reviewee_id = $1
		ORDER BY r.created_at DESC
	`, freelancerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*entity.Review
	for rows.Next() {
		var rev entity.Review
		if err := rows.Scan(
			&rev.ID, &rev.ProjectID, &rev.ReviewerID, &rev.RevieweeID,
			&rev.Rating, &rev.Body, &rev.CreatedAt,
			&rev.ReviewerName, &rev.ReviewerAvatar,
		); err != nil {
			return nil, err
		}
		list = append(list, &rev)
	}
	return list, rows.Err()
}

// HasReviewed returns true if reviewerID has already reviewed the given project.
func (s *ReviewStore) HasReviewed(ctx context.Context, projectID, reviewerID uuid.UUID) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM reviews WHERE project_id = $1 AND reviewer_id = $2)`,
		projectID, reviewerID,
	).Scan(&exists)
	return exists, err
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	// lib/pq error code 23505
	type pgErr interface{ Get(byte) string }
	if pe, ok := err.(pgErr); ok {
		return pe.Get('C') == "23505"
	}
	return false
}
