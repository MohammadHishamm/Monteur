package entity

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Showcase struct {
	ID            uuid.UUID       `db:"id" json:"id"`
	FreelancerID  uuid.UUID       `db:"freelancer_id" json:"freelancer_id"`
	Title         string          `db:"title" json:"title"`
	Summary       string          `db:"summary" json:"summary"`
	Category      string          `db:"category" json:"category"`
	YearLabel     string          `db:"year_label" json:"year"`
	DurationLabel string          `db:"duration_label" json:"duration"`
	RoleLabel     string          `db:"role_label" json:"role"`
	ClientName    string          `db:"client_name" json:"client"`
	Industry      string          `db:"industry" json:"industry"`
	LiveURL       *string         `db:"live_url" json:"live_url,omitempty"`
	CoverURL      *string         `db:"cover_url" json:"cover,omitempty"`
	Description   string          `db:"description" json:"description"`
	Challenge     string          `db:"challenge" json:"challenge"`
	Approach      string          `db:"approach" json:"approach"`
	Outcome       string          `db:"outcome" json:"outcome"`
	Tags          []string        `db:"tags" json:"tags"`
	Deliverables  []string        `db:"deliverables" json:"deliverables"`
	Metrics       json.RawMessage `db:"metrics" json:"metrics"`
	Gallery       json.RawMessage `db:"gallery" json:"gallery"`
	IsFeatured    bool            `db:"is_featured" json:"is_featured"`
	DisplayOrder  int             `db:"display_order" json:"display_order"`
	VideoURL      *string         `db:"video_url" json:"video_url,omitempty"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time       `db:"updated_at" json:"updated_at"`

	// Computed
	Color string `db:"-" json:"color"`
}

type ShowcaseUpsertInput struct {
	Title         string          `json:"title"`
	Summary       string          `json:"summary"`
	Category      string          `json:"category"`
	YearLabel     string          `json:"year"`
	DurationLabel string          `json:"duration"`
	RoleLabel     string          `json:"role"`
	ClientName    string          `json:"client"`
	Industry      string          `json:"industry"`
	LiveURL       *string         `json:"live_url,omitempty"`
	CoverURL      *string         `json:"cover,omitempty"`
	Description   string          `json:"description"`
	Challenge     string          `json:"challenge"`
	Approach      string          `json:"approach"`
	Outcome       string          `json:"outcome"`
	Tags          []string        `json:"tags"`
	Deliverables  []string        `json:"deliverables"`
	Metrics       json.RawMessage `json:"metrics"`
	Gallery       json.RawMessage `json:"gallery"`
	IsFeatured    bool            `json:"is_featured"`
	DisplayOrder  int             `json:"display_order"`
	VideoURL      *string         `json:"video_url,omitempty"`
}
