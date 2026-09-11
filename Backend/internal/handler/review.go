package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
)

// HandleSubmitReview godoc
//
//	@Summary		Submit a review for a completed project — Client only
//	@Tags			reviews
//	@Accept			json
//	@Produce		json
//	@Param			projectID	path	string	true	"Project UUID"
//	@Router			/projects/{projectID}/review [post]
func (h *Handler) HandleSubmitReview(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	projectID, err := common.ParseIDURLParam(r, "projectID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	var body struct {
		Rating int    `json:"rating"`
		Body   string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	if body.Rating < 1 || body.Rating > 5 {
		common.ServeBadRequestResponse(w, r, errors.New("rating must be between 1 and 5"))
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	review, err := h.service.Review.Create(ctx, projectID, *sess.UserID, body.Rating, body.Body)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotProjectClient):
			common.ServeForbiddenResponse(w, r)
		case errors.Is(err, store.ErrProjectNotComplete):
			common.ServeConflictResponse(w, r, err)
		case errors.Is(err, store.ErrAlreadyReviewed):
			common.ServeConflictResponse(w, r, err)
		default:
			common.ServeInternalServerResponse(w, r, err)
		}
		return
	}
	if review == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: review})
}

// HandleListFreelancerReviews godoc
//
//	@Summary		List reviews for a freelancer — Public
//	@Tags			reviews
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Router			/freelancers/{freelancerID}/reviews [get]
func (h *Handler) HandleListFreelancerReviews(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	freelancerID, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	reviews, err := h.service.Review.ListByFreelancer(ctx, freelancerID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if reviews == nil {
		reviews = []*entity.Review{}
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: reviews})
}
