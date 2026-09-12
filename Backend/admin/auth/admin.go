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
	"github.com/lib/pq"
)

// pqArray adapts a []string for `= ANY($n)` parameters.
func pqArray(s []string) any { return pq.Array(s) }

// Admin is a portal user — a row of the admins table.
type Admin struct {
	ID           uuid.UUID
	Email        string
	FullName     string
	PasswordHash string
	IsActive     bool
	LastLoginAt  *time.Time

	// Two-factor state. Enrolled() is the only thing callers should ask.
	TOTPSecret       *string
	TOTPConfirmedAt  *time.Time
	TOTPLastUsedStep int64
}

// TOTPEnrolled reports whether the admin has completed two-factor setup.
func (a *Admin) TOTPEnrolled() bool {
	return a.TOTPSecret != nil && *a.TOTPSecret != "" && a.TOTPConfirmedAt != nil
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

const adminColumns = `id, email, full_name, password_hash, is_active, last_login_at,
	totp_secret, totp_confirmed_at, totp_last_used_step`

func (r *Repository) scan(row *sql.Row) (*Admin, error) {
	var a Admin
	err := row.Scan(&a.ID, &a.Email, &a.FullName, &a.PasswordHash, &a.IsActive, &a.LastLoginAt,
		&a.TOTPSecret, &a.TOTPConfirmedAt, &a.TOTPLastUsedStep)
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

// EnrolTOTP stores a secret the admin has just proven they hold (by
// entering a valid code at step) and marks it confirmed in one write, so an
// enrolment is never half-done and a previous enrolment survives an
// abandoned setup page.
func (r *Repository) EnrolTOTP(ctx context.Context, id uuid.UUID, secret string, step int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE admins SET totp_secret = $2, totp_confirmed_at = NOW(), totp_last_used_step = $3, updated_at = NOW()
		WHERE id = $1`, id, secret, step)
	return err
}

// MarkTOTPUsed advances the replay guard. It only moves forward, so two
// concurrent verifications cannot wind it back.
func (r *Repository) MarkTOTPUsed(ctx context.Context, id uuid.UUID, step int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE admins SET totp_last_used_step = GREATEST(totp_last_used_step, $2) WHERE id = $1`, id, step)
	return err
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
