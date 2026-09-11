package service

import (
	"github.com/OmarHosny18/APP-frontend/internal/cache"
	"github.com/OmarHosny18/APP-frontend/internal/store"

	"github.com/boj/redistore"
)

type Service struct {
	User           *UserService
	Admin          *AdminService
	AdminDashboard *AdminDashboardService
	Auth           *AuthService
	UserBalance    *UserBalanceService
	Message        *MessageService
	Moderation     *ModerationService
	Freelancer     *FreelancerService
	Job            *JobService
	Proposal       *ProposalService
	Project        *ProjectService
	Dashboard      *DashboardService
	Profile        *ProfileService
	Review         *ReviewService
	Verification *VerificationService
	store          *store.Store
	cache          *cache.Cache
	ss             *redistore.RediStore
}

func New(s *store.Store, c *cache.Cache, ss *redistore.RediStore) *Service {
	user := newUserService(s.User)

	return &Service{
		User:           user,
		Admin:          newAdminService(s.Admin),
		AdminDashboard: newAdminDashboardService(s),
		Auth:           newAuthService(ss, user, s.Token),
		UserBalance:    newUserBalanceService(),
		Message:        newMessageService(s),
		Moderation:     newModerationService(s),
		Freelancer:     newFreelancerService(s.User, s.SavedFreelancer),
		Job:            newJobService(s.Job),
		Proposal:       newProposalService(s.Proposal, s.Project),
		Project:        newProjectService(s.Project),
		Dashboard:      newDashboardService(s),
		Profile:        newProfileService(s),
		Review:         newReviewService(s.Review),
		Verification: newVerificationService(s),
		store:          s,
		cache:          c,
		ss:             ss,
	}
}
