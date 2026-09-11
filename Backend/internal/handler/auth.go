package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"

	"github.com/go-chi/chi/v5"
	"github.com/markbates/goth/gothic"
)

// HandleAuthProviderLogin godoc
//
//	@Summary		Login user. Guest Access
//	@Description	Login user. Requires no authentication.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	nil
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/auth/{provider} [get]
func (h *Handler) HandleAuthProviderLogin(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	param := chi.URLParam(r, "provider")
	provider := h.service.Auth.ValidateProvider(param)
	if provider == nil {
		common.Logger.Error("invalid provider",
			slog.String("param", param),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthProviderLogin"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), apperror.ErrAuthHostInvalid)
		return
	}

	// OAuth flow (Discord / Google)
	if u, err := gothic.CompleteUserAuth(w, r.WithContext(ctx)); err == nil {
		common.Logger.Warn("user already logged in",
			slog.Any("user", u),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthProviderLogin"))

		http.Redirect(w, r.WithContext(ctx), config.Configs.FrontendURL.WithPath("/"), http.StatusMovedPermanently)
	} else {
		gothic.BeginAuthHandler(w, r.WithContext(ctx))
	}
}

func (h *Handler) HandleAuthCallbackFunction(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	param := chi.URLParam(r, "provider")
	provider := h.service.Auth.ValidateProvider(param)
	if provider == nil {
		common.Logger.Error("invalid provider",
			slog.String("param", param),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), apperror.ErrAuthHostInvalid)
		return
	}

	gu, err := gothic.CompleteUserAuth(w, r.WithContext(ctx))
	if err != nil {
		common.Logger.Error("failed to complete user authentication",
			slog.Any("error", err),
			slog.String("provider", param),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))

		http.Redirect(w, r, config.Configs.FrontendURL.WithPath("/auth/error"), http.StatusFound)
		return
	}

	common.Logger.Info("user authenticated with provider",
		slog.String("email", gu.Email),
		slog.String("provider", gu.Provider),
		slog.String("component", "handler.auth"),
		slog.String("method", "HandleAuthCallbackFunction"))

	req := entity.UserCreateRequest{
		UserName:  gu.Name,
		Email:     gu.Email,
		FirstName: &gu.FirstName,
		LastName:  &gu.LastName,
		AvatarURL: &gu.AvatarURL,
	}

	u, err := h.service.User.CreateOrUpdateUser(ctx, &req)
	if err != nil {
		common.Logger.Error("failed to create or update user",
			slog.Any("error", err),
			slog.String("email", gu.Email),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
		http.Redirect(w, r, config.Configs.FrontendURL.WithPath("/auth/error"), http.StatusFound)
		return
	}

	inserted, err := h.service.UserBalance.CreateInitialBalance(ctx, u.ID)
	if err != nil {
		common.Logger.Error("failed to create initial balance",
			slog.Any("error", err),
			slog.Any("user_id", u.ID),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
	} else if inserted {
		common.Logger.Info("initial balance created for user",
			slog.Any("user_id", u.ID))
	} else {
		common.Logger.Info("balance already exists for user",
			slog.Any("user_id", u.ID))
	}

	// Generate JWT token
	roles := make([]string, len(u.Roles))
	for i, role := range u.Roles {
		roles[i] = role.String()
	}

	accessToken, err := common.GenerateAccessToken(u.ID.String(), provider.String(), roles)
	if err != nil {
		common.Logger.Error("failed to generate access token",
			slog.Any("error", err),
			slog.String("userID", u.ID.String()),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
		http.Redirect(w, r, config.Configs.FrontendURL.WithPath("/auth/error"), http.StatusFound)
		return
	}

	// Generate refresh token
	refreshToken, err := h.service.Auth.CreateRefreshToken(ctx, u.ID, common.GetIPAddr(r), common.GetUserAgent(r))
	if err != nil {
		common.Logger.Error("failed to create refresh token",
			slog.Any("error", err),
			slog.String("userID", u.ID.String()),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
		http.Redirect(w, r, config.Configs.FrontendURL.WithPath("/auth/error"), http.StatusFound)
		return
	}

	if _, err = h.service.Auth.CreateSessionUser(w, r, u, provider, accessToken, refreshToken); err != nil {
		common.Logger.Error("failed to create user session",
			slog.Any("error", err),
			slog.Any("user_id", u.ID),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
		http.Redirect(w, r, config.Configs.FrontendURL.WithPath("/auth/error"), http.StatusFound)
		return
	}

	isActivated, err := h.service.User.IsUserActivated(ctx, u.ID)
	if err != nil {
		common.Logger.Error("failed to check activation status",
			slog.Any("error", err),
			slog.Any("user_id", u.ID),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthCallbackFunction"))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if !isActivated {
		updated, err := h.service.User.UpdateUserStatus(ctx, u.ID, true)
		if err != nil || !updated {
			common.Logger.Error("failed to activate user",
				slog.Any("error", err),
				slog.Any("user_id", u.ID),
				slog.String("component", "handler.auth"),
				slog.String("method", "HandleAuthCallbackFunction"))
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		common.Logger.Info("user activated",
			slog.Any("user_id", u.ID))
	}

	common.Logger.Info("successfully processed auth callback",
		slog.Any("user_id", u.ID),
		slog.String("provider", gu.Provider),
		slog.String("component", "handler.auth"),
		slog.String("method", "HandleAuthCallbackFunction"))

	http.Redirect(w, r.WithContext(ctx), config.Configs.FrontendURL.WithPath("/"), http.StatusFound)
}

// HandleAuthLogout godoc
//
//	@Summary		Logout auth user. User Access
//	@Description	Logout auth user. Requires authentication.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	common.DataEnvelope{data=nil}
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/auth/logout/{provider} [post]
func (h *Handler) HandleAuthLogout(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	param := chi.URLParam(r, "provider")
	provider := h.service.Auth.ValidateProvider(param)
	if provider == nil {
		common.Logger.Error("invalid provider",
			slog.String("param", param),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleAuthProviderLogin"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), apperror.ErrAuthHostInvalid)
		return
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil {
		common.Logger.Error("failed to get session",
			slog.Any("error", err),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleLogout"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	err = gothic.Logout(w, r.WithContext(ctx))
	if err != nil {
		common.Logger.Error("failed to logout",
			slog.Any("error", err),
			slog.Any("session", sess),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleLogout"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	// Revoke refresh token in DB
	if sess != nil && sess.RefreshToken != "" {
		if err := h.service.Auth.RevokeRefreshToken(ctx, sess.RefreshToken); err != nil {
			common.Logger.Error("failed to revoke refresh token on logout",
				slog.Any("error", err),
				slog.String("component", "handler.auth"),
				slog.String("method", "HandleLogout"))
		}
	}

	if err := h.service.Auth.RemoveSessionUser(sess, w, r); err != nil {
		common.Logger.Error("failed to remove session user",
			slog.Any("error", err),
			slog.Any("userID", sess),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleLogout"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	clearAuthCookies(w)
	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: nil})
}

// HandleGetSession godoc
//
//	@Summary		Get auth user session. User Access
//	@Description	Get auth user session. Requires authentication.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	common.DataEnvelope{data=entity.Session}
//	@Failure		401	{object}	common.ErrorEnvelope
//	@Failure		500	{object}	common.ErrorEnvelope
//	@Router			/auth/session [get]
func (h *Handler) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	sess := h.service.Auth.SafeGetRequestSession(r.WithContext(ctx), false)

	// Not authenticated — return empty routing payload so middleware can decide.
	if sess == nil || !sess.IsAuth() || sess.UserID == nil {
		common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]interface{}{
			"authenticated":       false,
			"user_type":           "",
			"role":                "",
			"onboarding_done":     false,
			"verification_status": "unverified",
		}})
		return
	}

	var name, email, userType, role, verificationStatus string
	var onboardingDone bool

	if u, err := h.store.User.FindByID(ctx, *sess.UserID); err == nil && u != nil {
		name = u.FullName
		email = u.Email
		userType = u.UserType
		verificationStatus = u.VerificationStatus
		if verificationStatus == "" {
			verificationStatus = "unverified"
		}
		// Explicit, authoritative flag set by the onboarding handlers. Previously this
		// was inferred from content fields (tagline / company_name), which caused
		// clients to loop forever on the final onboarding step.
		onboardingDone = u.OnboardingCompleted
	}
	if len(sess.Roles) > 0 {
		role = string(sess.Roles[0])
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]interface{}{
		"authenticated":       true,
		"user_type":           userType,
		"role":                role,
		"onboarding_done":     onboardingDone,
		"verification_status": verificationStatus,
		"name":                name,
		"email":               email,
		"user_id":             sess.UserID.String(),
	}})
}

// HandleEmailSignup godoc
//
//	@Summary		Sign up with email and password. Guest Access
//	@Description	Create a new user account with email and password. Requires no authentication.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		entity.EmailAuthRequest	true	"Email authentication request"
//	@Success		200		{object}	common.DataEnvelope{data=entity.User}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		409		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/auth/email/signup [post]
func (h *Handler) HandleEmailSignup(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second*30)
	defer cancel()

	req, err := common.ReadJson[entity.EmailAuthRequest](w, r)
	if err != nil {
		common.Logger.Error("failed to parse email signup request",
			slog.Any("error", err),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleEmailSignup"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	if err := req.Normalize(); err != nil {
		common.Logger.Error("failed to normalize email signup request",
			slog.Any("error", err),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleEmailSignup"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	authRes, err := h.service.Auth.RegisterWithEmail(ctx, req, common.GetIPAddr(r), common.GetUserAgent(r))
	if err != nil {
		if errors.Is(err, apperror.ErrUserEmailAlreadyExists) {
			common.Logger.Warn("user already exists",
				slog.String("email", req.Email),
				slog.String("component", "handler.auth"),
				slog.String("method", "HandleEmailSignup"))
			common.ServeConflictResponse(w, r.WithContext(ctx), err)
			return
		}

		common.Logger.Error("failed to register user",
			slog.Any("error", err),
			slog.String("email", req.Email),
			slog.String("component", "handler.auth"),
			slog.String("method", "HandleEmailSignup"))
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	// In production, user requires email activation before sessions/tokens are issued.
	if !authRes.User.IsEmailVerified && !authRes.User.Is_activated {
		if h.mailer != nil {
			activationToken, err := common.GenerateAccessToken(authRes.User.ID.String(), "activation", []string{"activation"})
			if err == nil {
				_ = h.mailer.SendEmailActivation(authRes.User.Email, activationToken)
			}
		}

		common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":        authRes.User.ID,
				"email":     authRes.User.Email,
				"full_name": authRes.User.FullName,
				"user_type": req.UserType,
			},
			"message":      "Please check your email to activate your account.",
			"is_activated": false,
		}})
		return
	}

	provider := h.service.Auth.ValidateProvider("email")
	if _, err = h.service.Auth.CreateSessionUser(w, r, authRes.User, provider, authRes.AccessToken, authRes.RefreshToken); err != nil {
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	common.Logger.Info("user registered and signed in",
		slog.String("userID", authRes.User.ID.String()),
		slog.String("email", req.Email),
		slog.String("component", "handler.auth"),
		slog.String("method", "HandleEmailSignup"))

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]interface{}{
		"user": map[string]interface{}{
			"id":        authRes.User.ID,
			"email":     authRes.User.Email,
			"full_name": authRes.User.FullName,
			"user_type": req.UserType,
			"roles":     authRes.Roles,
		},
		"access_token": authRes.AccessToken,
		"token_type":   authRes.TokenType,
		"expires_in":   authRes.ExpiresIn,
		"is_activated": true,
	}})
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

// setAuthCookies is intentionally removed. All user data lives in the
// server-side Redis session. No credential or routing cookies are written to
// the browser; only the gorilla/redistore session-ID cookie (HttpOnly) is set.

func clearAuthCookies(w http.ResponseWriter) {
	cookieNames := []string{
		config.Configs.SessionCookieName,
		"access_token",
		"auth_token",
		"auth-token",
		"refresh_token",
		"user_id",
		"uid",
	}

	isSecure := false
	if config.Configs != nil && config.Configs.ApiURL != nil && config.Configs.ApiURL.Schema == "https" {
		isSecure = true
	}

	for _, name := range cookieNames {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			Expires:  time.Unix(0, 0),
			HttpOnly: true,
			Secure:   isSecure,
			SameSite: http.SameSiteLaxMode,
		})
	}
}

// HandleEmailSignin godoc
//
//	@Summary		Sign in with email and password. Guest Access
//	@Description	Authenticate user with email and password. Requires no authentication.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		entity.EmailAuthRequest	true	"Email authentication request"
//	@Success		200		{object}	common.DataEnvelope{data=entity.User}
//	@Failure		400		{object}	common.ErrorEnvelope
//	@Failure		401		{object}	common.ErrorEnvelope
//	@Failure		404		{object}	common.ErrorEnvelope
//	@Failure		500		{object}	common.ErrorEnvelope
//	@Router			/auth/email/signin [post]
func (h *Handler) HandleEmailSignin(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	req, err := common.ReadJson[entity.EmailSigninRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r.WithContext(ctx), err)
		return
	}
	if err := req.Normalize(); err != nil {
		common.ServeBadRequestResponse(w, r.WithContext(ctx), err)
		return
	}

	authRes, err := h.service.Auth.AuthenticateWithEmail(ctx, req.Email, req.Password, common.GetIPAddr(r), common.GetUserAgent(r))
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotAuthenticated) {
			common.ServeUnauthorizedErrorResponse(w, r.WithContext(ctx), err)
			return
		}
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	provider := h.service.Auth.ValidateProvider("email")
	if _, err = h.service.Auth.CreateSessionUser(w, r, authRes.User, provider, authRes.AccessToken, authRes.RefreshToken); err != nil {
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	common.Logger.Info("user signed in",
		slog.String("userID", authRes.User.ID.String()),
		slog.String("component", "handler.auth"),
		slog.String("method", "HandleEmailSignin"))

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]interface{}{
		"user": map[string]interface{}{
			"id":        authRes.User.ID,
			"email":     authRes.User.Email,
			"full_name": authRes.User.FullName,
			"user_type": authRes.User.UserType,
			"roles":     authRes.Roles,
		},
		"access_token": authRes.AccessToken,
		"token_type":   authRes.TokenType,
		"expires_in":   authRes.ExpiresIn,
	}})
}

// HandleSignout clears auth cookies and optionally revokes the Redis session.
func (h *Handler) HandleSignout(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Best-effort: clear the Redis session if one exists.
	sess := h.service.Auth.SafeGetRequestSession(r.WithContext(ctx), false)
	if sess != nil && sess.IsAuth() {
		if sess.RefreshToken != "" {
			_ = h.service.Auth.RevokeRefreshToken(ctx, sess.RefreshToken)
		}
		_ = h.service.Auth.RemoveSessionUser(sess, w, r)
	}

	clearAuthCookies(w)
	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]bool{"ok": true}})
}

// HandleRefreshToken rotates refresh/access tokens and renews the auth session.
func (h *Handler) HandleRefreshToken(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sess, err := h.service.Auth.GetRequestSession(r.WithContext(ctx), false)
	if err != nil || sess == nil || !sess.IsAuth() || sess.RefreshToken == "" {
		common.ServeUnauthorizedErrorResponse(w, r.WithContext(ctx), apperror.ErrUserNotAuthenticated)
		return
	}

	newAccessToken, newRefreshToken, err := h.service.Auth.RotateRefreshToken(
		ctx,
		sess.RefreshToken,
		common.GetIPAddr(r),
		common.GetUserAgent(r),
	)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotAuthenticated) {
			common.ServeUnauthorizedErrorResponse(w, r.WithContext(ctx), err)
			return
		}
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	if sess.UserID == nil {
		common.ServeUnauthorizedErrorResponse(w, r.WithContext(ctx), apperror.ErrUserNotAuthenticated)
		return
	}

	u, err := h.service.User.GetUserByID(ctx, sess.UserID)
	if err != nil {
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}
	if u == nil {
		common.ServeUnauthorizedErrorResponse(w, r.WithContext(ctx), apperror.ErrUserNotAuthenticated)
		return
	}

	if _, err = h.service.Auth.CreateSessionUser(w, r, u, sess.Provider, newAccessToken, newRefreshToken); err != nil {
		common.ServeInternalServerResponse(w, r.WithContext(ctx), err)
		return
	}

	roles := make([]string, len(u.Roles))
	for i, role := range u.Roles {
		roles[i] = role.String()
	}

	common.WriteJson(w, http.StatusOK, common.DataEnvelope{Data: map[string]interface{}{
		"user": map[string]interface{}{
			"id":        u.ID,
			"email":     u.Email,
			"full_name": u.FullName,
			"user_type": u.UserType,
			"roles":     roles,
		},
		"access_token": newAccessToken,
		"token_type":   "Bearer",
		"expires_in":   15 * 60,
	}})
}

func (h *Handler) HandleEmailActivation(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	w.Header().Set("Content-Type", "application/json")

	type Response struct {
		Activated bool   `json:"activated"`
		Message   string `json:"message"`
	}

	// Parse token
	token := r.URL.Query().Get("token")
	if token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Activation token is required"})
		return
	}

	// Decode token
	claims, err := common.VerifyAccessToken(token)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Invalid or expired activation token"})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Invalid user ID in token"})
		return
	}

	// Check if already activated
	isActivated, err := h.service.User.IsUserActivated(ctx, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Failed to check user activation"})
		return
	}

	if isActivated {
		json.NewEncoder(w).Encode(Response{Activated: true, Message: "User is already activated"})
		return
	}

	// Activate the user
	updated, err := h.service.User.UpdateUserStatus(ctx, userID, true)
	if err != nil || !updated {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Failed to activate user"})
		return
	}

	// Get the user after activation
	u, err := h.service.User.GetUserByID(ctx, &userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Failed to get user after activation"})
		return
	}

	// Create initial balance (same as OAuth flow)
	inserted, err := h.service.UserBalance.CreateInitialBalance(ctx, u.ID)
	if err != nil {
		common.Logger.Error("failed to create initial balance",
			slog.Any("error", err),
			slog.Any("user_id", u.ID))
	} else if inserted {
		common.Logger.Info("initial balance created for user",
			slog.Any("user_id", u.ID))
	} else {
		common.Logger.Info("balance already exists for user",
			slog.Any("user_id", u.ID))
	}

	// Generate tokens
	roles := make([]string, len(u.Roles))
	for i, role := range u.Roles {
		roles[i] = role.String()
	}

	accessToken, err := common.GenerateAccessToken(u.ID.String(), "email", roles)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Failed to generate access token"})
		return
	}

	// Generate refresh token
	refreshToken, err := h.service.Auth.CreateRefreshToken(ctx, u.ID, common.GetIPAddr(r), common.GetUserAgent(r))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Failed to create refresh token"})
		return
	}

	// Create session
	provider := h.service.Auth.ValidateProvider("email")
	if _, err = h.service.Auth.CreateSessionUser(w, r, u, provider, accessToken, refreshToken); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{Activated: false, Message: "Failed to create session"})
		return
	}

	// Success response
	json.NewEncoder(w).Encode(map[string]interface{}{
		"activated":    true,
		"message":      "Your account has been successfully activated!",
		"user":         u,
		"accessToken":  accessToken,
		"tokenType":    "Bearer",
		"expiresIn":    15 * 60, // 15 minutes
		"is_activated": true,
	})
}

func (h *Handler) HandleForgotPassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Parse email from request body
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	// Check if user exists
	user, err := h.service.User.GetUserByEmail(ctx, req.Email)
	if err != nil || user == nil {
		// Always respond with generic message to prevent user enumeration
		w.Write([]byte("If this email exists, a reset link has been sent"))
		return
	}

	// Generate password reset token (JWT, 1 hour expiration)
	token, err := common.GeneratePasswordResetToken(user.ID.String())
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	if err := h.mailer.SendResetpassword(user.Email, token); err != nil {
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}

	w.Write([]byte("If this email exists, a reset link has been sent"))
}

func (h *Handler) HandleResetPassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Reset token is required", http.StatusBadRequest)
		return
	}

	claims, err := common.VerifyAccessToken(token)
	if err != nil {
		http.Error(w, "Invalid or expired token", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		http.Error(w, "Invalid user ID in token", http.StatusBadRequest)
		return
	}

	// Parse new password from body
	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}

	// Hash the password
	hashedPassword, err := common.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Update password in DB
	updated, err := h.service.User.UpdateUserPassword(ctx, userID, hashedPassword)
	if err != nil || !updated {
		http.Error(w, "Failed to reset password", http.StatusInternalServerError)
		return
	}

	w.Write([]byte("Password has been reset successfully! You can now log in."))
}
