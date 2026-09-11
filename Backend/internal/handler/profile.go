package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/service"
)

// HandleGetMyProfile godoc
//
//	@Summary		Get logged-in freelancer's editable profile — Freelancer
//	@Tags			profile
//	@Produce		json
//	@Router			/me/profile [get]
func (h *Handler) HandleGetMyProfile(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	profile, err := h.service.Profile.GetEditableProfile(ctx, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if profile == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: profile})
}

// HandleSaveMyProfile godoc
//
//	@Summary		Save logged-in freelancer's profile — Freelancer
//	@Tags			profile
//	@Accept			json
//	@Produce		json
//	@Router			/me/profile [put]
func (h *Handler) HandleSaveMyProfile(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	input, err := common.ReadJson[service.EditableProfileSaveInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	// Validate profile fields.
	if strings.TrimSpace(input.Name) == "" {
		common.ServeBadRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if input.Rate < 0 {
		common.ServeBadRequestResponse(w, r, errors.New("rate cannot be negative"))
		return
	}
	for i, p := range input.Projects {
		hasTitle := strings.TrimSpace(p.Title) != ""
		hasSummary := strings.TrimSpace(p.Summary) != ""
		hasDescription := strings.TrimSpace(p.Description) != ""
		hasImages := len(p.Images) > 0
		hasVideo := strings.TrimSpace(p.VideoURL) != ""
		isCompletelyEmpty := !hasTitle && !hasSummary && !hasDescription && !hasImages && !hasVideo
		if isCompletelyEmpty {
			// Ignore untouched empty draft cards coming from the editor.
			continue
		}

		if !hasTitle {
			common.ServeBadRequestResponse(w, r, fmt.Errorf("project %d: title is required", i+1))
			return
		}
		if !hasImages && !hasVideo {
			common.ServeBadRequestResponse(w, r, fmt.Errorf("project %d (%s): add at least one image or video", i+1, p.Title))
			return
		}
	}

	profile, err := h.service.Profile.SaveProfile(ctx, *sess.UserID, *input)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"ok":      true,
		"profile": profile,
	}})
}
