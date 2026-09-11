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
	"github.com/OmarHosny18/APP-frontend/internal/service"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

// HandleSubmitProposal godoc
//
//	@Summary		Submit proposal for a job — Freelancer
//	@Tags			proposals
//	@Accept			json
//	@Produce		json
//	@Param			jobID	path	string	true	"Job UUID"
//	@Router			/jobs/{jobID}/proposals [post]
func (h *Handler) HandleSubmitProposal(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	jobID, err := common.ParseIDURLParam(r, "jobID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	input, err := common.ReadJson[entity.ProposalCreateInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	// Validate required fields before hitting the service layer.
	if strings.TrimSpace(input.CoverLetter) == "" {
		common.ServeBadRequestResponse(w, r, errors.New("cover_letter is required"))
		return
	}
	if len(strings.TrimSpace(input.CoverLetter)) < 20 {
		common.ServeBadRequestResponse(w, r, errors.New("cover_letter must be at least 20 characters"))
		return
	}
	if input.BidAmount <= 0 {
		common.ServeBadRequestResponse(w, r, errors.New("bid must be greater than 0"))
		return
	}
	if input.BudgetType != "fixed" && input.BudgetType != "hourly" {
		common.ServeBadRequestResponse(w, r, errors.New("budget_type must be 'fixed' or 'hourly'"))
		return
	}
	if strings.TrimSpace(input.DeliveryTimeLabel) == "" {
		common.ServeBadRequestResponse(w, r, errors.New("delivery_time is required"))
		return
	}

	input.JobID = jobID.String()

	proposal, err := h.service.Proposal.Submit(ctx, *sess.UserID, *input)
	if err != nil {
		if errors.Is(err, service.ErrAlreadyApplied) || errors.Is(err, store.ErrJobNotOpen) {
			common.ServeConflictResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	// Notify the job owner (client) about the new proposal — best-effort.
	if job, jobErr := h.store.Job.FindByID(ctx, jobID); jobErr == nil && job != nil {
		params := []entity.CreateNotificationParams{{
			UserID:   job.ClientID.String(),
			Type:     "new_proposal",
			Title:    "عرض جديد على بريفك",
			Message:  "وصلك عرض جديد من مونتير — راجعه الآن.",
			Priority: "normal",
			Data:     []byte(`{"proposal_id":"` + proposal.ID.String() + `","job_id":"` + jobID.String() + `"}`),
		}}
		if created, notifErr := h.service.CreateNotifications(ctx, params); notifErr == nil {
			for _, n := range created {
				h.pushNotification(n)
			}
		}
	}

	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: map[string]any{
		"ok":          true,
		"proposal_id": proposal.ID,
	}})
}

// HandleListMyProposals godoc
//
//	@Summary		List my sent proposals — Freelancer
//	@Tags			proposals
//	@Produce		json
//	@Router			/me/proposals [get]
func (h *Handler) HandleListMyProposals(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	proposals, err := h.service.Proposal.ListByFreelancer(ctx, *sess.UserID, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: proposals,
		Meta: common.ListMetaEnvelope{Page: page, Limit: limit, Offset: offset},
	})
}

// HandleHireProposal godoc
//
//	@Summary		Accept a proposal (hire freelancer) — Client
//	@Tags			proposals
//	@Produce		json
//	@Param			proposalID	path	string	true	"Proposal UUID"
//	@Router			/proposals/{proposalID}/hire [post]
func (h *Handler) HandleHireProposal(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "proposalID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	project, err := h.service.Proposal.Hire(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrJobNotOpen) {
			common.ServeConflictResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	// Notify the freelancer that their proposal was accepted — best-effort.
	if project != nil {
		params := []entity.CreateNotificationParams{{
			UserID:   project.FreelancerID.String(),
			Type:     "offer_accepted",
			Title:    "تم قبول عرضك! 🎉",
			Message:  "قبل العميل عرضك وبدأ المشروع رسمياً — انتقل إلى قسم المشاريع.",
			Priority: "high",
			Data:     []byte(`{"project_id":"` + project.ID.String() + `"}`),
		}}
		if created, notifErr := h.service.CreateNotifications(ctx, params); notifErr == nil {
			for _, n := range created {
				h.pushNotification(n)
			}
		}
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"ok":      true,
		"project": project,
	}})
}

// HandleUpdateProposalStatus godoc
//
//	@Summary		Shortlist or decline a proposal — Client only
//	@Tags			proposals
//	@Accept			json
//	@Produce		json
//	@Param			proposalID	path	string	true	"Proposal UUID"
//	@Router			/proposals/{proposalID}/status [patch]
func (h *Handler) HandleUpdateProposalStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "proposalID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	type statusInput struct {
		Status string `json:"status"`
	}
	input, err := common.ReadJson[statusInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if input.Status != "shortlisted" && input.Status != "declined" {
		common.ServeBadRequestResponse(w, r, fmt.Errorf("status must be 'shortlisted' or 'declined'"))
		return
	}

	if err := h.service.Proposal.UpdateStatus(ctx, id, input.Status); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{"ok": true}})
}

// HandleHireBestMatch godoc
//
//	@Summary		Hire a freelancer directly for a job (AI best-match) — Client
//	@Tags			jobs
//	@Accept			json
//	@Produce		json
//	@Param			jobID	path	string	true	"Job UUID"
//	@Router			/jobs/{jobID}/hire [post]
func (h *Handler) HandleHireBestMatch(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	jobID, err := common.ParseIDURLParam(r, "jobID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	type hireInput struct {
		FreelancerID string `json:"freelancer_id"`
	}
	input, err := common.ReadJson[hireInput](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	freelancerID, err := uuid.Parse(input.FreelancerID)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	project, err := h.service.Proposal.HireForJob(ctx, jobID, freelancerID)
	if err != nil {
		if errors.Is(err, store.ErrJobNotOpen) {
			common.ServeConflictResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	// Notify the freelancer that they were directly hired — best-effort.
	if project != nil {
		params := []entity.CreateNotificationParams{{
			UserID:   project.FreelancerID.String(),
			Type:     "offer_accepted",
			Title:    "تم توظيفك مباشرةً! 🎉",
			Message:  "اختارك العميل مباشرةً لتنفيذ المشروع — انتقل إلى قسم المشاريع.",
			Priority: "high",
			Data:     []byte(`{"project_id":"` + project.ID.String() + `"}`),
		}}
		if created, notifErr := h.service.CreateNotifications(ctx, params); notifErr == nil {
			for _, n := range created {
				h.pushNotification(n)
			}
		}
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"ok":      true,
		"project": project,
	}})
}
