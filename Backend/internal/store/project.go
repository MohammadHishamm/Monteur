package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

// ErrJobNotOpen is returned when a hire is attempted on a job that is no longer
// accepting hires (already in progress, completed, or closed).
var ErrJobNotOpen = errors.New("job is no longer open for hiring")

type ProjectStore struct {
	db *sql.DB
}

func newProjectStore(db *sql.DB) *ProjectStore {
	return &ProjectStore{db: db}
}

const projectSelectCols = `
	p.id, p.job_id, p.proposal_id, p.client_id, p.freelancer_id,
	p.title, p.category, p.budget_type, p.amount, p.progress,
	p.escrow_funded, p.status, p.due_at, p.completed_at, p.created_at, p.updated_at,
	COALESCE(cu.full_name, ''), COALESCE(fu.full_name, '')
`

func scanProject(row interface {
	Scan(...any) error
}) (*entity.Project, error) {
	var p entity.Project
	err := row.Scan(
		&p.ID, &p.JobID, &p.ProposalID, &p.ClientID, &p.FreelancerID,
		&p.Title, &p.Category, &p.BudgetType, &p.Amount, &p.Progress,
		&p.EscrowFunded, &p.Status, &p.DueAt, &p.CompletedAt, &p.CreatedAt, &p.UpdatedAt,
		&p.ClientName, &p.FreelancerName,
	)
	return &p, err
}

const projectJoins = `
	FROM projects p
	JOIN users cu ON cu.id = p.client_id
	JOIN users fu ON fu.id = p.freelancer_id
`

// ListByFreelancer returns active/paused projects for a freelancer.
func (s *ProjectStore) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID, limit, offset int) ([]*entity.Project, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM projects WHERE freelancer_id = $1 AND status IN ('active','paused')`,
		freelancerID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(
		`SELECT %s %s WHERE p.freelancer_id = $1 AND p.status IN ('active','paused') ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
		projectSelectCols, projectJoins,
	)
	rows, err := s.db.QueryContext(ctx, query, freelancerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	return scanProjects(rows, total)
}

// ListByClient returns all projects for a client.
func (s *ProjectStore) ListByClient(ctx context.Context, clientID uuid.UUID, limit, offset int) ([]*entity.Project, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM projects WHERE client_id = $1`,
		clientID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(
		`SELECT %s %s WHERE p.client_id = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
		projectSelectCols, projectJoins,
	)
	rows, err := s.db.QueryContext(ctx, query, clientID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	return scanProjects(rows, total)
}

// FindByID returns a single project by ID, or nil if not found.
func (s *ProjectStore) FindByID(ctx context.Context, id uuid.UUID) (*entity.Project, error) {
	query := fmt.Sprintf(
		`SELECT %s %s WHERE p.id = $1`,
		projectSelectCols, projectJoins,
	)
	row := s.db.QueryRowContext(ctx, query, id)
	p, err := scanProject(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

// CountActiveByFreelancer counts active projects for a freelancer.
func (s *ProjectStore) CountActiveByFreelancer(ctx context.Context, freelancerID uuid.UUID) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM projects WHERE freelancer_id = $1 AND status IN ('active','paused')`,
		freelancerID,
	).Scan(&count)
	return count, err
}

// SumEarnedThisMonth returns the total amount earned by a freelancer in the current calendar month.
func (s *ProjectStore) SumEarnedThisMonth(ctx context.Context, freelancerID uuid.UUID) (float64, error) {
	var sum float64
	err := s.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0)
		FROM projects
		WHERE freelancer_id = $1
		  AND status = 'completed'
		  AND date_trunc('month', completed_at) = date_trunc('month', NOW())
	`, freelancerID).Scan(&sum)
	return sum, err
}

// CountActiveHiresByClient counts projects with active status for a client.
func (s *ProjectStore) CountActiveHiresByClient(ctx context.Context, clientID uuid.UUID) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM projects WHERE client_id = $1 AND status IN ('active','paused')`,
		clientID,
	).Scan(&count)
	return count, err
}

// SumEscrowByClient returns the total amount in escrow for a client.
func (s *ProjectStore) SumEscrowByClient(ctx context.Context, clientID uuid.UUID) (float64, error) {
	var sum float64
	err := s.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0)
		FROM projects
		WHERE client_id = $1 AND escrow_funded = true AND status IN ('active','paused')
	`, clientID).Scan(&sum)
	return sum, err
}

// HireFromProposal accepts a proposal, declines its siblings, marks the job
// in-progress, and creates the escrow-funded project — all in one transaction.
// Returns the created (or existing) project.
func (s *ProjectStore) HireFromProposal(ctx context.Context, proposalID uuid.UUID) (*entity.Project, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var (
		jobID, freelancerID, clientID     uuid.UUID
		bid                               float64
		budgetType, jobTitle, jobCategory string
		jobStatus                         string
	)
	// Lock the job row (FOR UPDATE) so concurrent hires can't both proceed.
	err = tx.QueryRowContext(ctx, `
		SELECT p.job_id, p.freelancer_id, p.bid_amount, p.budget_type,
		       j.client_id, j.title, j.category, j.status
		FROM proposals p
		JOIN jobs j ON j.id = p.job_id
		WHERE p.id = $1
		FOR UPDATE OF j
	`, proposalID).Scan(&jobID, &freelancerID, &bid, &budgetType, &clientID, &jobTitle, &jobCategory, &jobStatus)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if jobStatus != "open" {
		return nil, ErrJobNotOpen
	}

	// Accept this proposal; decline the open siblings.
	if _, err = tx.ExecContext(ctx,
		`UPDATE proposals SET status='accepted', responded_at=NOW(), updated_at=NOW() WHERE id=$1`,
		proposalID,
	); err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `
		UPDATE proposals SET status='declined', responded_at=NOW(), updated_at=NOW()
		WHERE job_id=$1 AND id<>$2 AND status IN ('pending','viewed','shortlisted')
	`, jobID, proposalID); err != nil {
		return nil, err
	}

	// Mark the job hired.
	if _, err = tx.ExecContext(ctx,
		`UPDATE jobs SET hired_freelancer_id=$1, status='in_progress', updated_at=NOW() WHERE id=$2`,
		freelancerID, jobID,
	); err != nil {
		return nil, err
	}

	projectID, err := upsertProjectTx(ctx, tx, jobID, &proposalID, clientID, freelancerID, jobTitle, jobCategory, budgetType, bid)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.FindByID(ctx, projectID)
}

// HireFreelancerForJob hires a freelancer directly for a job (AI best-match flow,
// no proposal). Marks the job in-progress and creates the escrow-funded project.
func (s *ProjectStore) HireFreelancerForJob(ctx context.Context, jobID, freelancerID uuid.UUID) (*entity.Project, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var (
		clientID                          uuid.UUID
		jobTitle, jobCategory, budgetType string
		budgetMax                         float64
		jobStatus                         string
	)
	err = tx.QueryRowContext(ctx, `
		SELECT client_id, title, category, budget_type, budget_max, status
		FROM jobs WHERE id = $1
		FOR UPDATE
	`, jobID).Scan(&clientID, &jobTitle, &jobCategory, &budgetType, &budgetMax, &jobStatus)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if jobStatus != "open" {
		return nil, ErrJobNotOpen
	}

	if _, err = tx.ExecContext(ctx,
		`UPDATE jobs SET hired_freelancer_id=$1, status='in_progress', updated_at=NOW() WHERE id=$2`,
		freelancerID, jobID,
	); err != nil {
		return nil, err
	}

	projectID, err := upsertProjectTx(ctx, tx, jobID, nil, clientID, freelancerID, jobTitle, jobCategory, budgetType, budgetMax)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.FindByID(ctx, projectID)
}

// upsertProjectTx returns the existing project for a job, or inserts a new
// escrow-funded one. Runs inside the caller's transaction.
func upsertProjectTx(ctx context.Context, tx *sql.Tx, jobID uuid.UUID, proposalID *uuid.UUID,
	clientID, freelancerID uuid.UUID, title, category, budgetType string, amount float64) (uuid.UUID, error) {

	var projectID uuid.UUID
	err := tx.QueryRowContext(ctx, `SELECT id FROM projects WHERE job_id=$1 LIMIT 1`, jobID).Scan(&projectID)
	if err == nil {
		return projectID, nil // already exists — idempotent
	}
	if err != sql.ErrNoRows {
		return uuid.Nil, err
	}

	projectID = uuid.New()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO projects
			(id, job_id, proposal_id, client_id, freelancer_id, title, category, budget_type, amount, escrow_funded, status, due_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'active', NOW() + INTERVAL '14 days')
	`, projectID, jobID, proposalID, clientID, freelancerID, title, category, budgetType, amount)
	if err != nil {
		return uuid.Nil, err
	}
	return projectID, nil
}

// UpdateProgress sets a project's progress (0–100). Only the assigned freelancer
// may update it, and only while the project is active/paused.
func (s *ProjectStore) UpdateProgress(ctx context.Context, projectID, freelancerID uuid.UUID, progress int) (*entity.Project, error) {
	res, err := s.db.ExecContext(ctx, `
		UPDATE projects
		SET progress = $1, updated_at = NOW()
		WHERE id = $2 AND freelancer_id = $3 AND status IN ('active','paused')
	`, progress, projectID, freelancerID)
	if err != nil {
		return nil, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return nil, nil
	}
	return s.FindByID(ctx, projectID)
}

// Complete marks a project as completed (visual close only — no payment transfer).
// Only the owning client may complete it. Also marks the linked job as completed.
func (s *ProjectStore) Complete(ctx context.Context, projectID, clientID uuid.UUID) (*entity.Project, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var jobID uuid.UUID
	err = tx.QueryRowContext(ctx, `
		UPDATE projects
		SET status = 'completed', progress = 100, completed_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND client_id = $2 AND status IN ('active','paused')
		RETURNING job_id
	`, projectID, clientID).Scan(&jobID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE jobs SET status = 'completed', updated_at = NOW() WHERE id = $1
	`, jobID); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return s.FindByID(ctx, projectID)
}

func scanProjects(rows *sql.Rows, total int) ([]*entity.Project, int, error) {
	defer rows.Close()
	var list []*entity.Project
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, p)
	}
	return list, total, rows.Err()
}
