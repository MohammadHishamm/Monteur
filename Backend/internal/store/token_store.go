package store

import (
	"context"
	"database/sql"
	"time"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

type TokenStore struct {
	db DBTX
}

func newTokenStore(db DBTX) *TokenStore {
	return &TokenStore{db: db}
}

func (s *TokenStore) Create(ctx context.Context, rt *entity.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (
			id, user_id, token_hash, expires_at, created_at, ip_address, user_agent
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := s.db.ExecContext(ctx, query,
		rt.ID, rt.UserID, rt.TokenHash, rt.ExpiresAt, rt.CreatedAt, rt.IPAddress, rt.UserAgent,
	)
	return err
}

func (s *TokenStore) GetByHash(ctx context.Context, hash string) (*entity.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by, ip_address, user_agent
		FROM refresh_tokens
		WHERE token_hash = $1
	`
	rt := &entity.RefreshToken{}
	err := s.db.QueryRowContext(ctx, query, hash).Scan(
		&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt, &rt.RevokedAt, &rt.ReplacedBy, &rt.IPAddress, &rt.UserAgent,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return rt, err
}

func (s *TokenStore) Revoke(ctx context.Context, id uuid.UUID, replacedBy *uuid.UUID) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = $1, replaced_by = $2
		WHERE id = $3 AND revoked_at IS NULL
	`
	_, err := s.db.ExecContext(ctx, query, time.Now(), replacedBy, id)
	return err
}

func (s *TokenStore) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = $1
		WHERE user_id = $2 AND revoked_at IS NULL
	`
	_, err := s.db.ExecContext(ctx, query, time.Now(), userID)
	return err
}

func (s *TokenStore) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM refresh_tokens WHERE expires_at < $1`
	_, err := s.db.ExecContext(ctx, query, time.Now())
	return err
}
