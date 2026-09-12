package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

// HandleGetClientDashboard godoc
//
//	@Summary		Client dashboard — Client only
//	@Tags			dashboard
//	@Produce		json
//	@Router			/dashboard/client [get]
func (h *Handler) HandleGetClientDashboard(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	payload, err := h.service.Dashboard.GetClientDashboard(ctx, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: payload})
}

// HandleGetFreelancerDashboard godoc
//
//	@Summary		Freelancer dashboard — Freelancer only
//	@Tags			dashboard
//	@Produce		json
//	@Router			/dashboard/freelancer [get]
func (h *Handler) HandleGetFreelancerDashboard(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	payload, err := h.service.Dashboard.GetFreelancerDashboard(ctx, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: payload})
}
