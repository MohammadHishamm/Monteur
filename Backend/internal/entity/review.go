package entity

import (
	"time"

	"github.com/google/uuid"
)

type Review struct {
	ID         uuid.UUID `json:"id"`
	ProjectID  uuid.UUID `json:"project_id"`
	ReviewerID uuid.UUID `json:"reviewer_id"`
	RevieweeID uuid.UUID `json:"reviewee_id"`
	Rating     int       `json:"rating"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"created_at"`

	// Joined
	ReviewerName   string  `json:"reviewer_name"`
	ReviewerAvatar *string `json:"reviewer_avatar,omitempty"`
}
