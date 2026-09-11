package service

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

// ClientDashboardPayload mirrors the shape the frontend ClientDashboard type expects.
type ClientDashboardPayload struct {
	Client struct {
		Name string `json:"name"`
	} `json:"client"`
	Stats struct {
		ActiveJobs     int     `json:"activeJobs"`
		TotalProposals int     `json:"totalProposals"`
		ActiveHires    int     `json:"activeHires"`
		EscrowAmount   float64 `json:"escrowAmount"`
	} `json:"stats"`
	Jobs        []*entity.Job      `json:"jobs"`
	Proposals   []*entity.Proposal `json:"proposals"`
	BestMatches []*BestMatchItem   `json:"best_matches"`
	Projects    []*entity.Project  `json:"projects"`
}

type BestMatchItem struct {
	JobID      uuid.UUID    `json:"job_id"`
	JobTitle   string       `json:"job_title"`
	Freelancer *entity.User `json:"freelancer"`
	MatchScore int          `json:"match_score"`
	Rate       float64      `json:"rate"`
}

// FreelancerDashboardPayload mirrors the FreelancerDashboard frontend type.
type FreelancerDashboardPayload struct {
	Freelancer struct {
		ID              uuid.UUID `json:"id"`
		Name            string    `json:"name"`
		Role            string    `json:"role"`
		Tier            string    `json:"tier"`
		Color           string    `json:"color"`
		ProfileComplete int       `json:"profile_complete"`
	} `json:"freelancer"`
	Stats struct {
		ActiveProposals int     `json:"active_proposals"`
		ActiveProjects  int     `json:"active_projects"`
		MonthEarnings   float64 `json:"month_earnings"`
		Rating          float64 `json:"rating"`
	} `json:"stats"`
	Proposals   []*entity.Proposal `json:"proposals"`
	Projects    []*entity.Project  `json:"projects"`
	Recommended []*entity.Job      `json:"recommended"`
	Checklist   []ChecklistItem    `json:"checklist"`
}

type ChecklistItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Done  bool   `json:"done"`
}

type DashboardService struct {
	userStore     *store.UserStore
	jobStore      *store.JobStore
	proposalStore *store.ProposalStore
	projectStore  *store.ProjectStore
}

func newDashboardService(s *store.Store) *DashboardService {
	return &DashboardService{
		userStore:     s.User,
		jobStore:      s.Job,
		proposalStore: s.Proposal,
		projectStore:  s.Project,
	}
}

// GetClientDashboard assembles all data for the client dashboard page.
func (ds *DashboardService) GetClientDashboard(ctx context.Context, clientID uuid.UUID) (*ClientDashboardPayload, error) {
	client, err := ds.userStore.FindByID(ctx, clientID)
	if err != nil || client == nil {
		return nil, err
	}

	jobs, _, err := ds.jobStore.ListByClient(ctx, clientID, 10, 0)
	if err != nil {
		return nil, err
	}
	for _, j := range jobs {
		j.Color = colorFromUUID(j.ID)
	}

	proposals, err := ds.proposalStore.ListByClient(ctx, clientID, 20, 0)
	if err != nil {
		return nil, err
	}
	for _, p := range proposals {
		p.Color = colorFromUUID(p.ID)
	}

	activeHires, err := ds.projectStore.CountActiveHiresByClient(ctx, clientID)
	if err != nil {
		return nil, err
	}
	escrowAmount, err := ds.projectStore.SumEscrowByClient(ctx, clientID)
	if err != nil {
		return nil, err
	}

	projects, _, err := ds.projectStore.ListByClient(ctx, clientID, 20, 0)
	if err != nil {
		return nil, err
	}
	for _, p := range projects {
		p.Color = colorFromUUID(p.ID)
	}

	// Best matches: pair each open job with top-rated freelancers whose skills overlap.
	var bestMatches []*BestMatchItem
	for _, j := range jobs {
		if j.Status != "open" || len(j.Skills) == 0 {
			continue
		}
		q := store.FreelancerQuery{Sort: "rating", Page: 1, PageSize: 3}
		freelancers, _, err := ds.userStore.ListFreelancersFiltered(ctx, q)
		if err != nil {
			continue
		}
		for _, f := range freelancers {
			f.Color = colorFromUUID(f.ID)
			score := skillOverlapScore(f.Skills, j.Skills)
			rate := 0.0
			if f.HourlyRate != nil {
				rate = *f.HourlyRate
			}
			bestMatches = append(bestMatches, &BestMatchItem{
				JobID:      j.ID,
				JobTitle:   j.Title,
				Freelancer: f,
				MatchScore: score,
				Rate:       rate,
			})
		}
		if len(bestMatches) >= 5 {
			break
		}
	}

	payload := &ClientDashboardPayload{}
	payload.Client.Name = client.FullName
	payload.Stats.ActiveJobs = countByStatus(jobs, "open")
	payload.Stats.TotalProposals = len(proposals)
	payload.Stats.ActiveHires = activeHires
	payload.Stats.EscrowAmount = escrowAmount
	payload.Jobs = jobs
	payload.Proposals = proposals
	payload.BestMatches = bestMatches
	payload.Projects = projects
	return payload, nil
}

// GetFreelancerDashboard assembles all data for the freelancer dashboard page.
func (ds *DashboardService) GetFreelancerDashboard(ctx context.Context, freelancerID uuid.UUID) (*FreelancerDashboardPayload, error) {
	freelancer, err := ds.userStore.FindFreelancerByID(ctx, freelancerID)
	if err != nil || freelancer == nil {
		return nil, err
	}

	proposals, err := ds.proposalStore.ListByFreelancer(ctx, freelancerID, 10, 0)
	if err != nil {
		return nil, err
	}
	for _, p := range proposals {
		p.Color = colorFromUUID(p.ID)
	}

	projects, _, err := ds.projectStore.ListByFreelancer(ctx, freelancerID, 10, 0)
	if err != nil {
		return nil, err
	}
	for _, p := range projects {
		p.Color = colorFromUUID(p.ID)
	}

	recommended, err := ds.jobStore.ListMatchingFreelancer(ctx, freelancer.Skills, 5)
	if err != nil {
		return nil, err
	}
	for _, j := range recommended {
		j.Color = colorFromUUID(j.ID)
		j.PostedOrder = 0
	}

	activeProposals, err := ds.proposalStore.CountActiveByFreelancer(ctx, freelancerID)
	if err != nil {
		return nil, err
	}
	activeProjects, err := ds.projectStore.CountActiveByFreelancer(ctx, freelancerID)
	if err != nil {
		return nil, err
	}
	monthEarnings, err := ds.projectStore.SumEarnedThisMonth(ctx, freelancerID)
	if err != nil {
		return nil, err
	}

	checklist := buildChecklist(freelancer)

	payload := &FreelancerDashboardPayload{}
	payload.Freelancer.ID = freelancer.ID
	payload.Freelancer.Name = freelancer.FullName
	payload.Freelancer.Role = freelancer.Tagline
	payload.Freelancer.Tier = freelancer.Tier
	payload.Freelancer.Color = colorFromUUID(freelancer.ID)
	payload.Freelancer.ProfileComplete = freelancer.ProfileCompletion
	payload.Stats.ActiveProposals = activeProposals
	payload.Stats.ActiveProjects = activeProjects
	payload.Stats.MonthEarnings = monthEarnings
	payload.Stats.Rating = freelancer.Rating
	payload.Proposals = proposals
	payload.Projects = projects
	payload.Recommended = recommended
	payload.Checklist = checklist
	return payload, nil
}

func buildChecklist(u *entity.User) []ChecklistItem {
	return []ChecklistItem{
		{Key: "avatar", Label: "أضف صورة شخصية", Done: u.AvatarURL != nil && *u.AvatarURL != ""},
		{Key: "bio", Label: "اكتب نبذة عنك", Done: u.Bio != nil && *u.Bio != ""},
		{Key: "skills", Label: "أضف مهاراتك", Done: len(u.Skills) > 0},
		{Key: "rate", Label: "حدد سعرك بالساعة", Done: u.HourlyRate != nil && *u.HourlyRate > 0},
		{Key: "city", Label: "أضف مدينتك", Done: u.City != ""},
	}
}

func countByStatus(jobs []*entity.Job, status string) int {
	n := 0
	for _, j := range jobs {
		if j.Status == status {
			n++
		}
	}
	return n
}

func skillOverlapScore(freelancerSkills, jobSkills []string) int {
	if len(jobSkills) == 0 {
		return 0
	}
	set := make(map[string]struct{}, len(freelancerSkills))
	for _, s := range freelancerSkills {
		set[s] = struct{}{}
	}
	matched := 0
	for _, s := range jobSkills {
		if _, ok := set[s]; ok {
			matched++
		}
	}
	return (matched * 100) / len(jobSkills)
}
