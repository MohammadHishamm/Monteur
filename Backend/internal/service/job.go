package service

import (
	"context"
	"errors"
	"time"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type JobService struct {
	store *store.JobStore
}

func newJobService(s *store.JobStore) *JobService {
	return &JobService{store: s}
}

// List returns filtered, paginated open jobs.
func (js *JobService) List(ctx context.Context, q entity.JobQuery) ([]*entity.Job, int, error) {
	jobs, total, err := js.store.List(ctx, q)
	if err != nil {
		return nil, 0, err
	}
	for i, j := range jobs {
		j.Color = colorFromUUID(j.ID)
		j.PostedOrder = i + 1 + (q.Page-1)*q.PageSize
	}
	return jobs, total, nil
}

// GetByID returns a single job's full detail, or nil if not found.
func (js *JobService) GetByID(ctx context.Context, id uuid.UUID) (*entity.Job, error) {
	j, err := js.store.FindByID(ctx, id)
	if err != nil || j == nil {
		return j, err
	}
	j.Color = colorFromUUID(j.ID)
	return j, nil
}

// Close sets a job's status to "closed".
func (js *JobService) Close(ctx context.Context, jobID uuid.UUID) error {
	return js.store.UpdateStatus(ctx, jobID, "closed")
}

// Update edits mutable fields on a job owned by clientID.
func (js *JobService) Update(ctx context.Context, clientID uuid.UUID, jobID uuid.UUID, input entity.JobCreateInput) (*entity.Job, error) {
	j, err := js.store.FindByID(ctx, jobID)
	if err != nil || j == nil {
		return nil, err
	}
	if j.ClientID != clientID {
		return nil, errors.New("forbidden: you do not own this job")
	}
	j.Title = input.Title
	j.Summary = input.Summary
	j.Description = input.Description
	j.BudgetType = input.BudgetType
	j.BudgetMin = input.BudgetMin
	j.BudgetMax = input.BudgetMax
	j.DurationLabel = input.DurationLabel
	j.ExperienceTier = input.ExperienceTier
	j.Urgent = input.Urgent
	if err := js.store.Update(ctx, j); err != nil {
		return nil, err
	}
	j.Color = colorFromUUID(j.ID)
	return j, nil
}

// Create posts a new job for a client.
func (js *JobService) Create(ctx context.Context, clientID uuid.UUID, input entity.JobCreateInput) (*entity.Job, error) {
	j := &entity.Job{
		ID:             uuid.New(),
		ClientID:       clientID,
		Title:          input.Title,
		Summary:        input.Summary,
		Description:    input.Description,
		Category:       input.Category,
		Skills:         input.Skills,
		BudgetType:     input.BudgetType,
		BudgetMin:      input.BudgetMin,
		BudgetMax:      input.BudgetMax,
		DurationLabel:  input.DurationLabel,
		ExperienceTier: input.ExperienceTier,
		Deliverables:   input.Deliverables,
		Urgent:         input.Urgent,
		Aspect:         input.Aspect,
		PostedAt:       time.Now(),
	}
	if j.ExperienceTier == "" {
		j.ExperienceTier = "any"
	}
	if err := js.store.Create(ctx, j); err != nil {
		return nil, err
	}
	j.Color = colorFromUUID(j.ID)
	return j, nil
}
