package service

import (
	"context"
	"errors"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

// ErrAlreadyApplied is returned when a freelancer submits a second proposal for the same job.
var ErrAlreadyApplied = errors.New("you have already submitted a proposal for this job")

type ProposalService struct {
	store        *store.ProposalStore
	projectStore *store.ProjectStore
}

func newProposalService(s *store.ProposalStore, ps *store.ProjectStore) *ProposalService {
	return &ProposalService{store: s, projectStore: ps}
}

// Submit creates a new proposal for a job.
func (ps *ProposalService) Submit(ctx context.Context, freelancerID uuid.UUID, input entity.ProposalCreateInput) (*entity.Proposal, error) {
	jobID, err := uuid.Parse(input.JobID)
	if err != nil {
		return nil, err
	}
	// Reject proposals to jobs that are no longer accepting them (hired/closed).
	status, err := ps.store.JobStatus(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if status != "open" {
		return nil, store.ErrJobNotOpen
	}
	// Guard against duplicate proposals from the same freelancer.
	exists, err := ps.store.ExistsByJobAndFreelancer(ctx, jobID, freelancerID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrAlreadyApplied
	}
	p := &entity.Proposal{
		ID:                uuid.New(),
		JobID:             jobID,
		FreelancerID:      freelancerID,
		CoverLetter:       input.CoverLetter,
		BidAmount:         input.BidAmount,
		BudgetType:        input.BudgetType,
		DeliveryTimeLabel: input.DeliveryTimeLabel,
	}
	if err := ps.store.Create(ctx, p); err != nil {
		return nil, err
	}
	p.Color = colorFromUUID(p.ID)
	return p, nil
}

// HasApplied reports whether a freelancer already submitted a proposal for a job.
func (ps *ProposalService) HasApplied(ctx context.Context, jobID, freelancerID uuid.UUID) (bool, error) {
	return ps.store.ExistsByJobAndFreelancer(ctx, jobID, freelancerID)
}

// ListByFreelancer returns sent proposals for the logged-in freelancer.
func (ps *ProposalService) ListByFreelancer(ctx context.Context, freelancerID uuid.UUID, limit, offset int) ([]*entity.Proposal, error) {
	list, err := ps.store.ListByFreelancer(ctx, freelancerID, limit, offset)
	if err != nil {
		return nil, err
	}
	for _, p := range list {
		p.Color = colorFromUUID(p.ID)
	}
	return list, nil
}

// ListByClient returns received proposals for all of a client's jobs.
func (ps *ProposalService) ListByClient(ctx context.Context, clientID uuid.UUID, limit, offset int) ([]*entity.Proposal, error) {
	list, err := ps.store.ListByClient(ctx, clientID, limit, offset)
	if err != nil {
		return nil, err
	}
	for _, p := range list {
		p.Color = colorFromUUID(p.ID)
	}
	return list, nil
}

// Hire accepts a proposal, declines siblings, marks the job in-progress, and
// creates the escrow-funded project — all transactionally. Returns the project.
func (ps *ProposalService) Hire(ctx context.Context, proposalID uuid.UUID) (*entity.Project, error) {
	project, err := ps.projectStore.HireFromProposal(ctx, proposalID)
	if err != nil {
		return nil, err
	}
	if project != nil {
		project.Color = colorFromUUID(project.ID)
	}
	return project, nil
}

// UpdateStatus changes a proposal's status (shortlisted / declined).
// Only valid transitions from pending/viewed → shortlisted or declined.
func (ps *ProposalService) UpdateStatus(ctx context.Context, proposalID uuid.UUID, status string) error {
	return ps.store.UpdateStatus(ctx, proposalID, status)
}

// HireForJob hires a freelancer directly for a job (AI best-match, no proposal).
func (ps *ProposalService) HireForJob(ctx context.Context, jobID, freelancerID uuid.UUID) (*entity.Project, error) {
	project, err := ps.projectStore.HireFreelancerForJob(ctx, jobID, freelancerID)
	if err != nil {
		return nil, err
	}
	if project != nil {
		project.Color = colorFromUUID(project.ID)
	}
	return project, nil
}
