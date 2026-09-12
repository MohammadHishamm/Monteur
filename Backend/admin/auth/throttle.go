package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Throttle locks out login after repeated failures, the way django-axes
// does: failures are counted per subject (client IP and account email)
// inside a rolling window; reaching the limit locks that subject for a
// cool-down period. State lives in the database so every replica sees it.
type Throttle struct {
	db          *sql.DB
	maxFailures int
	window      time.Duration
	lockout     time.Duration
}

// NewThrottle configures a throttle. maxFailures <= 0 disables it.
func NewThrottle(db *sql.DB, maxFailures int, window, lockout time.Duration) *Throttle {
	return &Throttle{db: db, maxFailures: maxFailures, window: window, lockout: lockout}
}

// Enabled reports whether lockout is active.
func (t *Throttle) Enabled() bool { return t != nil && t.maxFailures > 0 }

// Subjects builds the throttle keys for one login attempt.
func Subjects(ip, email string) []string {
	var out []string
	if ip != "" {
		out = append(out, "ip:"+ip)
	}
	if email = strings.ToLower(strings.TrimSpace(email)); email != "" {
		out = append(out, "email:"+email)
	}
	return out
}

// LockedUntil returns the latest active lock across the subjects, or the
// zero time when none is locked.
func (t *Throttle) LockedUntil(ctx context.Context, subjects []string) (time.Time, error) {
	if !t.Enabled() || len(subjects) == 0 {
		return time.Time{}, nil
	}
	var until sql.NullTime
	err := t.db.QueryRowContext(ctx, `
		SELECT MAX(locked_until) FROM admin_login_attempts
		WHERE subject = ANY($1) AND locked_until > NOW()`, pqArray(subjects)).Scan(&until)
	if err != nil {
		return time.Time{}, fmt.Errorf("auth: throttle lookup: %w", err)
	}
	if !until.Valid {
		return time.Time{}, nil
	}
	return until.Time, nil
}

// Fail records a failed attempt for each subject and returns the lock time
// if this failure crossed the limit for any of them.
func (t *Throttle) Fail(ctx context.Context, subjects []string) (time.Time, error) {
	if !t.Enabled() {
		return time.Time{}, nil
	}
	var locked time.Time
	for _, s := range subjects {
		until, err := t.fail(ctx, s)
		if err != nil {
			return time.Time{}, err
		}
		if until.After(locked) {
			locked = until
		}
	}
	// Opportunistic housekeeping: rows older than the longer of the two
	// periods can never matter again.
	_, _ = t.db.ExecContext(ctx, `DELETE FROM admin_login_attempts WHERE updated_at < NOW() - make_interval(secs => $1)`,
		2*maxDuration(t.window, t.lockout).Seconds())
	return locked, nil
}

// fail increments one subject inside a transaction so concurrent attempts
// cannot lose counts.
func (t *Throttle) fail(ctx context.Context, subject string) (time.Time, error) {
	tx, err := t.db.BeginTx(ctx, nil)
	if err != nil {
		return time.Time{}, fmt.Errorf("auth: throttle begin: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op after Commit

	var (
		failures int
		started  time.Time
		locked   sql.NullTime
	)
	err = tx.QueryRowContext(ctx, `
		SELECT failures, window_started_at, locked_until FROM admin_login_attempts
		WHERE subject = $1 FOR UPDATE`, subject).Scan(&failures, &started, &locked)
	now := time.Now()
	switch {
	case errors.Is(err, sql.ErrNoRows):
		failures, started = 0, now
	case err != nil:
		return time.Time{}, fmt.Errorf("auth: throttle read: %w", err)
	case now.Sub(started) > t.window:
		failures, started = 0, now // the previous window has expired
	}

	failures++
	var lockUntil sql.NullTime
	if locked.Valid && locked.Time.After(now) {
		lockUntil = locked // already locked; keep the existing expiry
	}
	if failures >= t.maxFailures {
		lockUntil = sql.NullTime{Time: now.Add(t.lockout), Valid: true}
		failures = 0 // the next window starts clean after the lock expires
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO admin_login_attempts (subject, failures, window_started_at, locked_until, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (subject) DO UPDATE SET
			failures = EXCLUDED.failures,
			window_started_at = EXCLUDED.window_started_at,
			locked_until = EXCLUDED.locked_until,
			updated_at = NOW()`, subject, failures, started, lockUntil)
	if err != nil {
		return time.Time{}, fmt.Errorf("auth: throttle write: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return time.Time{}, fmt.Errorf("auth: throttle commit: %w", err)
	}
	if lockUntil.Valid {
		return lockUntil.Time, nil
	}
	return time.Time{}, nil
}

// Reset clears the counters for the subjects after a successful login.
func (t *Throttle) Reset(ctx context.Context, subjects []string) error {
	if !t.Enabled() || len(subjects) == 0 {
		return nil
	}
	_, err := t.db.ExecContext(ctx, `DELETE FROM admin_login_attempts WHERE subject = ANY($1)`, pqArray(subjects))
	if err != nil {
		return fmt.Errorf("auth: throttle reset: %w", err)
	}
	return nil
}

func maxDuration(a, b time.Duration) time.Duration {
	if a > b {
		return a
	}
	return b
}
