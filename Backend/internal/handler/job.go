package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
)

var validCategories = map[string]bool{
	"reels": true, "youtube": true, "motion": true, "ads": true,
	"weddings": true, "podcast": true, "vfx": true, "color": true,
}

var validBudgetTypes = map[string]bool{"fixed": true, "hourly": true}

var validExperienceTiers = map[string]bool{
	"bronze": true, "silver": true, "gold": true, "platinum": true,
}

// validateJobInput returns a 400-ready error if required fields are missing or invalid.
func validateJobInput(in entity.JobCreateInput) error {
	if strings.TrimSpace(in.Title) == "" {
		return errors.New("title is required")
	}
	if !validBudgetTypes[in.BudgetType] {
		return fmt.Errorf("budget_type must be 'fixed' or 'hourly'")
	}
	if in.BudgetMax <= 0 {
		return errors.New("budget_max must be greater than 0")
	}
	if in.BudgetMin < 0 {
		return errors.New("budget_min cannot be negative")
	}
	if in.Category != "" && !validCategories[in.Category] {
		return fmt.Errorf("category '%s' is not valid", in.Category)
	}
	if in.ExperienceTier != "" && !validExperienceTiers[in.ExperienceTier] {
		return fmt.Errorf("experience_tier '%s' is not valid", in.ExperienceTier)
	}
	return nil
}

// HandleListJobs godoc
//
//	@Summary		List open jobs — Public
//	@Tags			jobs
//	@Produce		json
//	@Router			/jobs [get]
func (h *Handler) HandleListJobs(w http.ResponseWriter, r *http.Request) {
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

	q := entity.JobQuery{
		Search:     qs.Get("search"),
		Category:   qs.Get("category"),
		Experience: qs.Get("experience"),
		BudgetType: qs.Get("budgetType"),
		Sort:       qs.Get("sort"),
		Page:       page,
		PageSize:   pageSize,
	}

	jobs, total, err := h.service.Job.List(ctx, q)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: jobs,
		Meta: common.ListMetaEnvelope{
			Page:   page,
			Limit:  pageSize,
			Offset: (page - 1) * pageSize,
			Total:  total,
		},
	})
}

// HandleGetJob godoc
//
//	@Summary		Get job by ID — Public
//	@Tags			jobs
//	@Produce		json
//	@Param			jobID	path	string	true	"Job UUID"
//	@Router			/jobs/{jobID} [get]
func (h *Handler) HandleGetJob(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "jobID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	job, err := h.service.Job.GetByID(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if job == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	// For an authenticated freelancer, flag whether they've already applied so
	// the UI can hide the "submit proposal" button.
	if sess := h.service.Auth.SafeGetRequestSession(r, false); sess.UserID != nil {
		if applied, aerr := h.service.Proposal.HasApplied(ctx, id, *sess.UserID); aerr == nil {
			job.AlreadyApplied = applied
		}
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: job})
}

// HandleCloseJob godoc
//
//	@Summary		Close a job — Client only
//	@Tags			jobs
//	@Produce		json
//	@Param			jobID	path	string	true	"Job UUID"
//	@Router			/jobs/{jobID}/close [post]
func (h *Handler) HandleCloseJob(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "jobID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil || sess.UserID == nil {
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	// Verify ownership before closing.
	job, err := h.service.Job.GetByID(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if job == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}
	if job.ClientID != *sess.UserID {
		common.ServeForbiddenResponse(w, r)
		return
	}

	if err := h.service.Job.Close(ctx, id); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{"ok": true}})
}

// HandleUpdateJob godoc
//
//	@Summary		Edit a job — Client only
//	@Tags			jobs
//	@Accept			json
//	@Produce		json
//	@Param			jobID	path	string	true	"Job UUID"
//	@Router			/jobs/{jobID} [put]
func (h *Handler) HandleUpdateJob(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "jobID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	input, err := common.ReadJson[entity.JobCreateInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	if err := validateJobInput(*input); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	job, err := h.service.Job.Update(ctx, *sess.UserID, id, *input)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			common.ServeForbiddenResponse(w, r)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if job == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: job})
}

// HandleCreateJob godoc
//
//	@Summary		Post a new job — Client only
//	@Tags			jobs
//	@Accept			json
//	@Produce		json
//	@Router			/jobs [post]
func (h *Handler) HandleCreateJob(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	input, err := common.ReadJson[entity.JobCreateInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	if err := validateJobInput(*input); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	job, err := h.service.Job.Create(ctx, *sess.UserID, *input)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: job})
}
