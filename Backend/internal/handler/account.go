package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

// HandleUpdateAccount — PUT /me/account
// Updates the authenticated user's name and/or email.
func (h *Handler) HandleUpdateAccount(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil || sess.UserID == nil {
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	var req struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.ServeBadRequestResponse(w, r, errors.New("invalid json"))
		return
	}
	req.FullName = strings.TrimSpace(req.FullName)
	req.Email = strings.TrimSpace(req.Email)
	if req.FullName == "" || req.Email == "" {
		common.ServeBadRequestResponse(w, r, errors.New("full_name and email are required"))
		return
	}

	if err := h.store.User.UpdateAccount(ctx, *sess.UserID, req.FullName, req.Email); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleChangePassword — POST /me/password
// Verifies current_password then stores the new hash.
func (h *Handler) HandleChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil || sess.UserID == nil {
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.ServeBadRequestResponse(w, r, errors.New("invalid json"))
		return
	}
	if len(req.NewPassword) < 8 {
		common.ServeBadRequestResponse(w, r, errors.New("new_password must be at least 8 characters"))
		return
	}

	currentHash, err := h.store.User.GetPasswordHash(ctx, *sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if !common.VerifyPassword(currentHash, req.CurrentPassword) {
		common.ServeBadRequestResponse(w, r, errors.New("كلمة المرور الحالية غير صحيحة"))
		return
	}

	newHash, err := common.HashPassword(req.NewPassword)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if _, err := h.store.User.UpdatePassword(ctx, *sess.UserID, newHash); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, map[string]string{"status": "ok"})
}
