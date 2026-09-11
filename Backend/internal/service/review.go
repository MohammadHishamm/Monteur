package service

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type ReviewService struct {
	store *store.ReviewStore
}

func newReviewService(s *store.ReviewStore) *ReviewService {
	return &ReviewService{store: s}
}

func (rs *ReviewService) Create(ctx context.Context, projectID, reviewerID uuid.UUID, rating int, body string) (*entity.Review, error) {
	return rs.store.Create(ctx, projectID, reviewerID, rating, body)
}

func (rs *ReviewService) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID) ([]*entity.Review, error) {
	return rs.store.ListByFreelancer(ctx, freelancerID)
}

func (rs *ReviewService) HasReviewed(ctx context.Context, projectID, reviewerID uuid.UUID) (bool, error) {
	return rs.store.HasReviewed(ctx, projectID, reviewerID)
}
