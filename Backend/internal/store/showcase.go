package store

import (
	"context"
	"database/sql"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type ShowcaseStore struct {
	db *sql.DB
}

func newShowcaseStore(db *sql.DB) *ShowcaseStore {
	return &ShowcaseStore{db: db}
}

const showcaseSelectCols = `
	id, freelancer_id, title, summary, category,
	year_label, duration_label, role_label, client_name, industry,
	live_url, cover_url, description, challenge, approach, outcome,
	tags, deliverables, metrics, gallery, is_featured, display_order,
	video_url,
	created_at, updated_at
`

func scanShowcase(row interface {
	Scan(...any) error
}) (*entity.Showcase, error) {
	var s entity.Showcase
	var tags, deliverables []string
	err := row.Scan(
		&s.ID, &s.FreelancerID, &s.Title, &s.Summary, &s.Category,
		&s.YearLabel, &s.DurationLabel, &s.RoleLabel, &s.ClientName, &s.Industry,
		&s.LiveURL, &s.CoverURL, &s.Description, &s.Challenge, &s.Approach, &s.Outcome,
		pq.Array(&tags), pq.Array(&deliverables), &s.Metrics, &s.Gallery,
		&s.IsFeatured, &s.DisplayOrder,
		&s.VideoURL,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	s.Tags = tags
	s.Deliverables = deliverables
	return &s, nil
}

// ListByFreelancer returns all showcases for a freelancer ordered by display_order.
func (s *ShowcaseStore) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID) ([]*entity.Showcase, error) {
	query := `SELECT ` + showcaseSelectCols + ` FROM freelancer_showcases WHERE freelancer_id = $1 ORDER BY display_order ASC, created_at DESC`
	rows, err := s.db.QueryContext(ctx, query, freelancerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*entity.Showcase
	for rows.Next() {
		sc, err := scanShowcase(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, sc)
	}
	return list, rows.Err()
}

// FindByID returns a single showcase by ID, or nil if not found.
func (s *ShowcaseStore) FindByID(ctx context.Context, id uuid.UUID) (*entity.Showcase, error) {
	query := `SELECT ` + showcaseSelectCols + ` FROM freelancer_showcases WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id)
	sc, err := scanShowcase(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return sc, err
}

// Upsert inserts or updates a showcase record.
func (s *ShowcaseStore) Upsert(ctx context.Context, sc *entity.Showcase) error {
	query := `
		INSERT INTO freelancer_showcases (
			id, freelancer_id, title, summary, category,
			year_label, duration_label, role_label, client_name, industry,
			live_url, cover_url, description, challenge, approach, outcome,
			tags, deliverables, metrics, gallery, is_featured, display_order, video_url
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
		)
		ON CONFLICT (id) DO UPDATE SET
			title=$3, summary=$4, category=$5,
			year_label=$6, duration_label=$7, role_label=$8, client_name=$9, industry=$10,
			live_url=$11, cover_url=$12, description=$13, challenge=$14, approach=$15, outcome=$16,
			tags=$17, deliverables=$18, metrics=$19, gallery=$20, is_featured=$21, display_order=$22,
			video_url=$23, updated_at=NOW()
	`
	_, err := s.db.ExecContext(ctx, query,
		sc.ID, sc.FreelancerID, sc.Title, sc.Summary, sc.Category,
		sc.YearLabel, sc.DurationLabel, sc.RoleLabel, sc.ClientName, sc.Industry,
		sc.LiveURL, sc.CoverURL, sc.Description, sc.Challenge, sc.Approach, sc.Outcome,
		pq.Array(sc.Tags), pq.Array(sc.Deliverables), sc.Metrics, sc.Gallery,
		sc.IsFeatured, sc.DisplayOrder, sc.VideoURL,
	)
	return err
}

// Delete removes a showcase owned by a specific freelancer.
func (s *ShowcaseStore) Delete(ctx context.Context, id, freelancerID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM freelancer_showcases WHERE id = $1 AND freelancer_id = $2`,
		id, freelancerID,
	)
	return err
}
