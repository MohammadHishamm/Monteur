package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

type VerificationStore struct {
	db *sql.DB
}

func newVerificationStore(db *sql.DB) *VerificationStore {
	return &VerificationStore{db: db}
}

// Create creates a new user verification request
func (s *VerificationStore) Create(ctx context.Context, v *entity.UserVerification) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO user_verifications (id, user_id, id_front_url, id_back_url, selfie_url, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, query,
		v.ID, v.UserID, v.IDFrontURL, v.IDBackURL, v.SelfieURL, v.Status,
	).Scan(&v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return err
	}

	// Update user verification_status
	_, err = tx.ExecContext(ctx, `UPDATE users SET verification_status = $1, updated_at = NOW() WHERE id = $2`, v.Status, v.UserID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetByID gets a verification request by ID
func (s *VerificationStore) GetByID(ctx context.Context, id uuid.UUID) (*entity.UserVerification, error) {
	query := `
		SELECT id, user_id, id_front_url, id_back_url, selfie_url, status, rejection_reason, created_at, updated_at
		FROM user_verifications
		WHERE id = $1
	`
	var v entity.UserVerification
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&v.ID, &v.UserID, &v.IDFrontURL, &v.IDBackURL, &v.SelfieURL, &v.Status, &v.RejectionReason, &v.CreatedAt, &v.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &v, err
}

// GetByUserID gets the latest verification request for a user
func (s *VerificationStore) GetByUserID(ctx context.Context, userID uuid.UUID) (*entity.UserVerification, error) {
	query := `
		SELECT id, user_id, id_front_url, id_back_url, selfie_url, status, rejection_reason, created_at, updated_at
		FROM user_verifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	var v entity.UserVerification
	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&v.ID, &v.UserID, &v.IDFrontURL, &v.IDBackURL, &v.SelfieURL, &v.Status, &v.RejectionReason, &v.CreatedAt, &v.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &v, err
}

// ListPending lists pending verifications
func (s *VerificationStore) ListByStatus(ctx context.Context, status string, limit, offset int) ([]*entity.UserVerification, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	if status == "" {
		status = "pending"
	}

	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM user_verifications WHERE status = $1`, status).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT v.id, v.user_id, v.id_front_url, v.id_back_url, v.selfie_url, v.status,
		       v.rejection_reason, v.created_at, v.updated_at,
		       COALESCE(u.full_name, ''), COALESCE(u.email, '')
		FROM user_verifications v
		LEFT JOIN users u ON u.id = v.user_id
		WHERE v.status = $1
		ORDER BY v.created_at ASC
		LIMIT $2 OFFSET $3
	`
	rows, err := s.db.QueryContext(ctx, query, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*entity.UserVerification
	for rows.Next() {
		var v entity.UserVerification
		if err := rows.Scan(&v.ID, &v.UserID, &v.IDFrontURL, &v.IDBackURL, &v.SelfieURL, &v.Status, &v.RejectionReason, &v.CreatedAt, &v.UpdatedAt, &v.UserName, &v.UserEmail); err != nil {
			return nil, 0, err
		}
		v.SubmittedAt = v.CreatedAt
		list = append(list, &v)
	}

	return list, total, nil
}

// UpdateStatus updates the verification status and user status
func (s *VerificationStore) UpdateStatus(ctx context.Context, id uuid.UUID, newStatus string, rejectionReason *string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update verification record
	var userID uuid.UUID
	err = tx.QueryRowContext(ctx, `
		UPDATE user_verifications 
		SET status = $1, rejection_reason = $2, updated_at = NOW() 
		WHERE id = $3 
		RETURNING user_id
	`, newStatus, rejectionReason, id).Scan(&userID)
	if err != nil {
		return err
	}

	// Update user's verification_status
	var userStatus string
	if newStatus == "approved" {
		userStatus = "verified"
	} else if newStatus == "rejected" {
		userStatus = "rejected"
	} else {
		userStatus = newStatus
	}

	_, err = tx.ExecContext(ctx, `UPDATE users SET verification_status = $1, updated_at = NOW() WHERE id = $2`, userStatus, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
