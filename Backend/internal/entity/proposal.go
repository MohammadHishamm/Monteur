package entity

import (
	"time"

	"github.com/google/uuid"
)

type Proposal struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	JobID             uuid.UUID  `db:"job_id" json:"job_id"`
	FreelancerID      uuid.UUID  `db:"freelancer_id" json:"freelancer_id"`
	CoverLetter       string     `db:"cover_letter" json:"cover_letter"`
	BidAmount         float64    `db:"bid_amount" json:"bid"`
	BudgetType        string     `db:"budget_type" json:"budget_type"`
	DeliveryTimeLabel string     `db:"delivery_time_label" json:"delivery_time"`
	Status            string     `db:"status" json:"status"`
	ClientMessage     string     `db:"client_message" json:"client_message"`
	SubmittedAt       time.Time  `db:"submitted_at" json:"submitted_at"`
	ViewedAt          *time.Time `db:"viewed_at" json:"viewed_at,omitempty"`
	RespondedAt       *time.Time `db:"responded_at" json:"responded_at,omitempty"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`

	// Joined — job / client
	JobTitle   string `db:"job_title" json:"job_title"`
	ClientName string `db:"client_name" json:"client_name"`
	Category   string `db:"category" json:"category"`

	// Joined — freelancer
	FreelancerName     string   `db:"freelancer_name" json:"freelancer_name"`
	FreelancerRole     string   `db:"freelancer_role" json:"freelancer_role"`
	FreelancerTier     string   `db:"freelancer_tier" json:"freelancer_tier"`
	FreelancerRating   float64  `db:"freelancer_rating" json:"freelancer_rating"`
	FreelancerReviews  int      `db:"freelancer_reviews" json:"freelancer_reviews"`
	FreelancerVerified bool     `db:"freelancer_verified" json:"freelancer_verified"`
	FreelancerAvatar   *string  `db:"freelancer_avatar" json:"freelancer_avatar,omitempty"`

	// Computed
	Color string `db:"-" json:"color"`
}

type ProposalCreateInput struct {
	JobID             string  `json:"job_id"`
	CoverLetter       string  `json:"cover_letter"`
	BidAmount         float64 `json:"bid"`
	BudgetType        string  `json:"budget_type"`
	DeliveryTimeLabel string  `json:"delivery_time"`
}
