package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type UserStore struct {
	db *sql.DB
}

func newUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}

// Create creates a new user
func (us *UserStore) Create(ctx context.Context, u *entity.User) (bool, error) {
	query := `
		INSERT INTO users
			(id, email, password_hash, full_name, phone, user_type, status,
			 avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
			 years_of_experience, company_name, company_website, industry,
			 is_email_verified, is_active, is_banned, ban_reason, verification_status,
			 last_activity_at, last_login_at, created_at, updated_at)
		VALUES
			($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			 $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
	`
	re, err := us.db.ExecContext(ctx, query,
		u.ID, u.Email, u.PasswordHash, u.FullName, u.Phone,
		u.UserType, u.Status, u.AvatarURL, u.Bio, u.Rating, u.TotalReviews,
		u.HourlyRate, pq.Array(u.Skills), u.PortfolioURL, u.YearsOfExperience,
		u.CompanyName, u.CompanyWebsite, u.Industry,
		u.IsEmailVerified, u.IsActive, u.IsBanned, u.BanReason, u.VerificationStatus,
		u.LastActivityAt, u.LastLoginAt, u.CreatedAt, u.UpdatedAt,
	)
	if err != nil {
		return false, err
	}

	ra, _ := re.RowsAffected()
	return ra > 0, nil
}

// FindByEmail finds a user by email
func (us *UserStore) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	query := `
		SELECT
			id, email, password_hash, full_name, phone, user_type, status,
			avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
			years_of_experience, company_name, company_website, industry,
			is_email_verified, is_active, is_banned, ban_reason, verification_status,
			last_activity_at, last_login_at, created_at, updated_at,
			COALESCE(tagline, '')
		FROM users
		WHERE email = $1
	`
	var u entity.User
	var skills []string

	row := us.db.QueryRowContext(ctx, query, email)
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone,
		&u.UserType, &u.Status, &u.AvatarURL, &u.Bio, &u.Rating, &u.TotalReviews,
		&u.HourlyRate, pq.Array(&skills), &u.PortfolioURL, &u.YearsOfExperience,
		&u.CompanyName, &u.CompanyWebsite, &u.Industry,
		&u.IsEmailVerified, &u.IsActive, &u.IsBanned, &u.BanReason, &u.VerificationStatus,
		&u.LastActivityAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		&u.Tagline,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	u.Skills = skills
	return &u, nil
}

// FindByID finds a user by ID
func (us *UserStore) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	query := `
		SELECT
			id, email, password_hash, full_name, phone, user_type, status,
			avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
			years_of_experience, company_name, company_website, industry,
			is_email_verified, is_active, is_banned, ban_reason, verification_status,
			last_activity_at, last_login_at, created_at, updated_at,
			COALESCE(tagline, ''), onboarding_completed
		FROM users
		WHERE id = $1
	`
	var u entity.User
	var skills []string

	row := us.db.QueryRowContext(ctx, query, id)
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone,
		&u.UserType, &u.Status, &u.AvatarURL, &u.Bio, &u.Rating, &u.TotalReviews,
		&u.HourlyRate, pq.Array(&skills), &u.PortfolioURL, &u.YearsOfExperience,
		&u.CompanyName, &u.CompanyWebsite, &u.Industry,
		&u.IsEmailVerified, &u.IsActive, &u.IsBanned, &u.BanReason, &u.VerificationStatus,
		&u.LastActivityAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		&u.Tagline, &u.OnboardingCompleted,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	u.Skills = skills
	return &u, nil
}

// CheckByEmail checks if user exists by email
func (us *UserStore) CheckByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM users WHERE email = $1)`
	var exists bool
	err := us.db.QueryRowContext(ctx, query, email).Scan(&exists)
	return exists, err
}

func (us *UserStore) IsIPBanned(ctx context.Context, ipAddress string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE is_banned = TRUE
			  AND banned_ip_address = $1
		)
	`

	var exists bool
	err := us.db.QueryRowContext(ctx, query, ipAddress).Scan(&exists)
	return exists, err
}

// ListByType lists users by type
func (us *UserStore) ListByType(ctx context.Context, userType string, limit, offset int) ([]*entity.User, error) {
	query := `
		SELECT
			id, email, password_hash, full_name, phone, user_type, status,
			avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
			years_of_experience, company_name, company_website, industry,
			is_email_verified, is_active, is_banned, ban_reason, verification_status,
			last_activity_at, last_login_at, created_at, updated_at
		FROM users WHERE user_type = $1 AND is_active = true
		ORDER BY rating DESC LIMIT $2 OFFSET $3
	`
	return us.scanUsers(ctx, query, userType, limit, offset)
}

// ListOnline lists online users
func (us *UserStore) ListOnline(ctx context.Context, userType string, limit, offset int) ([]*entity.User, error) {
	query := `
		SELECT
			id, email, password_hash, full_name, phone, user_type, status,
			avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
			years_of_experience, company_name, company_website, industry,
			is_email_verified, is_active, is_banned, ban_reason, verification_status,
			last_activity_at, last_login_at, created_at, updated_at
		FROM users WHERE user_type = $1 AND status = 'online' AND is_active = true
		ORDER BY rating DESC LIMIT $2 OFFSET $3
	`
	return us.scanUsers(ctx, query, userType, limit, offset)
}

// UpdateStatus updates user status
func (us *UserStore) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := us.db.ExecContext(ctx, query, status, id)
	return err
}

// UpdateLastActivity updates last activity timestamp
func (us *UserStore) UpdateLastActivity(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := us.db.ExecContext(ctx, query, id)
	return err
}

func (us *UserStore) CreatePassword(ctx context.Context, id *uuid.UUID, hashedPassword string) error {
	if id == nil {
		return errors.New("user id is nil")
	}

	_, err := us.db.ExecContext(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, hashedPassword, *id)
	return err
}

func (us *UserStore) UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) (bool, error) {
	re, err := us.db.ExecContext(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, hashedPassword, id)
	if err != nil {
		return false, err
	}

	ra, _ := re.RowsAffected()
	return ra > 0, nil
}

func (us *UserStore) UpdateAccount(ctx context.Context, id uuid.UUID, fullName, email string) error {
	_, err := us.db.ExecContext(ctx,
		`UPDATE users SET full_name = $1, email = $2, updated_at = NOW() WHERE id = $3`,
		fullName, email, id,
	)
	return err
}

func (us *UserStore) GetPasswordHash(ctx context.Context, id uuid.UUID) (string, error) {
	var hash string
	err := us.db.QueryRowContext(ctx, `SELECT password_hash FROM users WHERE id = $1`, id).Scan(&hash)
	return hash, err
}

func (us *UserStore) UpdateActivation(ctx context.Context, id uuid.UUID, activated bool) (bool, error) {
	re, err := us.db.ExecContext(ctx,
		`UPDATE users SET is_email_verified = $1, is_active = $1, updated_at = NOW() WHERE id = $2`,
		activated, id,
	)
	if err != nil {
		return false, err
	}

	ra, _ := re.RowsAffected()
	return ra > 0, nil
}

func (us *UserStore) DeleteByID(ctx context.Context, id uuid.UUID) (bool, error) {
	re, err := us.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, err
	}

	ra, _ := re.RowsAffected()
	return ra > 0, nil
}

func (us *UserStore) ListAll(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT
			id, email, password_hash, full_name, phone, user_type, status,
			avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
			years_of_experience, company_name, company_website, industry,
			is_email_verified, is_active, is_banned, ban_reason, verification_status,
			last_activity_at, last_login_at, created_at, updated_at
		FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`

	return us.scanUsers(ctx, query, limit, offset)
}

func (us *UserStore) CountActiveUsers(ctx context.Context) (int64, error) {
	var count int64
	err := us.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM users WHERE is_active = TRUE`).Scan(&count)
	return count, err
}

func (us *UserStore) SeedDisplayFields(u *entity.User) {
	if u == nil {
		return
	}

	if u.UserName == "" {
		u.UserName = strings.TrimSpace(strings.Split(u.Email, "@")[0])
	}

	if u.FirstName == nil || u.LastName == nil {
		parts := strings.Fields(u.FullName)
		if len(parts) > 0 && u.FirstName == nil {
			first := parts[0]
			u.FirstName = &first
		}
		if len(parts) > 1 && u.LastName == nil {
			last := strings.Join(parts[1:], " ")
			u.LastName = &last
		}
	}

	u.Password = &u.PasswordHash
	u.Is_activated = u.IsEmailVerified
	if len(u.Roles) == 0 {
		if u.UserType == "freelancer" {
			u.Roles = entity.RoleNames{entity.RoleNameFreelance}
		} else {
			u.Roles = entity.RoleNames{entity.RoleNameUser}
		}
	}
}

// BanUser sets is_banned=true and stores the ban reason for a user.
func (us *UserStore) BanUser(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := us.db.ExecContext(ctx,
		`UPDATE users SET is_banned = TRUE, ban_reason = $1, updated_at = NOW() WHERE id = $2`,
		reason, id,
	)
	return err
}

// UnbanUser clears the ban and resets the warning count.
func (us *UserStore) UnbanUser(ctx context.Context, id uuid.UUID) error {
	_, err := us.db.ExecContext(ctx,
		`UPDATE users SET is_banned = FALSE, ban_reason = NULL, warning_count = 0, updated_at = NOW() WHERE id = $1`,
		id,
	)
	return err
}

// IncrementWarning increments warning_count by 1 and returns the new count.
func (us *UserStore) IncrementWarning(ctx context.Context, id uuid.UUID) (int, error) {
	var count int
	err := us.db.QueryRowContext(ctx,
		`UPDATE users SET warning_count = warning_count + 1, updated_at = NOW() WHERE id = $1 RETURNING warning_count`,
		id,
	).Scan(&count)
	return count, err
}

// GetWarningCount returns the current warning count for a user.
func (us *UserStore) GetWarningCount(ctx context.Context, id uuid.UUID) (int, error) {
	var count int
	err := us.db.QueryRowContext(ctx,
		`SELECT warning_count FROM users WHERE id = $1`,
		id,
	).Scan(&count)
	return count, err
}

// freelancerSelectCols is the full column list including migration-13 fields.
const freelancerSelectCols = `
	id, email, password_hash, full_name, phone, user_type, status,
	avatar_url, bio, rating, total_reviews, hourly_rate, skills, portfolio_url,
	years_of_experience, company_name, company_website, industry,
	is_email_verified, is_active, is_banned, ban_reason, verification_status,
	last_activity_at, last_login_at, created_at, updated_at,
	COALESCE(tier,'bronze'), COALESCE(tagline,''), COALESCE(city,''),
	COALESCE(on_time_rate,0), COALESCE(response_time,''), COALESCE(completed_jobs,0),
	COALESCE(profile_completion,0), COALESCE(languages,'[]'::jsonb), COALESCE(country,'')
`

func (us *UserStore) scanFreelancer(row interface {
	Scan(...any) error
}) (*entity.User, error) {
	var u entity.User
	var skills []string
	err := row.Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone,
		&u.UserType, &u.Status, &u.AvatarURL, &u.Bio, &u.Rating, &u.TotalReviews,
		&u.HourlyRate, pq.Array(&skills), &u.PortfolioURL, &u.YearsOfExperience,
		&u.CompanyName, &u.CompanyWebsite, &u.Industry,
		&u.IsEmailVerified, &u.IsActive, &u.IsBanned, &u.BanReason, &u.VerificationStatus,
		&u.LastActivityAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		&u.Tier, &u.Tagline, &u.City,
		&u.OnTimeRate, &u.ResponseTime, &u.CompletedJobs,
		&u.ProfileCompletion, &u.Languages, &u.Country,
	)
	if err != nil {
		return nil, err
	}
	u.Skills = skills
	return &u, nil
}

// FreelancerQuery holds filter parameters for listing freelancers.
type FreelancerQuery struct {
	Search        string
	Category      string
	Tier          string
	City          string
	AvailableOnly bool
	Sort          string // "match" | "rating" | "rate" | "completed"
	Page          int
	PageSize      int
}

// ListFreelancersFiltered returns filtered, paginated freelancers with new profile fields.
func (us *UserStore) ListFreelancersFiltered(ctx context.Context, q FreelancerQuery) ([]*entity.User, int, error) {
	where := []string{"user_type = 'freelancer'", "is_active = true", "is_banned = false"}
	args := []any{}
	n := 1

	if q.Search != "" {
		where = append(where, fmt.Sprintf("(full_name ILIKE $%d OR tagline ILIKE $%d OR bio ILIKE $%d)", n, n, n))
		args = append(args, "%"+q.Search+"%")
		n++
	}
	if q.Tier != "" {
		where = append(where, fmt.Sprintf("tier = $%d", n))
		args = append(args, q.Tier)
		n++
	}
	if q.City != "" {
		where = append(where, fmt.Sprintf("city = $%d", n))
		args = append(args, q.City)
		n++
	}
	if q.AvailableOnly {
		where = append(where, "status = 'online'")
	}

	whereSQL := "WHERE " + strings.Join(where, " AND ")

	orderSQL := "ORDER BY rating DESC"
	switch q.Sort {
	case "rate":
		orderSQL = "ORDER BY hourly_rate ASC NULLS LAST"
	case "completed":
		orderSQL = "ORDER BY completed_jobs DESC"
	}

	var total int
	if err := us.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM users "+whereSQL, args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	if q.PageSize <= 0 {
		q.PageSize = 9
	}
	if q.Page <= 0 {
		q.Page = 1
	}
	offset := (q.Page - 1) * q.PageSize
	listArgs := append(args, q.PageSize, offset)

	query := fmt.Sprintf(
		"SELECT %s FROM users %s %s LIMIT $%d OFFSET $%d",
		freelancerSelectCols, whereSQL, orderSQL, n, n+1,
	)
	rows, err := us.db.QueryContext(ctx, query, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*entity.User
	for rows.Next() {
		u, err := us.scanFreelancer(rows)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

// FindFreelancerByID returns a single freelancer with all profile fields.
func (us *UserStore) FindFreelancerByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	query := "SELECT " + freelancerSelectCols + " FROM users WHERE id = $1 AND user_type = 'freelancer'"
	row := us.db.QueryRowContext(ctx, query, id)
	u, err := us.scanFreelancer(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return u, err
}

// ListDistinctCities returns distinct non-empty cities for active freelancers.
func (us *UserStore) ListDistinctCities(ctx context.Context) ([]string, error) {
	rows, err := us.db.QueryContext(ctx,
		`SELECT DISTINCT city FROM users WHERE user_type='freelancer' AND city != '' AND is_active=true ORDER BY city`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cities []string
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		cities = append(cities, c)
	}
	return cities, rows.Err()
}

// UpdateFreelancerProfile persists editable profile fields for a freelancer.
func (us *UserStore) UpdateFreelancerProfile(ctx context.Context, u *entity.User) error {
	_, err := us.db.ExecContext(ctx, `
		UPDATE users SET
			full_name=$1, bio=$2, tagline=$3, city=$4,
			hourly_rate=$5, skills=$6, years_of_experience=$7,
			avatar_url=$8, languages=$9, profile_completion=$10,
			status=$11, updated_at=NOW()
		WHERE id=$12
	`,
		u.FullName, u.Bio, u.Tagline, u.City,
		u.HourlyRate, pq.Array(u.Skills), u.YearsOfExperience,
		u.AvatarURL, u.Languages, u.ProfileCompletion,
		u.Status, u.ID,
	)
	return err
}

// Helper function to scan users
func (us *UserStore) scanUsers(ctx context.Context, query string, args ...interface{}) ([]*entity.User, error) {
	rows, err := us.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*entity.User
	for rows.Next() {
		var u entity.User
		var skills []string

		err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.Phone,
			&u.UserType, &u.Status, &u.AvatarURL, &u.Bio, &u.Rating, &u.TotalReviews,
			&u.HourlyRate, pq.Array(&skills), &u.PortfolioURL, &u.YearsOfExperience,
			&u.CompanyName, &u.CompanyWebsite, &u.Industry,
			&u.IsEmailVerified, &u.IsActive, &u.IsBanned, &u.BanReason, &u.VerificationStatus,
			&u.LastActivityAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		u.Skills = skills
		users = append(users, &u)
	}
	return users, rows.Err()
}
