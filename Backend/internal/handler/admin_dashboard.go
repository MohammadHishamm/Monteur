package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ─── Admin Auth ───────────────────────────────────────────────────────────────

type adminSigninRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// HandleAdminSignin authenticates against the admins table and returns an 8-hour JWT.
// This is a public endpoint — no session or user-table involvement.
func (h *Handler) HandleAdminSignin(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	req, err := common.ReadJson[adminSigninRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Password = strings.TrimSpace(req.Password)
	if req.Email == "" || req.Password == "" {
		common.ServeBadRequestResponse(w, r, errors.New("email and password are required"))
		return
	}

	admin, err := h.store.AdminDashboard.FindAdminByEmail(ctx, req.Email)
	if err != nil || admin == nil || !admin.IsActive {
		common.ServeUnauthorizedErrorResponse(w, r, errors.New("invalid credentials"))
		return
	}

	if !common.VerifyPassword(admin.PasswordHash, req.Password) {
		common.ServeUnauthorizedErrorResponse(w, r, errors.New("invalid credentials"))
		return
	}

	token, err := common.GenerateAdminToken(admin.ID.String())
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	go h.store.AdminDashboard.TouchAdminLogin(context.Background(), admin.ID)

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"access_token": token,
		"token_type":   "Bearer",
		"expires_in":   8 * 60 * 60,
		"admin": map[string]any{
			"id":        admin.ID,
			"email":     admin.Email,
			"full_name": admin.FullName,
		},
	}})
}

// ─── Analytics ───────────────────────────────────────────────────────────────

// HandleAdminAnalytics godoc
//
//	@Summary	Platform analytics — Admin
//	@Tags		admin-dashboard
//	@Produce	json
//	@Success	200	{object}	common.DataEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/analytics [get]
func (h *Handler) HandleAdminAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	stats, err := h.service.AdminDashboard.GetAnalytics(ctx)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: stats})
}

// ─── Users ────────────────────────────────────────────────────────────────────

// HandleAdminListUsers godoc
//
//	@Summary	List all users — Admin
//	@Tags		admin-dashboard
//	@Produce	json
//	@Param		role	query	string	false	"Filter by role: client or Freelance"
//	@Param		page	query	int		false	"Page (default 1)"
//	@Param		limit	query	int		false	"Page size (default 50)"
//	@Success	200	{object}	common.DataMetaEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/users [get]
func (h *Handler) HandleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	role := r.URL.Query().Get("role") // "client", "Freelance", or ""

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	users, total, err := h.service.AdminDashboard.ListUsers(ctx, role, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: users,
		Meta: common.ListMetaEnvelope{Page: page, Limit: limit, Offset: offset, Total: total},
	})
}

// HandleAdminDeleteUser godoc
//
//	@Summary	Delete user — Admin
//	@Tags		admin-dashboard
//	@Param		userID	path	string	true	"User ID"
//	@Success	200	{object}	common.StatusEnvelope
//	@Failure	400	{object}	common.ErrorEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/users/{userID} [delete]
func (h *Handler) HandleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	if err := h.service.AdminDashboard.DeleteUser(ctx, userID); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "deleted"})
}

type addBalanceRequest struct {
	Amount float64 `json:"amount"`
}

// HandleAdminAddBalance godoc
//
//	@Summary	Add balance to user wallet — Admin
//	@Tags		admin-dashboard
//	@Accept		json
//	@Produce	json
//	@Param		userID	path	string				true	"User ID"
//	@Param		payload	body	addBalanceRequest	true	"Amount"
//	@Success	200	{object}	common.StatusEnvelope
//	@Failure	400	{object}	common.ErrorEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/users/{userID}/balance [post]
func (h *Handler) HandleAdminAddBalance(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	body, err := common.ReadJson[addBalanceRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	if body.Amount <= 0 {
		common.ServeBadRequestResponse(w, r, errors.New("amount must be greater than 0"))
		return
	}

	if err := h.service.AdminDashboard.AddBalance(ctx, userID, body.Amount); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "balance_added"})
}

// HandleAdminDeductBalance godoc
//
//	@Summary	Deduct balance from user wallet — Admin
//	@Tags		admin-dashboard
//	@Accept		json
//	@Produce	json
//	@Param		userID	path	string				true	"User ID"
//	@Param		payload	body	addBalanceRequest	true	"Amount to deduct"
//	@Success	200	{object}	common.StatusEnvelope
//	@Router		/admin/users/{userID}/deduct-balance [post]
func (h *Handler) HandleAdminDeductBalance(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	body, err := common.ReadJson[addBalanceRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	if body.Amount <= 0 {
		common.ServeBadRequestResponse(w, r, errors.New("amount must be greater than 0"))
		return
	}

	if err := h.service.AdminDashboard.DeductBalance(ctx, userID, body.Amount); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.StatusEnvelope{Status: "balance_deducted"})
}

type adminWarningRequest struct {
	Message string `json:"message"`
}

// HandleAdminSendWarning godoc
//
//	@Summary	Send a warning notification to user — Admin
//	@Tags		admin-dashboard
//	@Accept		json
//	@Produce	json
//	@Param		userID	path	string					true	"User ID"
//	@Param		payload	body	adminWarningRequest		true	"Warning message"
//	@Success	200	{object}	common.DataEnvelope
//	@Failure	400	{object}	common.ErrorEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/users/{userID}/warning [post]
func (h *Handler) HandleAdminSendWarning(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID, err := common.ParseIDURLParam(r, "userID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	body, err := common.ReadJson[adminWarningRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	count, err := h.service.AdminDashboard.SendWarning(ctx, userID, body.Message)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]any{
		"warning_count": count,
	}})
}

// ─── Support ─────────────────────────────────────────────────────────────────

// HandleAdminListSupportConversations godoc
//
//	@Summary	List support conversations — Admin
//	@Tags		admin-dashboard
//	@Produce	json
//	@Param		page	query	int	false	"Page"
//	@Param		limit	query	int	false	"Limit"
//	@Success	200	{object}	common.DataMetaEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/support/conversations [get]
func (h *Handler) HandleAdminListSupportConversations(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if limit <= 0 {
		limit = 30
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	convs, total, err := h.service.AdminDashboard.ListSupportConversations(ctx, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataMetaEnvelope{
		Data: convs,
		Meta: common.ListMetaEnvelope{Page: page, Limit: limit, Offset: offset, Total: total},
	})
}

// HandleAdminGetSupportMessages godoc
//
//	@Summary	Get messages for a support conversation — Admin
//	@Tags		admin-dashboard
//	@Produce	json
//	@Param		conversationID	path	string	true	"Conversation ID"
//	@Param		limit			query	int		false	"Max messages (default 100)"
//	@Success	200	{object}	common.DataEnvelope
//	@Failure	400	{object}	common.ErrorEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/support/conversations/{conversationID}/messages [get]
func (h *Handler) HandleAdminGetSupportMessages(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	convID, err := common.ParseIDURLParam(r, "conversationID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 100
	}

	msgs, err := h.service.AdminDashboard.GetSupportMessages(ctx, convID, limit)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: msgs})
}

type adminSupportReplyRequest struct {
	Text string `json:"text"`
}

// HandleAdminReplySupportMessage godoc
//
//	@Summary	Reply to a support conversation — Admin
//	@Tags		admin-dashboard
//	@Accept		json
//	@Produce	json
//	@Param		conversationID	path	string							true	"Conversation ID"
//	@Param		payload			body	adminSupportReplyRequest		true	"Message body"
//	@Success	201	{object}	common.DataEnvelope
//	@Failure	400	{object}	common.ErrorEnvelope
//	@Failure	500	{object}	common.ErrorEnvelope
//	@Router		/admin/support/conversations/{conversationID}/messages [post]
func (h *Handler) HandleAdminReplySupportMessage(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	convID, err := common.ParseIDURLParam(r, "conversationID")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	body, err := common.ReadJson[adminSupportReplyRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	if body.Text == "" {
		common.ServeBadRequestResponse(w, r, errors.New("text is required"))
		return
	}

	claims, err := common.GetClaimsFromContext(ctx)
	if err != nil {
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}
	adminID, parseErr := uuid.Parse(claims.UserID)
	if parseErr != nil {
		common.ServeUnauthorizedErrorResponse(w, r, parseErr)
		return
	}

	msg, err := h.service.AdminDashboard.ReplyToSupport(ctx, convID, adminID, body.Text)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: map[string]any{
		"id":          msg.ID,
		"sender":      "admin",
		"sender_name": chi.URLParam(r, "conversationID"), // placeholder — name resolved on read
		"text":        msg.Text,
		"sent_at":     msg.SentAt,
	}})
}
