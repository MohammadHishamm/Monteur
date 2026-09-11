package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/go-chi/chi/v5"
)

// HandleListFlaggedMessages godoc
//
//	@Summary		List flagged messages — Admin/Moderator Access
//	@Description	Returns paginated messages that were caught by the content filter.
//	@Tags			moderation
//	@Produce		json
//	@Param			status	query		string	false	"Filter by status: pending, warned, dismissed (omit for all)"
//	@Param			page	query		int		false	"Page number (default 1)"
//	@Param			limit	query		int		false	"Page size (default 20)"
//	@Success		200	{object}	common.DataMetaEnvelope
//	@Failure		403	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/moderation/flagged-messages [get]
func (h *Handler) HandleListFlaggedMessages(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	status := r.URL.Query().Get("status")

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	list, total, err := h.service.Moderation.ListFlaggedMessages(ctx, status, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: list,
		Meta: common.ListMetaEnvelope{
			Page:   page,
			Limit:  limit,
			Offset: offset,
			Total:  total,
		},
	})
}

// HandleWarnUser godoc
//
//	@Summary		Warn message sender — Admin/Moderator Access
//	@Description	Issues a warning to the user who sent the flagged message. Auto-bans after 3 warnings.
//	@Tags			moderation
//	@Produce		json
//	@Param			flaggedID	path		string	true	"Flagged message ID"
//	@Success		200	{object}	common.DataEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		404	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/moderation/flagged-messages/{flaggedID}/warn [post]
func (h *Handler) HandleWarnUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	flaggedID, err := common.ParseIDURLParam(r, "flaggedID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	warningCount, banned, err := h.service.Moderation.IssueWarning(ctx, flaggedID, *sess.UserID)
	if err != nil {
		if errors.Is(err, apperror.ErrFlaggedMessageNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}
		if errors.Is(err, apperror.ErrFlaggedMessageReviewed) {
			common.ServeBadRequestResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"warning_count": warningCount,
		"banned":        banned,
	}})
}

// HandleDismissFlag godoc
//
//	@Summary		Dismiss flagged message — Admin/Moderator Access
//	@Description	Marks a flagged message as dismissed without issuing a warning.
//	@Tags			moderation
//	@Produce		json
//	@Param			flaggedID	path		string	true	"Flagged message ID"
//	@Success		200	{object}	common.StatusEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		404	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/moderation/flagged-messages/{flaggedID}/dismiss [post]
func (h *Handler) HandleDismissFlag(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	flaggedID, err := common.ParseIDURLParam(r, "flaggedID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	if err := h.service.Moderation.DismissFlag(ctx, flaggedID, *sess.UserID); err != nil {
		if errors.Is(err, apperror.ErrFlaggedMessageNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}
		if errors.Is(err, apperror.ErrFlaggedMessageReviewed) {
			common.ServeBadRequestResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "dismissed"})
}

// HandleGetUserWarnings godoc
//
//	@Summary		Get user warning count — Admin/Moderator Access
//	@Description	Returns the current warning count for a user.
//	@Tags			moderation
//	@Produce		json
//	@Param			userID	path		string	true	"User ID"
//	@Success		200	{object}	common.DataEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/users/{userID}/warnings [get]
func (h *Handler) HandleGetUserWarnings(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	count, err := h.service.Moderation.GetUserWarningCount(ctx, userID)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"user_id":       chi.URLParam(r, "userID"),
		"warning_count": count,
		"max_warnings":  apperror.MaxWarnings,
	}})
}

type banUserRequest struct {
	Reason string `json:"reason"`
}

// HandleBanUser godoc
//
//	@Summary		Ban user — Admin/Moderator Access
//	@Description	Manually bans a user with a reason.
//	@Tags			moderation
//	@Accept			json
//	@Produce		json
//	@Param			userID		path		string			true	"User ID"
//	@Param			payload		body		banUserRequest	true	"Ban reason"
//	@Success		200	{object}	common.StatusEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/users/{userID}/ban [post]
func (h *Handler) HandleBanUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	// Body is optional — dashboard sends no reason, so fall back to a default.
	reason := "حظر من لوحة الإدارة"
	if body, err := common.ReadJson[banUserRequest](w, r); err == nil && body.Reason != "" {
		reason = body.Reason
	}

	if err := h.service.Moderation.BanUserManually(ctx, userID, reason); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "banned"})
}

// HandleUnbanUser godoc
//
//	@Summary		Unban user — Admin/Moderator Access
//	@Description	Removes a ban from a user and resets their warning count.
//	@Tags			moderation
//	@Produce		json
//	@Param			userID	path		string	true	"User ID"
//	@Success		200	{object}	common.StatusEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/users/{userID}/unban [post]
func (h *Handler) HandleUnbanUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if err := h.service.Moderation.UnbanUser(ctx, userID); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "unbanned"})
}

// HandleListPendingVerifications godoc
//
//	@Summary		List pending user verifications — Admin/Moderator Access
//	@Description	Returns paginated list of pending user verifications.
//	@Tags			admin
//	@Produce		json
//	@Param			page	query		int		false	"Page number (default 1)"
//	@Param			limit	query		int		false	"Page size (default 20)"
//	@Success		200	{object}	common.DataMetaEnvelope{data=[]entity.UserVerification}
//	@Failure		403	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/verifications [get]
func (h *Handler) HandleListPendingVerifications(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	// Filter by status (pending | approved | rejected); default pending.
	status := r.URL.Query().Get("status")
	switch status {
	case "approved", "rejected", "pending":
		// valid
	default:
		status = "pending"
	}

	list, total, err := h.service.Verification.ListVerifications(ctx, status, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: list,
		Meta: common.ListMetaEnvelope{
			Page:   page,
			Limit:  limit,
			Offset: offset,
			Total:  total,
		},
	})
}

type reviewVerificationRequest struct {
	Status          string  `json:"status" validate:"required,oneof=approved rejected"`
	RejectionReason *string `json:"rejection_reason"`
}

// HandleReviewVerification godoc
//
//	@Summary		Review user verification — Admin/Moderator Access
//	@Description	Approve or reject a user's verification request.
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Param			id			path		string						true	"Verification ID"
//	@Param			payload		body		reviewVerificationRequest	true	"Review details"
//	@Success		200	{object}	common.StatusEnvelope
//	@Failure		400	{object}	common.ErrorEnvelope
//	@Failure		404	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/admin/verifications/{id}/review [post]
func (h *Handler) HandleReviewVerification(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	verificationID, err := common.ParseIDURLParam(r, "id")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	body, err := common.ReadJson[reviewVerificationRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if err := h.service.Verification.ReviewVerification(ctx, verificationID, body.Status, body.RejectionReason); err != nil {
		if errors.Is(err, apperror.ErrNotFound) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}
		if errors.Is(err, apperror.ErrBadRequest) {
			common.ServeBadRequestResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "reviewed"})

	// Fetch the verification record to get the user ID for socket notification
	verification, err := h.store.Verification.GetByID(ctx, verificationID)
	if err == nil && verification != nil {
		// Send real-time notification to the user via socket
		notifPayload := map[string]interface{}{
			"user_id": verification.UserID.String(),
			"status":  body.Status,
		}
		if body.RejectionReason != nil {
			notifPayload["reason"] = *body.RejectionReason
		}
		h.socketManager.sendJSONToUser(verification.UserID.String(), map[string]interface{}{
			"type": "verification:updated",
			"data": notifPayload,
		})
	}
}
