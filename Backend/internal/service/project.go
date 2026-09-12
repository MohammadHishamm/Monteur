package service

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type ProjectService struct {
	store *store.ProjectStore
}

func newProjectService(s *store.ProjectStore) *ProjectService {
	return &ProjectService{store: s}
}

// ListByFreelancer returns active projects for a freelancer.
func (ps *ProjectService) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID, limit, offset int) ([]*entity.Project, int, error) {
	list, total, err := ps.store.ListByFreelancer(ctx, freelancerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	for _, p := range list {
		p.Color = colorFromUUID(p.ID)
	}
	return list, total, nil
}

// ListByClient returns all projects for a client.
func (ps *ProjectService) ListByClient(ctx context.Context, clientID uuid.UUID, limit, offset int) ([]*entity.Project, int, error) {
	list, total, err := ps.store.ListByClient(ctx, clientID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	for _, p := range list {
		p.Color = colorFromUUID(p.ID)
	}
	return list, total, nil
}

// GetByID returns a single project by ID.
func (ps *ProjectService) GetByID(ctx context.Context, id uuid.UUID) (*entity.Project, error) {
	p, err := ps.store.FindByID(ctx, id)
	if err != nil || p == nil {
		return p, err
	}
	p.Color = colorFromUUID(p.ID)
	return p, nil
}

// UpdateProgress sets the completion percentage (freelancer only).
func (ps *ProjectService) UpdateProgress(ctx context.Context, projectID, freelancerID uuid.UUID, progress int) (*entity.Project, error) {
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}
	p, err := ps.store.UpdateProgress(ctx, projectID, freelancerID, progress)
	if err != nil || p == nil {
		return p, err
	}
	p.Color = colorFromUUID(p.ID)
	return p, nil
}

// Complete marks a project as done (visual close only). Client-owner only.
func (ps *ProjectService) Complete(ctx context.Context, projectID, clientID uuid.UUID) (*entity.Project, error) {
	p, err := ps.store.Complete(ctx, projectID, clientID)
	if err != nil || p == nil {
		return p, err
	}
	p.Color = colorFromUUID(p.ID)
	return p, nil
}
