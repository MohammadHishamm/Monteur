package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type JobStore struct {
	db *sql.DB
}

func newJobStore(db *sql.DB) *JobStore {
	return &JobStore{db: db}
}

const jobSelectCols = `
	j.id, j.client_id, j.title, j.summary, j.description, j.category,
	j.skills, j.budget_type, j.budget_min, j.budget_max, j.duration_label,
	j.experience_tier, j.deliverables, j.urgent, j.status, j.proposals_count,
	j.hired_freelancer_id, j.aspect, j.posted_at, j.created_at, j.updated_at,
	COALESCE(u.full_name, ''), COALESCE(u.industry, ''), COALESCE(u.is_email_verified, false)
`

func scanJob(row interface {
	Scan(...any) error
}) (*entity.Job, error) {
	var j entity.Job
	var skills, deliverables []string
	// hired_freelancer_id is nullable UUID — scan as *string to avoid
	// uuid.UUID.Scan() erroring on nil (it doesn't handle NULL).
	var hiredStr *string
	err := row.Scan(
		&j.ID, &j.ClientID, &j.Title, &j.Summary, &j.Description, &j.Category,
		pq.Array(&skills), &j.BudgetType, &j.BudgetMin, &j.BudgetMax, &j.DurationLabel,
		&j.ExperienceTier, pq.Array(&deliverables), &j.Urgent, &j.Status, &j.ProposalsCount,
		&hiredStr, &j.Aspect, &j.PostedAt, &j.CreatedAt, &j.UpdatedAt,
		&j.ClientName, &j.ClientCountry, &j.ClientVerified,
	)
	if err != nil {
		return nil, err
	}
	j.Skills = skills
	j.Deliverables = deliverables
	if hiredStr != nil {
		if id, err := uuid.Parse(*hiredStr); err == nil {
			j.HiredFreelancerID = &id
		}
	}
	return &j, nil
}

// List returns paginated, filtered jobs and the total matching count.
func (s *JobStore) List(ctx context.Context, q entity.JobQuery) ([]*entity.Job, int, error) {
	where := []string{"j.status = 'open'"}
	args := []any{}
	n := 1

	if q.Category != "" {
		where = append(where, fmt.Sprintf("j.category = $%d", n))
		args = append(args, q.Category)
		n++
	}
	if q.Experience != "" {
		where = append(where, fmt.Sprintf("j.experience_tier = $%d", n))
		args = append(args, q.Experience)
		n++
	}
	if q.BudgetType != "" {
		where = append(where, fmt.Sprintf("j.budget_type = $%d", n))
		args = append(args, q.BudgetType)
		n++
	}
	if q.Search != "" {
		where = append(where, fmt.Sprintf(
			"(j.title ILIKE $%d OR j.summary ILIKE $%d OR j.description ILIKE $%d)",
			n, n, n,
		))
		args = append(args, "%"+q.Search+"%")
		n++
	}

	whereSQL := "WHERE " + strings.Join(where, " AND ")

	orderSQL := "ORDER BY j.posted_at DESC"
	switch q.Sort {
	case "budget":
		orderSQL = "ORDER BY j.budget_max DESC"
	case "proposals":
		orderSQL = "ORDER BY j.proposals_count ASC"
	}

	countQuery := `SELECT COUNT(*) FROM jobs j JOIN users u ON u.id = j.client_id ` + whereSQL
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
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
	listQuery := fmt.Sprintf(
		`SELECT %s FROM jobs j JOIN users u ON u.id = j.client_id %s %s LIMIT $%d OFFSET $%d`,
		jobSelectCols, whereSQL, orderSQL, n, n+1,
	)

	rows, err := s.db.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var jobs []*entity.Job
	for rows.Next() {
		j, err := scanJob(rows)
		if err != nil {
			return nil, 0, err
		}
		jobs = append(jobs, j)
	}
	return jobs, total, rows.Err()
}

// FindByID returns a single job by ID, or nil if not found.
func (s *JobStore) FindByID(ctx context.Context, id uuid.UUID) (*entity.Job, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM jobs j JOIN users u ON u.id = j.client_id WHERE j.id = $1`,
		jobSelectCols,
	)
	row := s.db.QueryRowContext(ctx, query, id)
	j, err := scanJob(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return j, err
}

// ListByClient returns open/in-progress jobs posted by a client.
func (s *JobStore) ListByClient(ctx context.Context, clientID uuid.UUID, limit, offset int) ([]*entity.Job, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM jobs WHERE client_id = $1`, clientID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(
		`SELECT %s FROM jobs j JOIN users u ON u.id = j.client_id WHERE j.client_id = $1 ORDER BY j.posted_at DESC LIMIT $2 OFFSET $3`,
		jobSelectCols,
	)
	rows, err := s.db.QueryContext(ctx, query, clientID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var jobs []*entity.Job
	for rows.Next() {
		j, err := scanJob(rows)
		if err != nil {
			return nil, 0, err
		}
		jobs = append(jobs, j)
	}
	return jobs, total, rows.Err()
}

// ListMatchingFreelancer returns open jobs whose skills overlap with the given skill set.
func (s *JobStore) ListMatchingFreelancer(ctx context.Context, skills []string, limit int) ([]*entity.Job, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM jobs j JOIN users u ON u.id = j.client_id
		 WHERE j.status = 'open' AND j.skills && $1
		 ORDER BY j.posted_at DESC LIMIT $2`,
		jobSelectCols,
	)
	rows, err := s.db.QueryContext(ctx, query, pq.Array(skills), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []*entity.Job
	for rows.Next() {
		j, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

// UpdateStatus changes a job's status (e.g. "open" → "closed").
func (s *JobStore) UpdateStatus(ctx context.Context, jobID uuid.UUID, status string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, jobID,
	)
	return err
}

// Update edits mutable fields on a job (title, summary, description, budget, etc.).
func (s *JobStore) Update(ctx context.Context, j *entity.Job) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE jobs SET
			title = $1, summary = $2, description = $3,
			budget_type = $4, budget_min = $5, budget_max = $6,
			duration_label = $7, experience_tier = $8,
			urgent = $9, updated_at = NOW()
		WHERE id = $10
	`, j.Title, j.Summary, j.Description, j.BudgetType, j.BudgetMin, j.BudgetMax,
		j.DurationLabel, j.ExperienceTier, j.Urgent, j.ID)
	return err
}

// Create inserts a new job and returns the created record.
func (s *JobStore) Create(ctx context.Context, j *entity.Job) error {
	query := `
		INSERT INTO jobs (id, client_id, title, summary, description, category, skills,
			budget_type, budget_min, budget_max, duration_label, experience_tier,
			deliverables, urgent, status, aspect)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'open',$15)
	`
	_, err := s.db.ExecContext(ctx, query,
		j.ID, j.ClientID, j.Title, j.Summary, j.Description, j.Category,
		pq.Array(j.Skills), j.BudgetType, j.BudgetMin, j.BudgetMax,
		j.DurationLabel, j.ExperienceTier, pq.Array(j.Deliverables),
		j.Urgent, j.Aspect,
	)
	return err
}
