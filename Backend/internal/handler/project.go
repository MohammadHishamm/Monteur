package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

// HandleListMyProjects godoc
//
//	@Summary		List my projects — Authenticated user
//	@Tags			projects
//	@Produce		json
//	@Router			/me/projects [get]
func (h *Handler) HandleListMyProjects(w http.ResponseWriter, r *http.Request) {
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

	user, err := h.service.User.GetUserByID(ctx, sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	var projects interface{}
	var total int

	if user.UserType == "freelancer" {
		projects, total, err = h.service.Project.ListByFreelancer(ctx, user.ID, limit, offset)
	} else {
		projects, total, err = h.service.Project.ListByClient(ctx, user.ID, limit, offset)
	}
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: projects,
		Meta: common.ListMetaEnvelope{Page: page, Limit: limit, Offset: offset, Total: total},
	})
}

// HandleGetProject godoc
//
//	@Summary		Get project by ID — Authenticated
//	@Tags			projects
//	@Produce		json
//	@Param			projectID	path	string	true	"Project UUID"
//	@Router			/projects/{projectID} [get]
func (h *Handler) HandleGetProject(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "projectID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	project, err := h.service.Project.GetByID(ctx, id)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if project == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	// Only the client or the freelancer on this project may view it.
	caller := *sess.UserID
	if project.ClientID != caller && project.FreelancerID != caller {
		common.ServeForbiddenResponse(w, r)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: project})
}

// HandleUpdateProjectProgress godoc
//
//	@Summary		Update project progress — Freelancer (owner) only
//	@Tags			projects
//	@Accept			json
//	@Produce		json
//	@Param			projectID	path	string	true	"Project UUID"
//	@Router			/projects/{projectID} [patch]
func (h *Handler) HandleUpdateProjectProgress(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "projectID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	var body struct {
		Progress int `json:"progress"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	project, err := h.service.Project.UpdateProgress(ctx, id, *sess.UserID, body.Progress)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if project == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: project})
}

// HandleCompleteProject godoc
//
//	@Summary		Mark a project as complete (visual close) — Client (owner) only
//	@Tags			projects
//	@Produce		json
//	@Param			projectID	path	string	true	"Project UUID"
//	@Router			/projects/{projectID}/complete [post]
func (h *Handler) HandleCompleteProject(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	id, err := common.ParseIDURLParam(r, "projectID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	project, err := h.service.Project.Complete(ctx, id, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if project == nil {
		common.ServeNotFoundResponse(w, r, nil)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: project})
}
