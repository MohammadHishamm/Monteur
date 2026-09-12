// Package auth authenticates portal users against the admins table and keeps
// them signed in with a signed session cookie, the way django.contrib.auth +
// SessionMiddleware do for the Django admin.
package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/google/uuid"
)

// Admin is a portal user — a row of the admins table.
type Admin struct {
	ID           uuid.UUID
	Email        string
	FullName     string
	PasswordHash string
	IsActive     bool
	LastLoginAt  *time.Time
}

// ErrInvalidCredentials is returned for a wrong email/password or an
// inactive account; callers must not distinguish the two to the user.
var ErrInvalidCredentials = errors.New("auth: invalid credentials")

// Repository reads and writes admins.
type Repository struct {
	db *sql.DB
}

// NewRepository wraps a database handle.
func NewRepository(db *sql.DB) *Repository { return &Repository{db: db} }

const adminColumns = `id, email, full_name, password_hash, is_active, last_login_at`

func (r *Repository) scan(row *sql.Row) (*Admin, error) {
	var a Admin
	err := row.Scan(&a.ID, &a.Email, &a.FullName, &a.PasswordHash, &a.IsActive, &a.LastLoginAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// FindByEmail returns the admin with the given email, or nil.
func (r *Repository) FindByEmail(ctx context.Context, email string) (*Admin, error) {
	return r.scan(r.db.QueryRowContext(ctx,
		`SELECT `+adminColumns+` FROM admins WHERE lower(email) = lower($1)`, email))
}

// FindByID returns the admin with the given id, or nil.
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Admin, error) {
	return r.scan(r.db.QueryRowContext(ctx,
		`SELECT `+adminColumns+` FROM admins WHERE id = $1`, id))
}

// TouchLogin records a successful sign-in.
func (r *Repository) TouchLogin(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE admins SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, id)
	return err
}

// Create inserts an active admin with an already-hashed password. It is a
// no-op (returning nil) when the email already exists, so concurrent
// bootstraps from several replicas cannot race each other into a unique
// violation.
func (r *Repository) Create(ctx context.Context, email, fullName, passwordHash string) (*Admin, error) {
	return r.scan(r.db.QueryRowContext(ctx,
		`INSERT INTO admins (email, password_hash, full_name, is_active)
		 VALUES ($1, $2, $3, true)
		 ON CONFLICT (email) DO NOTHING
		 RETURNING `+adminColumns,
		email, passwordHash, fullName))
}

// Authenticator verifies credentials.
type Authenticator struct {
	repo *Repository
}

// NewAuthenticator builds an Authenticator over the repository.
func NewAuthenticator(repo *Repository) *Authenticator { return &Authenticator{repo: repo} }

// Authenticate checks email/password and returns the admin on success. It
// always runs a bcrypt comparison — even for unknown emails — so response
// time does not reveal whether the account exists.
func (a *Authenticator) Authenticate(ctx context.Context, email, password string) (*Admin, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	admin, err := a.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("auth: lookup: %w", err)
	}
	if admin == nil {
		common.VerifyPassword(dummyHash, password)
		return nil, ErrInvalidCredentials
	}
	if !common.VerifyPassword(admin.PasswordHash, password) || !admin.IsActive {
		return nil, ErrInvalidCredentials
	}
	return admin, nil
}

// dummyHash is a bcrypt hash of an arbitrary string, used to equalise timing
// for non-existent accounts.
const dummyHash = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5XfHnbmnlKXmZq6H5.9rXbZqIf1hS"
