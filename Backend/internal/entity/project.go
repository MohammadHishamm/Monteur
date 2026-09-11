package entity

import (
	"time"

	"github.com/google/uuid"
)

type Project struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	JobID        uuid.UUID  `db:"job_id" json:"job_id"`
	ProposalID   *uuid.UUID `db:"proposal_id" json:"proposal_id,omitempty"`
	ClientID     uuid.UUID  `db:"client_id" json:"client_id"`
	FreelancerID uuid.UUID  `db:"freelancer_id" json:"freelancer_id"`
	Title        string     `db:"title" json:"title"`
	Category     string     `db:"category" json:"category"`
	BudgetType   string     `db:"budget_type" json:"budget_type"`
	Amount       float64    `db:"amount" json:"amount"`
	Progress     int        `db:"progress" json:"progress"`
	EscrowFunded bool       `db:"escrow_funded" json:"escrow_funded"`
	Status       string     `db:"status" json:"status"`
	DueAt        *time.Time `db:"due_at" json:"due_at,omitempty"`
	CompletedAt  *time.Time `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`

	// Joined
	ClientName     string `db:"client_name" json:"client_name"`
	FreelancerName string `db:"freelancer_name" json:"freelancer_name"`

	// Computed
	Color string `db:"-" json:"color"`
}
