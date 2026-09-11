package store

import (
	"context"
	"database/sql"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

type ProposalStore struct {
	db *sql.DB
}

func newProposalStore(db *sql.DB) *ProposalStore {
	return &ProposalStore{db: db}
}

const proposalSelectCols = `
	p.id, p.job_id, p.freelancer_id, p.cover_letter, p.bid_amount, p.budget_type,
	p.delivery_time_label, p.status, p.client_message,
	p.submitted_at, p.viewed_at, p.responded_at, p.created_at, p.updated_at,
	COALESCE(j.title, ''), COALESCE(cu.full_name, ''), COALESCE(j.category, ''),
	COALESCE(fu.full_name, ''), COALESCE(fu.tagline, ''), COALESCE(fu.tier, 'bronze'),
	COALESCE(fu.rating, 0), COALESCE(fu.total_reviews, 0), COALESCE(fu.is_email_verified, false),
	fu.avatar_url
`

func scanProposal(row interface {
	Scan(...any) error
}) (*entity.Proposal, error) {
	var p entity.Proposal
	err := row.Scan(
		&p.ID, &p.JobID, &p.FreelancerID, &p.CoverLetter, &p.BidAmount, &p.BudgetType,
		&p.DeliveryTimeLabel, &p.Status, &p.ClientMessage,
		&p.SubmittedAt, &p.ViewedAt, &p.RespondedAt, &p.CreatedAt, &p.UpdatedAt,
		&p.JobTitle, &p.ClientName, &p.Category,
		&p.FreelancerName, &p.FreelancerRole, &p.FreelancerTier,
		&p.FreelancerRating, &p.FreelancerReviews, &p.FreelancerVerified,
		&p.FreelancerAvatar,
	)
	return &p, err
}

// Create inserts a new proposal.
func (s *ProposalStore) Create(ctx context.Context, p *entity.Proposal) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err = tx.ExecContext(ctx, `
		INSERT INTO proposals (id, job_id, freelancer_id, cover_letter, bid_amount,
			budget_type, delivery_time_label, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
	`, p.ID, p.JobID, p.FreelancerID, p.CoverLetter,
		p.BidAmount, p.BudgetType, p.DeliveryTimeLabel,
	); err != nil {
		return err
	}

	// Keep the denormalized count on the job in sync for dashboard/list badges.
	if _, err = tx.ExecContext(ctx,
		`UPDATE jobs SET proposals_count = proposals_count + 1, updated_at = NOW() WHERE id = $1`,
		p.JobID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

// ListByFreelancer returns proposals sent by a freelancer (newest first).
func (s *ProposalStore) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID, limit, offset int) ([]*entity.Proposal, error) {
	query := `
		SELECT ` + proposalSelectCols + `
		FROM proposals p
		JOIN jobs j ON j.id = p.job_id
		JOIN users cu ON cu.id = j.client_id
		JOIN users fu ON fu.id = p.freelancer_id
		WHERE p.freelancer_id = $1
		ORDER BY p.submitted_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := s.db.QueryContext(ctx, query, freelancerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*entity.Proposal
	for rows.Next() {
		p, err := scanProposal(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// ListByJob returns proposals received for a job (newest first).
func (s *ProposalStore) ListByJob(ctx context.Context, jobID uuid.UUID, limit, offset int) ([]*entity.Proposal, error) {
	query := `
		SELECT ` + proposalSelectCols + `
		FROM proposals p
		JOIN jobs j ON j.id = p.job_id
		JOIN users cu ON cu.id = j.client_id
		JOIN users fu ON fu.id = p.freelancer_id
		WHERE p.job_id = $1
		ORDER BY p.submitted_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := s.db.QueryContext(ctx, query, jobID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*entity.Proposal
	for rows.Next() {
		p, err := scanProposal(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// ListByClient returns all proposals received for a client's jobs (newest first).
func (s *ProposalStore) ListByClient(ctx context.Context, clientID uuid.UUID, limit, offset int) ([]*entity.Proposal, error) {
	query := `
		SELECT ` + proposalSelectCols + `
		FROM proposals p
		JOIN jobs j ON j.id = p.job_id
		JOIN users cu ON cu.id = j.client_id
		JOIN users fu ON fu.id = p.freelancer_id
		WHERE j.client_id = $1
		ORDER BY p.submitted_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := s.db.QueryContext(ctx, query, clientID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*entity.Proposal
	for rows.Next() {
		p, err := scanProposal(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// CountActiveByFreelancer counts pending/viewed/shortlisted proposals for a freelancer.
func (s *ProposalStore) CountActiveByFreelancer(ctx context.Context, freelancerID uuid.UUID) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM proposals WHERE freelancer_id = $1 AND status IN ('pending','viewed','shortlisted')`,
		freelancerID,
	).Scan(&count)
	return count, err
}

// JobStatus returns the status of a job (e.g. "open", "in_progress", "closed").
func (s *ProposalStore) JobStatus(ctx context.Context, jobID uuid.UUID) (string, error) {
	var status string
	err := s.db.QueryRowContext(ctx,
		`SELECT status FROM jobs WHERE id = $1`, jobID,
	).Scan(&status)
	return status, err
}

// ExistsByJobAndFreelancer reports whether a freelancer already submitted a proposal for a job.
func (s *ProposalStore) ExistsByJobAndFreelancer(ctx context.Context, jobID, freelancerID uuid.UUID) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM proposals WHERE job_id = $1 AND freelancer_id = $2)`,
		jobID, freelancerID,
	).Scan(&exists)
	return exists, err
}

// UpdateStatus changes a proposal's status.
func (s *ProposalStore) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE proposals SET status = $1, responded_at = NOW(), updated_at = NOW() WHERE id = $2`,
		status, id,
	)
	return err
}

// FindByID returns a single proposal by ID.
func (s *ProposalStore) FindByID(ctx context.Context, id uuid.UUID) (*entity.Proposal, error) {
	query := `
		SELECT ` + proposalSelectCols + `
		FROM proposals p
		JOIN jobs j ON j.id = p.job_id
		JOIN users cu ON cu.id = j.client_id
		WHERE p.id = $1
	`
	row := s.db.QueryRowContext(ctx, query, id)
	p, err := scanProposal(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}
