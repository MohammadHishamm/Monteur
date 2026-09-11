package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

// HandleClientOnboarding godoc
//
//	@Summary		Save client onboarding answers — Client
//	@Tags			onboarding
//	@Accept			json
//	@Produce		json
//	@Router			/onboarding/client [post]
func (h *Handler) HandleClientOnboarding(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	type clientOnboardingInput struct {
		FullName       string `json:"full_name"`
		CompanyName    string `json:"company_name"`
		CompanyWebsite string `json:"company_website"`
		Industry       string `json:"industry"`
		CompanySize    string `json:"company_size"`
		HiringIntent   string `json:"hiring_intent"`
		Urgency        string `json:"urgency"`
		BudgetBand     string `json:"budget_band"`
		Engagement     string `json:"engagement"`
	}

	input, err := common.ReadJson[clientOnboardingInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	_, dbErr := h.store.DB.ExecContext(ctx, `
		UPDATE users
		SET
			full_name            = CASE WHEN $1 <> '' THEN $1 ELSE full_name END,
			company_name         = CASE WHEN $2 <> '' THEN $2 ELSE company_name END,
			company_website      = $3,
			industry             = $4,
			onboarding_completed = true,
			updated_at           = NOW()
		WHERE id = $5
	`, input.FullName, input.CompanyName, input.CompanyWebsite, input.Industry, sess.UserID)
	if dbErr != nil {
		common.ServeInternalServerResponse(w, r, dbErr)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]bool{"ok": true}})
}

// HandleFreelancerOnboarding godoc
//
//	@Summary		Save freelancer onboarding answers — Freelancer
//	@Tags			onboarding
//	@Accept			json
//	@Produce		json
//	@Router			/onboarding/freelancer [post]
func (h *Handler) HandleFreelancerOnboarding(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	type portfolioItemInput struct {
		ID          string   `json:"id"`
		Title       string   `json:"title"`
		Summary     string   `json:"summary"`
		Category    string   `json:"category"`
		Year        string   `json:"year"`
		Duration    string   `json:"duration"`
		LiveURL     string   `json:"liveUrl"`
		Description string   `json:"description"`
		Images      []string `json:"images"`
	}

	type freelancerOnboardingInput struct {
		FullName   string               `json:"full_name"`
		Role       string               `json:"role"`
		Tagline    string               `json:"tagline"`
		About      string               `json:"about"`
		City       string               `json:"city"`
		Country    string               `json:"country"`
		Category   string               `json:"category"`
		Skills     []string             `json:"skills"`
		Experience string               `json:"experience"`
		Avatar     string               `json:"avatar"`
		Portfolio  []portfolioItemInput `json:"portfolio"`
	}

	input, err := common.ReadJson[freelancerOnboardingInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	// Map experience label to years_of_experience for DB
	experienceYears := 0
	switch input.Experience {
	case "junior":
		experienceYears = 1
	case "mid":
		experienceYears = 3
	case "senior":
		experienceYears = 7
	case "expert":
		experienceYears = 12
	}

	// Tagline falls back to role if not set separately
	tagline := input.Tagline
	if tagline == "" {
		tagline = input.Role
	}

	// Note: hourly_rate and availability/status are intentionally NOT set during
	// onboarding — there is no UI for them here. They keep their account defaults
	// and are edited later from the profile editor.
	_, dbErr := h.store.DB.ExecContext(ctx, `
		UPDATE users
		SET
			full_name           = CASE WHEN $1 <> '' THEN $1 ELSE full_name END,
			tagline             = $2,
			bio                 = CASE WHEN $3 <> '' THEN $3 ELSE bio END,
			city                = $4,
			country             = $5,
			industry            = $6,
			skills              = $7,
			years_of_experience = $8,
			avatar_url          = CASE WHEN $9 <> '' THEN $9 ELSE avatar_url END,
			onboarding_completed = true,
			updated_at          = NOW()
		WHERE id = $10
	`, input.FullName, tagline, input.About, input.City, input.Country,
		input.Category, input.Skills, experienceYears,
		input.Avatar, sess.UserID)
	if dbErr != nil {
		common.ServeInternalServerResponse(w, r, dbErr)
		return
	}

	// Save portfolio showcases (best-effort — don't fail the whole request)
	for i, item := range input.Portfolio {
		if item.Title == "" {
			continue
		}

		// Determine showcase ID: use existing UUID if not a temp "new-" ID
		var showcaseID uuid.UUID
		if len(item.ID) == 36 {
			if parsed, parseErr := uuid.Parse(item.ID); parseErr == nil {
				showcaseID = parsed
			}
		}
		if showcaseID == uuid.Nil {
			showcaseID = uuid.New()
		}

		// First image becomes cover URL
		var coverURL *string
		if len(item.Images) > 0 && item.Images[0] != "" {
			coverURL = &item.Images[0]
		}

		// Remaining images become gallery JSON
		var galleryJSON json.RawMessage = []byte("[]")
		if len(item.Images) > 1 {
			type galleryEntry struct {
				URL string `json:"url"`
			}
			entries := make([]galleryEntry, 0, len(item.Images)-1)
			for _, img := range item.Images[1:] {
				entries = append(entries, galleryEntry{URL: img})
			}
			if b, marshalErr := json.Marshal(entries); marshalErr == nil {
				galleryJSON = b
			}
		}

		var liveURL *string
		if item.LiveURL != "" {
			liveURL = &item.LiveURL
		}

		category := item.Category
		if category == "" {
			category = input.Category
		}

		sc := &entity.Showcase{
			ID:            showcaseID,
			FreelancerID:  *sess.UserID,
			Title:         item.Title,
			Summary:       item.Summary,
			Category:      category,
			YearLabel:     item.Year,
			DurationLabel: item.Duration,
			Description:   item.Description,
			LiveURL:       liveURL,
			CoverURL:      coverURL,
			Tags:          input.Skills,
			Deliverables:  []string{},
			Metrics:       []byte("[]"),
			Gallery:       galleryJSON,
			DisplayOrder:  i,
		}

		_ = h.store.Showcase.Upsert(ctx, sc) // best-effort
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]bool{"ok": true}})
}
