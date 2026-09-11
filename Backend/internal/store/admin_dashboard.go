package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

// ─── Admin Auth ───────────────────────────────────────────────────────────────

// FindAdminByEmail returns the admin record for the given email, or nil if not found.
func (s *AdminDashboardStore) FindAdminByEmail(ctx context.Context, email string) (*entity.Admin, error) {
	query := `
		SELECT id, email, password_hash, full_name, is_active
		FROM admins
		WHERE email = $1
	`
	var a entity.Admin
	err := s.db.QueryRowContext(ctx, query, email).Scan(
		&a.ID, &a.Email, &a.PasswordHash, &a.FullName, &a.IsActive,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &a, err
}

// TouchAdminLogin updates last_login_at for the admin.
func (s *AdminDashboardStore) TouchAdminLogin(ctx context.Context, id uuid.UUID) {
	_, _ = s.db.ExecContext(ctx,
		`UPDATE admins SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, id,
	)
}

type AdminDashboardStore struct {
	db *sql.DB
}

func newAdminDashboardStore(db *sql.DB) *AdminDashboardStore {
	return &AdminDashboardStore{db: db}
}

// ─── Analytics ───────────────────────────────────────────────────────────────

type AdminAnalyticsRow struct {
	TotalUsers          int     `json:"total_users"`
	ActivatedUsers      int     `json:"activated_users"`
	NonActivatedUsers   int     `json:"non_activated_users"`
	TotalFreelancers    int     `json:"total_freelancers"`
	TotalClients        int     `json:"total_clients"`
	TotalJobs           int     `json:"total_jobs"`
	TotalProjects       int     `json:"total_projects"`
	TotalRevenue        float64 `json:"total_revenue"`
	OpenSupportTickets  int     `json:"open_support_tickets"`
	NewUsersThisMonth   int     `json:"new_users_this_month"`
	AvgCompletionRate   int     `json:"avg_completion_rate"`
}

func (s *AdminDashboardStore) GetAnalytics(ctx context.Context) (*AdminAnalyticsRow, error) {
	query := `
		SELECT
			(SELECT COUNT(*)                                    FROM users)                                         AS total_users,
			(SELECT COUNT(*)                                    FROM users WHERE is_email_verified = true AND is_active = true AND is_banned = false) AS activated_users,
			(SELECT COUNT(*)                                    FROM users WHERE is_email_verified = false OR is_active = false OR is_banned = true)  AS non_activated_users,
			(SELECT COUNT(*)                                    FROM users WHERE user_type = 'freelancer')          AS total_freelancers,
			(SELECT COUNT(*)                                    FROM users WHERE user_type = 'client')              AS total_clients,
			(SELECT COUNT(*)                                    FROM jobs)                                          AS total_jobs,
			(SELECT COUNT(*)                                    FROM projects)                                      AS total_projects,
			(SELECT COALESCE(SUM(lifetime_spent), 0)           FROM user_balances)                                 AS total_revenue,
			(SELECT COUNT(*)                                    FROM conversations WHERE kind = 'support')          AS open_support_tickets,
			(SELECT COUNT(*)                                    FROM users WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_this_month,
			(SELECT COALESCE(AVG(profile_completion)::INT, 0)  FROM users WHERE user_type = 'freelancer')          AS avg_completion_rate
	`
	var r AdminAnalyticsRow
	err := s.db.QueryRowContext(ctx, query).Scan(
		&r.TotalUsers, &r.ActivatedUsers, &r.NonActivatedUsers,
		&r.TotalFreelancers, &r.TotalClients,
		&r.TotalJobs, &r.TotalProjects, &r.TotalRevenue,
		&r.OpenSupportTickets, &r.NewUsersThisMonth, &r.AvgCompletionRate,
	)
	return &r, err
}

// ─── Users ────────────────────────────────────────────────────────────────────

type AdminUserRow struct {
	ID              uuid.UUID `json:"id"`
	FullName        string    `json:"name"`
	Email           string    `json:"email"`
	Role            string    `json:"role"`
	IsActive        bool      `json:"is_active"`
	IsBanned        bool      `json:"is_banned"`
	IsEmailVerified bool      `json:"is_email_verified"`
	WarningCount    int       `json:"warning_count"`
	Tier            string    `json:"tier"`
	Balance         float64   `json:"balance"`
	JoinedAt        time.Time `json:"joined_at"`
}

func (s *AdminDashboardStore) ListUsers(ctx context.Context, role string, limit, offset int) ([]*AdminUserRow, int, error) {
	// role="" means all users
	query := `
		SELECT
			u.id, u.full_name, u.email, u.user_type,
			u.is_active, u.is_banned, u.is_email_verified,
			COALESCE(u.warning_count, 0),
			COALESCE(u.tier, 'bronze'),
			COALESCE(ub.available_balance, 0),
			u.created_at
		FROM users u
		LEFT JOIN user_balances ub ON ub.user_id = u.id
		WHERE ($1::text = '' OR u.user_type = $1)
		ORDER BY u.created_at DESC
		LIMIT $2 OFFSET $3
	`
	countQuery := `
		SELECT COUNT(*) FROM users WHERE ($1::text = '' OR user_type = $1)
	`

	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, role).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := s.db.QueryContext(ctx, query, role, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*AdminUserRow
	for rows.Next() {
		var u AdminUserRow
		if err := rows.Scan(
			&u.ID, &u.FullName, &u.Email, &u.Role,
			&u.IsActive, &u.IsBanned, &u.IsEmailVerified,
			&u.WarningCount, &u.Tier, &u.Balance, &u.JoinedAt,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, &u)
	}
	return users, total, rows.Err()
}

func (s *AdminDashboardStore) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, userID)
	return err
}

func (s *AdminDashboardStore) AddBalance(ctx context.Context, userID uuid.UUID, amount float64) error {
	query := `
		INSERT INTO user_balances (id, user_id, available_balance, currency)
		VALUES (gen_random_uuid(), $1, $2, 'USD')
		ON CONFLICT (user_id) DO UPDATE
		SET available_balance = user_balances.available_balance + $2,
		    updated_at = NOW()
	`
	_, err := s.db.ExecContext(ctx, query, userID, amount)
	return err
}

// DeductBalance subtracts amount from the user's available_balance.
// Balance is floored at 0 — it will never go negative.
func (s *AdminDashboardStore) DeductBalance(ctx context.Context, userID uuid.UUID, amount float64) error {
	query := `
		UPDATE user_balances
		SET available_balance = GREATEST(available_balance - $2, 0),
		    updated_at        = NOW()
		WHERE user_id = $1
	`
	_, err := s.db.ExecContext(ctx, query, userID, amount)
	return err
}

func (s *AdminDashboardStore) IncrementWarning(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		UPDATE users
		SET warning_count = warning_count + 1, updated_at = NOW()
		WHERE id = $1
		RETURNING warning_count
	`
	var count int
	err := s.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}

// ─── Support ─────────────────────────────────────────────────────────────────

type SupportConversationRow struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	UserName    string     `json:"user_name"`
	UserEmail   string     `json:"user_email"`
	LastMessage string     `json:"last_message"`
	LastMsgAt   *time.Time `json:"last_message_at"`
	Unread      int        `json:"unread"`
	Status      string     `json:"status"`
}

func (s *AdminDashboardStore) ListSupportConversations(ctx context.Context, limit, offset int) ([]*SupportConversationRow, int, error) {
	countQuery := `SELECT COUNT(*) FROM conversations WHERE kind = 'support'`
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT
			c.id,
			u.id,
			u.full_name,
			u.email,
			COALESCE(
				(SELECT body FROM messages
				 WHERE conversation_id = c.id
				 ORDER BY sent_at DESC LIMIT 1),
				''
			) AS last_message,
			c.last_message_at,
			'open' AS status
		FROM conversations c
		JOIN conversation_participants cp ON cp.conversation_id = c.id
		JOIN users u ON u.id = cp.user_id
		WHERE c.kind = 'support'
		ORDER BY c.last_message_at DESC NULLS LAST
		LIMIT $1 OFFSET $2
	`
	rows, err := s.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var convs []*SupportConversationRow
	for rows.Next() {
		var c SupportConversationRow
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.UserName, &c.UserEmail,
			&c.LastMessage, &c.LastMsgAt, &c.Status,
		); err != nil {
			return nil, 0, err
		}
		c.Unread = 0
		convs = append(convs, &c)
	}
	return convs, total, rows.Err()
}

type SupportMessageRow struct {
	ID          uuid.UUID `json:"id"`
	Sender      string    `json:"sender"` // "user" or "admin"
	SenderName  string    `json:"sender_name"`
	Text        string    `json:"text"`
	SentAt      time.Time `json:"sent_at"`
}

func (s *AdminDashboardStore) GetSupportMessages(ctx context.Context, conversationID uuid.UUID, limit int) ([]*SupportMessageRow, error) {
	query := `
		SELECT
			m.id,
			CASE WHEN m.sender_user_id IS NOT NULL THEN 'user' ELSE 'admin' END AS sender,
			CASE
				WHEN m.sender_user_id IS NOT NULL THEN COALESCE(u.full_name, 'مستخدم')
				ELSE COALESCE(a.full_name, 'الإدارة')
			END AS sender_name,
			m.body,
			m.sent_at
		FROM messages m
		LEFT JOIN users  u ON u.id = m.sender_user_id
		LEFT JOIN admins a ON a.id = m.sender_admin_id
		WHERE m.conversation_id = $1
		  AND m.deleted_at IS NULL
		ORDER BY m.sent_at ASC
		LIMIT $2
	`
	rows, err := s.db.QueryContext(ctx, query, conversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []*SupportMessageRow
	for rows.Next() {
		var m SupportMessageRow
		if err := rows.Scan(&m.ID, &m.Sender, &m.SenderName, &m.Text, &m.SentAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, &m)
	}
	return msgs, rows.Err()
}

func (s *AdminDashboardStore) CreateAdminSupportMessage(ctx context.Context, conversationID, adminID uuid.UUID, body string) (*SupportMessageRow, error) {
	query := `
		INSERT INTO messages (id, conversation_id, sender_admin_id, body, sent_at)
		VALUES (gen_random_uuid(), $1, $2, $3, NOW())
		RETURNING id, sent_at
	`
	var m SupportMessageRow
	m.Sender = "admin"
	m.Text = body
	err := s.db.QueryRowContext(ctx, query, conversationID, adminID, body).Scan(&m.ID, &m.SentAt)
	if err != nil {
		return nil, err
	}

	// Update last_message_at on the conversation
	_, _ = s.db.ExecContext(ctx,
		`UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
		conversationID,
	)

	return &m, nil
}
