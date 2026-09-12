package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
)

// HandleListFreelancers godoc
//
//	@Summary		List freelancers — Public
//	@Tags			freelancers
//	@Produce		json
//	@Success		200	{object}	common.DataMetaEnvelope
//	@Router			/freelancers [get]
func (h *Handler) HandleListFreelancers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	qs := r.URL.Query()
	page, _ := strconv.Atoi(qs.Get("page"))
	pageSize, _ := strconv.Atoi(qs.Get("pageSize"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 9
	}

	q := store.FreelancerQuery{
		Search:        qs.Get("search"),
		Category:      qs.Get("category"),
		Tier:          qs.Get("tier"),
		City:          qs.Get("city"),
		AvailableOnly: qs.Get("availableOnly") == "true",
		Sort:          qs.Get("sort"),
		Page:          page,
		PageSize:      pageSize,
	}

	users, total, err := h.service.Freelancer.List(ctx, q)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: users,
		Meta: common.ListMetaEnvelope{
			Page:   page,
			Limit:  pageSize,
			Offset: (page - 1) * pageSize,
			Total:  total,
		},
	})
}

// HandleGetFreelancer godoc
//
//	@Summary		Get freelancer by ID — Public
//	@Tags			freelancers
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Success		200	{object}	common.DataEnvelope
//	@Router			/freelancers/{freelancerID} [get]
func (h *Handler) HandleGetFreelancer(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	user, err := h.service.Freelancer.GetByID(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if user == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: user})
}

// HandleGetSimilarFreelancers godoc
//
//	@Summary		Similar freelancers — Public
//	@Tags			freelancers
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Router			/freelancers/{freelancerID}/similar [get]
func (h *Handler) HandleGetSimilarFreelancers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 3
	}

	users, err := h.service.Freelancer.GetSimilar(ctx, id, limit)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: users})
}

// HandleGetFreelancerCities godoc
//
//	@Summary		Distinct freelancer cities — Public
//	@Tags			freelancers
//	@Produce		json
//	@Router			/freelancers/cities [get]
func (h *Handler) HandleGetFreelancerCities(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*10)
	defer cancel()

	cities, err := h.service.Freelancer.Cities(ctx)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: cities})
}

// HandleGetFreelancerShowcases godoc
//
//	@Summary		Freelancer showcases (portfolio) — Public
//	@Tags			freelancers
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Router			/freelancers/{freelancerID}/showcases [get]
func (h *Handler) HandleGetFreelancerShowcases(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	showcases, err := h.store.Showcase.ListByFreelancer(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: showcases})
}

// HandleGetSavedStatus godoc
//
//	@Summary		Check if a freelancer is bookmarked by the current user — Authenticated
//	@Tags			freelancers
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Router			/freelancers/{freelancerID}/save [get]
func (h *Handler) HandleGetSavedStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*10)
	defer cancel()

	freelancerID, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	saved, err := h.service.Freelancer.IsSaved(ctx, *sess.UserID, freelancerID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]bool{"saved": saved}})
}

// HandleListSavedFreelancers godoc
//
//	@Summary		List all freelancers bookmarked by the current user — Authenticated
//	@Tags			freelancers
//	@Produce		json
//	@Router			/me/saved-freelancers [get]
func (h *Handler) HandleListSavedFreelancers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	list, err := h.service.Freelancer.ListSaved(ctx, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if list == nil {
		list = []*entity.User{}
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: list})
}

// HandleSaveFreelancer godoc
//
//	@Summary		Bookmark a freelancer — Authenticated
//	@Tags			freelancers
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Router			/freelancers/{freelancerID}/save [post]
func (h *Handler) HandleSaveFreelancer(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*10)
	defer cancel()

	freelancerID, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	if err := h.service.Freelancer.Save(ctx, *sess.UserID, freelancerID); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]bool{"saved": true}})
}

// HandleUnsaveFreelancer godoc
//
//	@Summary		Remove freelancer bookmark — Authenticated
//	@Tags			freelancers
//	@Produce		json
//	@Param			freelancerID	path	string	true	"Freelancer UUID"
//	@Router			/freelancers/{freelancerID}/save [delete]
func (h *Handler) HandleUnsaveFreelancer(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*10)
	defer cancel()

	freelancerID, err := common.ParseIDURLParam(r, "freelancerID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	if err := h.service.Freelancer.Unsave(ctx, *sess.UserID, freelancerID); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]bool{"saved": false}})
}

// HandleGetShowcase godoc
//
//	@Summary		Get a single showcase by ID — Public
//	@Tags			freelancers
//	@Produce		json
//	@Param			showcaseID	path	string	true	"Showcase UUID"
//	@Router			/showcases/{showcaseID} [get]
func (h *Handler) HandleGetShowcase(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "showcaseID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sc, err := h.store.Showcase.FindByID(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if sc == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: sc})
}
