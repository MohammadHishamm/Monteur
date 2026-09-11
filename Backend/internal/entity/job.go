package entity

import (
	"time"

	"github.com/google/uuid"
)

type Job struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	ClientID          uuid.UUID  `db:"client_id" json:"client_id"`
	Title             string     `db:"title" json:"title"`
	Summary           string     `db:"summary" json:"summary"`
	Description       string     `db:"description" json:"description"`
	Category          string     `db:"category" json:"category"`
	Skills            []string   `db:"skills" json:"skills"`
	BudgetType        string     `db:"budget_type" json:"budget_type"`
	BudgetMin         float64    `db:"budget_min" json:"budget_min"`
	BudgetMax         float64    `db:"budget_max" json:"budget_max"`
	DurationLabel     string     `db:"duration_label" json:"duration"`
	ExperienceTier    string     `db:"experience_tier" json:"experience"`
	Deliverables      []string   `db:"deliverables" json:"deliverables"`
	Urgent            bool       `db:"urgent" json:"urgent"`
	Status            string     `db:"status" json:"status"`
	ProposalsCount    int        `db:"proposals_count" json:"proposals"`
	HiredFreelancerID *uuid.UUID `db:"hired_freelancer_id" json:"hired_freelancer_id,omitempty"`
	Aspect            *string    `db:"aspect" json:"aspect,omitempty"`
	PostedAt          time.Time  `db:"posted_at" json:"posted_at"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`

	// Joined from users (client)
	ClientName     string `db:"client_name" json:"client_name"`
	ClientCountry  string `db:"client_country" json:"client_country"`
	ClientVerified bool   `db:"client_verified" json:"client_verified"`

	// Computed
	Color          string `db:"-" json:"color"`
	PostedOrder    int    `db:"-" json:"posted_order"`
	AlreadyApplied bool   `db:"-" json:"already_applied"`
}

type JobCreateInput struct {
	Title          string   `json:"title"`
	Summary        string   `json:"summary"`
	Description    string   `json:"description"`
	Category       string   `json:"category"`
	Skills         []string `json:"skills"`
	BudgetType     string   `json:"budget_type"`
	BudgetMin      float64  `json:"budget_min"`
	BudgetMax      float64  `json:"budget_max"`
	DurationLabel  string   `json:"duration_label"`
	ExperienceTier string   `json:"experience_tier"`
	Deliverables   []string `json:"deliverables"`
	Urgent         bool     `json:"urgent"`
	Aspect         *string  `json:"aspect,omitempty"`
}

type JobQuery struct {
	Search     string
	Category   string
	Experience string
	BudgetType string
	Sort       string // "recent" | "budget" | "proposals"
	Page       int
	PageSize   int
}
