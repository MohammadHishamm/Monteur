package service

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

var allowedShowcaseCategories = map[string]struct{}{
	"development": {},
	"design":      {},
	"writing":     {},
	"marketing":   {},
	"video":       {},
	"data":        {},
	"reels":       {},
	"youtube":     {},
	"motion":      {},
	"ads":         {},
	"weddings":    {},
	"podcast":     {},
	"vfx":         {},
	"color":       {},
}

var showcaseCategoryAliases = map[string]string{
	"shorts":          "reels",
	"short":           "reels",
	"youtube-editing": "youtube",
	"youtube editing": "youtube",
	"motion-graphics": "motion",
	"motion graphics": "motion",
	"advertising":     "ads",
	"ad":              "ads",
	"wedding":         "weddings",
	"podcasts":        "podcast",
	"colour":          "color",
	"video-editing":   "video",
	"video editing":   "video",
	"editing":         "video",
}

func normalizeShowcaseCategory(raw string) string {
	category := strings.ToLower(strings.TrimSpace(raw))
	if category == "" {
		return "video"
	}

	if alias, ok := showcaseCategoryAliases[category]; ok {
		category = alias
	}

	if _, ok := allowedShowcaseCategories[category]; ok {
		return category
	}

	return "video"
}

// deleteUploadFile removes a local upload file from ./uploads/ if the path
// refers to a local file (starts with "/uploads/"). Best-effort: errors are
// silently ignored so a missing file never blocks a profile save.
func deleteUploadFile(path string) {
	if !strings.HasPrefix(path, "/uploads/") {
		return
	}
	filename := filepath.Base(path)
	if filename == "" || filename == "." || filename == "/" {
		return
	}
	_ = os.Remove(filepath.Join("./uploads", filename))
}

// extractShowcaseImages returns every image URL stored in a showcase:
// the cover URL plus any URLs embedded in the gallery JSON array.
func extractShowcaseImages(sc *entity.Showcase) []string {
	var out []string
	if sc.CoverURL != nil && *sc.CoverURL != "" {
		out = append(out, *sc.CoverURL)
	}
	if len(sc.Gallery) > 0 {
		var entries []struct {
			URL string `json:"url"`
		}
		if err := json.Unmarshal(sc.Gallery, &entries); err == nil {
			for _, e := range entries {
				if e.URL != "" {
					out = append(out, e.URL)
				}
			}
		}
	}
	return out
}

type ProfileService struct {
	userStore     *store.UserStore
	showcaseStore *store.ShowcaseStore
}

func newProfileService(s *store.Store) *ProfileService {
	return &ProfileService{
		userStore:     s.User,
		showcaseStore: s.Showcase,
	}
}

// EditableProfilePayload is the shape returned to and accepted from the frontend profile editor.
// On GET, Projects is populated from showcases. On PUT, the frontend sends EditableProjectInput
// (camelCase project shape), so the accept/return shapes differ — see SaveProfile.
type EditableProfilePayload struct {
	ID        uuid.UUID          `json:"id"`
	Name      string             `json:"name"`
	Role      string             `json:"role"`
	Tagline   string             `json:"tagline"`
	About     string             `json:"about"`
	Category  string             `json:"category"`
	City      string             `json:"city"`
	Country   string             `json:"country"`
	Rate      float64            `json:"rate"`
	Available bool               `json:"available"`
	Avatar    string             `json:"avatar"`
	Skills    []string           `json:"skills"`
	Languages []LanguageEntry    `json:"languages"`
	Projects  []*entity.Showcase `json:"projects"`
	Color     string             `json:"color"`
	Tier      string             `json:"tier"`
}

// EditableProfileSaveInput is the PUT body the profile editor sends. Projects use the
// camelCase EditableProject shape from the frontend (not entity.Showcase).
type EditableProfileSaveInput struct {
	Name      string                 `json:"name"`
	Tagline   string                 `json:"tagline"`
	About     string                 `json:"about"`
	City      string                 `json:"city"`
	Rate      float64                `json:"rate"`
	Available bool                   `json:"available"`
	Avatar    string                 `json:"avatar"`
	Skills    []string               `json:"skills"`
	Languages []LanguageEntry        `json:"languages"`
	Projects  []EditableProjectInput `json:"projects"`
}

// EditableProjectInput mirrors the frontend EditableProject type.
type EditableProjectInput struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Summary     string   `json:"summary"`
	Category    string   `json:"category"`
	Year        string   `json:"year"`
	Duration    string   `json:"duration"`
	LiveURL     string   `json:"liveUrl"`
	Description string   `json:"description"`
	Images      []string `json:"images"`
	VideoURL    string   `json:"videoUrl"`
}

type LanguageEntry struct {
	Name  string `json:"name"`
	Level string `json:"level"`
}

// GetEditableProfile loads the full editable profile for the authenticated freelancer.
func (ps *ProfileService) GetEditableProfile(ctx context.Context, freelancerID uuid.UUID) (*EditableProfilePayload, error) {
	u, err := ps.userStore.FindFreelancerByID(ctx, freelancerID)
	if err != nil || u == nil {
		return nil, err
	}

	showcases, err := ps.showcaseStore.ListByFreelancer(ctx, freelancerID)
	if err != nil {
		return nil, err
	}
	for _, sc := range showcases {
		sc.Color = colorFromUUID(sc.ID)
	}

	var languages []LanguageEntry
	if len(u.Languages) > 0 {
		_ = json.Unmarshal(u.Languages, &languages)
	}

	rate := 0.0
	if u.HourlyRate != nil {
		rate = *u.HourlyRate
	}

	about := ""
	if u.Bio != nil {
		about = *u.Bio
	}

	avatar := ""
	if u.AvatarURL != nil {
		avatar = *u.AvatarURL
	}

	return &EditableProfilePayload{
		ID:        u.ID,
		Name:      u.FullName,
		Role:      u.Tagline,
		Tagline:   u.Tagline,
		About:     about,
		City:      u.City,
		Rate:      rate,
		Available: u.Status == "online",
		Avatar:    avatar,
		Skills:    u.Skills,
		Languages: languages,
		Projects:  showcases,
		Color:     colorFromUUID(u.ID),
		Tier:      u.Tier,
	}, nil
}

// SaveProfile persists the editable profile fields AND the portfolio showcases for a freelancer.
func (ps *ProfileService) SaveProfile(ctx context.Context, freelancerID uuid.UUID, in EditableProfileSaveInput) (*EditableProfilePayload, error) {
	u, err := ps.userStore.FindFreelancerByID(ctx, freelancerID)
	if err != nil || u == nil {
		return nil, err
	}

	// Capture old avatar before overwriting so we can clean it up.
	oldAvatar := ""
	if u.AvatarURL != nil {
		oldAvatar = *u.AvatarURL
	}

	u.FullName = in.Name
	u.Tagline = in.Tagline
	u.City = in.City
	bio := in.About
	u.Bio = &bio
	u.HourlyRate = &in.Rate
	u.Skills = in.Skills
	u.ProfileCompletion = calcProfileCompletion(in)
	if in.Available {
		u.Status = "online"
	} else {
		u.Status = "offline"
	}
	if in.Avatar != "" {
		u.AvatarURL = &in.Avatar
	}

	langJSON, _ := json.Marshal(in.Languages)
	u.Languages = langJSON

	if err := ps.userStore.UpdateFreelancerProfile(ctx, u); err != nil {
		return nil, err
	}

	// Delete the old avatar file if it was replaced with a different upload.
	if oldAvatar != "" && in.Avatar != "" && oldAvatar != in.Avatar {
		deleteUploadFile(oldAvatar)
	}

	// ── Persist portfolio showcases (upsert incoming, delete removed) ──
	if err := ps.saveShowcases(ctx, freelancerID, in.Projects); err != nil {
		return nil, err
	}

	return ps.GetEditableProfile(ctx, freelancerID)
}

// saveShowcases upserts the incoming projects and deletes any showcase no longer present.
func (ps *ProfileService) saveShowcases(ctx context.Context, freelancerID uuid.UUID, projects []EditableProjectInput) error {
	// Existing showcase IDs for this freelancer (to detect deletions).
	existing, err := ps.showcaseStore.ListByFreelancer(ctx, freelancerID)
	if err != nil {
		return err
	}

	// Index existing showcases by ID so we can diff images on update.
	existingByID := make(map[uuid.UUID]*entity.Showcase, len(existing))
	for _, sc := range existing {
		existingByID[sc.ID] = sc
	}

	keep := make(map[uuid.UUID]bool)

	for i, p := range projects {
		if p.Title == "" {
			continue
		}

		// Resolve ID: reuse a real UUID, generate one for new ("new-…") projects.
		showcaseID := uuid.Nil
		if len(p.ID) == 36 {
			if parsed, perr := uuid.Parse(p.ID); perr == nil {
				showcaseID = parsed
			}
		}
		if showcaseID == uuid.Nil {
			showcaseID = uuid.New()
		}
		keep[showcaseID] = true

		// First image → cover, rest → gallery JSON.
		var coverURL *string
		if len(p.Images) > 0 && p.Images[0] != "" {
			cover := p.Images[0]
			coverURL = &cover
		}
		galleryJSON := json.RawMessage("[]")
		if len(p.Images) > 1 {
			type galleryEntry struct {
				URL string `json:"url"`
			}
			entries := make([]galleryEntry, 0, len(p.Images)-1)
			for _, img := range p.Images[1:] {
				entries = append(entries, galleryEntry{URL: img})
			}
			if b, merr := json.Marshal(entries); merr == nil {
				galleryJSON = b
			}
		}

		var liveURL *string
		if p.LiveURL != "" {
			live := p.LiveURL
			liveURL = &live
		}

		var videoURL *string
		if p.VideoURL != "" {
			v := p.VideoURL
			videoURL = &v
		}

		sc := &entity.Showcase{
			ID:            showcaseID,
			FreelancerID:  freelancerID,
			Title:         p.Title,
			Summary:       p.Summary,
			Category:      normalizeShowcaseCategory(p.Category),
			YearLabel:     p.Year,
			DurationLabel: p.Duration,
			Description:   p.Description,
			LiveURL:       liveURL,
			CoverURL:      coverURL,
			VideoURL:      videoURL,
			Tags:          []string{},
			Deliverables:  []string{},
			Metrics:       json.RawMessage("[]"),
			Gallery:       galleryJSON,
			DisplayOrder:  i,
		}
		if err := ps.showcaseStore.Upsert(ctx, sc); err != nil {
			return err
		}

		// If this showcase already existed, delete any images or video that were removed.
		if old, exists := existingByID[showcaseID]; exists {
			newImageSet := make(map[string]bool, len(p.Images))
			for _, img := range p.Images {
				newImageSet[img] = true
			}
			for _, oldURL := range extractShowcaseImages(old) {
				if !newImageSet[oldURL] {
					deleteUploadFile(oldURL)
				}
			}
			// Delete old video file if it was replaced or removed.
			if old.VideoURL != nil && *old.VideoURL != "" && p.VideoURL != *old.VideoURL {
				deleteUploadFile(*old.VideoURL)
			}
		}
	}

	// Delete showcases that were removed in the editor, plus all their images and video.
	for _, sc := range existing {
		if !keep[sc.ID] {
			for _, imgURL := range extractShowcaseImages(sc) {
				deleteUploadFile(imgURL)
			}
			if sc.VideoURL != nil && *sc.VideoURL != "" {
				deleteUploadFile(*sc.VideoURL)
			}
			if err := ps.showcaseStore.Delete(ctx, sc.ID, freelancerID); err != nil {
				return err
			}
		}
	}
	return nil
}

func calcProfileCompletion(p EditableProfileSaveInput) int {
	total := 5
	done := 0
	if p.About != "" {
		done++
	}
	if len(p.Skills) > 0 {
		done++
	}
	if p.Rate > 0 {
		done++
	}
	if p.City != "" {
		done++
	}
	if len(p.Projects) > 0 {
		done++
	}
	return (done * 100) / total
}
