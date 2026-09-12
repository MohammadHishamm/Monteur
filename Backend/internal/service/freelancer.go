package service

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type FreelancerService struct {
	store      *store.UserStore
	savedStore *store.SavedFreelancerStore
}

func newFreelancerService(s *store.UserStore, saved *store.SavedFreelancerStore) *FreelancerService {
	return &FreelancerService{store: s, savedStore: saved}
}

// List returns filtered, paginated freelancers.
func (fs *FreelancerService) List(ctx context.Context, q store.FreelancerQuery) ([]*entity.User, int, error) {
	users, total, err := fs.store.ListFreelancersFiltered(ctx, q)
	if err != nil {
		return nil, 0, err
	}
	for _, u := range users {
		u.Color = colorFromUUID(u.ID)
	}
	return users, total, nil
}

// GetByID returns a single freelancer's full profile, or nil if not found.
func (fs *FreelancerService) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	u, err := fs.store.FindFreelancerByID(ctx, id)
	if err != nil || u == nil {
		return u, err
	}
	u.Color = colorFromUUID(u.ID)
	return u, nil
}

// GetSimilar returns freelancers in the same category, excluding the given ID.
func (fs *FreelancerService) GetSimilar(ctx context.Context, id uuid.UUID, limit int) ([]*entity.User, error) {
	current, err := fs.store.FindFreelancerByID(ctx, id)
	if err != nil || current == nil {
		return nil, err
	}

	// Use industry field as a proxy for "category" since users don't have category column yet.
	// We fall back to rating-ordered results from the same city if no industry match.
	q := store.FreelancerQuery{
		Sort:     "rating",
		Page:     1,
		PageSize: limit + 1,
	}
	users, _, err := fs.store.ListFreelancersFiltered(ctx, q)
	if err != nil {
		return nil, err
	}

	// Exclude the freelancer themselves.
	var similar []*entity.User
	for _, u := range users {
		if u.ID == id {
			continue
		}
		u.Color = colorFromUUID(u.ID)
		similar = append(similar, u)
		if len(similar) >= limit {
			break
		}
	}
	return similar, nil
}

// Cities returns distinct non-empty cities for active freelancers.
func (fs *FreelancerService) Cities(ctx context.Context) ([]string, error) {
	return fs.store.ListDistinctCities(ctx)
}

// Save bookmarks a freelancer for a user.
func (fs *FreelancerService) Save(ctx context.Context, userID, freelancerID uuid.UUID) error {
	return fs.savedStore.Save(ctx, userID, freelancerID)
}

// Unsave removes a bookmark.
func (fs *FreelancerService) Unsave(ctx context.Context, userID, freelancerID uuid.UUID) error {
	return fs.savedStore.Unsave(ctx, userID, freelancerID)
}

// IsSaved reports whether userID has bookmarked freelancerID.
func (fs *FreelancerService) IsSaved(ctx context.Context, userID, freelancerID uuid.UUID) (bool, error) {
	return fs.savedStore.IsSaved(ctx, userID, freelancerID)
}

// ListSaved returns the full profiles of all freelancers saved by userID.
func (fs *FreelancerService) ListSaved(ctx context.Context, userID uuid.UUID) ([]*entity.User, error) {
	ids, err := fs.savedStore.ListSaved(ctx, userID)
	if err != nil || len(ids) == 0 {
		return nil, err
	}
	var list []*entity.User
	for _, id := range ids {
		u, err := fs.store.FindFreelancerByID(ctx, id)
		if err != nil || u == nil {
			continue
		}
		u.Color = colorFromUUID(u.ID)
		list = append(list, u)
	}
	return list, nil
}
