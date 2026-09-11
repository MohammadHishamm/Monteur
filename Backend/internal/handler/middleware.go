package handler

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/gorilla/sessions"
)

const sessionTouchInterval = 10 * time.Minute

func (h *Handler) rejectIfIPBanned(w http.ResponseWriter, r *http.Request) bool {
	ipAddress := common.GetIPAddr(r)
	if ipAddress == "" {
		return false
	}

	banned, err := h.service.User.IsIPBanned(r.Context(), ipAddress)
	if err != nil {
		common.Logger.Error("failed to verify banned ip address",
			slog.Any("error", err),
			slog.String("ip_address", ipAddress),
			slog.String("component", "handler.middleware"),
			slog.String("method", "rejectIfIPBanned"))
		common.ServeInternalServerResponse(w, r, err)
		return true
	}

	if !banned {
		return false
	}

	common.Logger.Warn("blocked request from banned ip address",
		slog.String("ip_address", ipAddress),
		slog.String("path", r.URL.Path),
		slog.String("component", "handler.middleware"),
		slog.String("method", "rejectIfIPBanned"))
	common.ServeForbiddenResponse(w, r)
	return true
}

func (h *Handler) WithIPBanEnforcement(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.rejectIfIPBanned(w, r) {
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *Handler) WithRequiredAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.Logger.Error("unauthenticated user access",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredAuth"))

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		common.Logger.Info("authenticated user access allowed",
			slog.Any("sessionID", sess.Raw.ID),
			slog.String("component", "handler.middleware"),
			slog.String("method", "WithRequiredAuth"))

		next.ServeHTTP(w, r)
	})
}

func (h *Handler) WithRequiredVerifiedUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		u, err := h.service.User.GetUserByID(r.Context(), sess.UserID)
		if err != nil {
			common.ServeInternalServerResponse(w, r, err)
			return
		}

		if u.VerificationStatus != "verified" && !u.Roles.IsAdmin() && !u.Roles.IsSuperAdmin() {
			common.Logger.Error("unverified user access",
				slog.Any("userID", sess.UserID),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredVerifiedUser"))
			common.ServeUnverifiedErrorResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *Handler) WithRequiredGuest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || sess.IsAuth() {
			common.Logger.Error("authenticated user access",
				slog.String("error", "require a guest access"),
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.Any("sessionID", sess.Raw.ID),
				slog.Bool("isAuth", sess.IsAuth()),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredGuest"))

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithRequiredAdmin validates the admin JWT from the Authorization header.
// Admins authenticate via POST /admin/auth/signin against the admins table —
// they are NOT in the users table and do NOT use Gorilla sessions.
func (h *Handler) WithRequiredAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			common.Logger.Error("missing or malformed Authorization header for admin route",
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredAdmin"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		claims, err := common.VerifyAccessToken(authHeader[7:])
		if err != nil {
			common.Logger.Error("invalid admin JWT",
				slog.Any("error", err),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredAdmin"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		isAdmin := false
		for _, role := range claims.Roles {
			if strings.EqualFold(role, "Admin") {
				isAdmin = true
				break
			}
		}
		if !isAdmin {
			common.Logger.Error("JWT lacks Admin role",
				slog.Any("roles", claims.Roles),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredAdmin"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		common.Logger.Info("admin JWT validated",
			slog.String("adminID", claims.UserID),
			slog.String("component", "handler.middleware"),
			slog.String("method", "WithRequiredAdmin"))

		ctx := common.WithClaims(r.Context(), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) WithRequiredModerator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.Logger.Error("unauthenticated moderator user access",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredModerator"))

			if sess.UserID != nil {
				common.Logger.Error("unauthenticated moderator user access",
					slog.String("error", "session is nil"),
					slog.Any("session", sess),
					slog.String("component", "handler.middleware"),
					slog.String("method", "WithRequiredModerator"))
			}

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsModerator() {
			common.Logger.Error("non-moderator user access",
				slog.String("error", "require moderator access"),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredModerator"))

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		common.Logger.Info("authenticated moderator user access allowed",
			slog.Any("session", sess),
			slog.String("component", "handler.middleware"),
			slog.String("method", "WithRequiredModerator"))

		next.ServeHTTP(w, r)
	})
}

// WithRequiredSuperAdmin restricts to SuperAdmin only (Packages, SEO).
func (h *Handler) WithRequiredSuperAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.Logger.Error("unauthenticated super admin user access",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredSuperAdmin"))

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsSuperAdmin() {
			common.Logger.Error("non-super-admin user access",
				slog.String("error", "require super admin access"),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredSuperAdmin"))

			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithRequiredUsersAccess allows SuperAdmin, Admin, Moderator (dashboard Users, Publishers tabs).
func (h *Handler) WithRequiredUsersAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsAdmin() && !sess.Roles.IsModerator() {
			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithRequiredTagsAccess allows SuperAdmin, Admin, Moderator.
func (h *Handler) WithRequiredTagsAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsAdmin() && !sess.Roles.IsModerator() {
			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithRequiredTransactionsAccess allows SuperAdmin, Accountant only (NOT Admin).
func (h *Handler) WithRequiredTransactionsAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsSuperAdmin() && !sess.Roles.IsAccountant() {
			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithRequiredAnalyticsAccess allows SuperAdmin, Admin, Accountant (NOT Moderator).
func (h *Handler) WithRequiredAnalyticsAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsAdmin() && !sess.Roles.IsAccountant() {
			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// WithRequiredExportSheetsAccess allows SuperAdmin, Admin, Accountant (NOT Moderator).
func (h *Handler) WithRequiredExportSheetsAccess(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsSuperAdmin() && !sess.Roles.IsAdmin() && !sess.Roles.IsAccountant() {
			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *Handler) WithRequiredModeratorOrAccountant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.Logger.Error("unauthenticated moderator/accountant user access",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredModeratorOrAccountant"))

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsModerator() && !sess.Roles.IsAccountant() && !sess.Roles.IsAdmin() {
			common.Logger.Error("non-moderator/accountant/admin user access",
				slog.String("error", "require moderator, accountant or admin access"),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredModeratorOrAccountant"))

			common.ServeForbiddenResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *Handler) WithRequiredFreelance(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.Logger.Error("unauthenticated freelance user access",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredFreelance"))

			if sess.UserID != nil {
				common.Logger.Error("unauthenticated freelance user access",
					slog.String("error", "session is nil"),
					slog.Any("session", sess),
					slog.String("component", "handler.middleware"),
					slog.String("method", "WithRequiredFreelance"))
			}

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		if !sess.Roles.IsFreelance() {
			common.Logger.Error("non-freelance user access",
				slog.String("error", "require freelance access"),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithRequiredFreelance"))

			common.ServeUnauthorizedErrorResponse(w, r, err)
			return
		}

		common.Logger.Info("authenticated freelance user access allowed",
			slog.Any("session", sess),
			slog.String("component", "handler.middleware"),
			slog.String("method", "WithRequiredFreelance"))

		next.ServeHTTP(w, r)
	})
}

// EnsureSession ensures that the request has a valid session.
func (h *Handler) EnsureSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var (
			err  error
			sess *entity.Session
		)

		sess, err = h.service.Auth.GetRequestSession(r, false)
		if err != nil || sess == nil {
			common.Logger.Warn("request session is not valid, creating guest session",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "EnsureSession"))

			// Only create a new empty guest session — do NOT overwrite an existing
			// authenticated session that just had a gob deserialization issue.
			// GetRequestSession already heals the session via JWT cookie fallback above.
			guestSess, createErr := h.service.Auth.CreateSessionUser(w, r, nil, nil, "", "")
			if createErr != nil {
				common.Logger.Error("failed to create guest session",
					slog.Any("error", createErr),
					slog.String("component", "handler.middleware"),
					slog.String("method", "EnsureSession"))

				common.WriteJson(w, http.StatusInternalServerError, apperror.ErrInternalServer)
				return
			}
			// Only use the guest session if the original also had no user.
			if sess == nil || !sess.IsAuth() {
				sess = guestSess
			}
		}

		if !h.service.Auth.VerifyVersion(sess, config.Configs.Version) {
			version := ""
			if sess != nil && sess.Version != nil {
				version = *sess.Version
			}

			common.Logger.Warn("found session with old version",
				slog.Any("session", sess),
				slog.String("version", version),
				slog.String("current", config.Configs.Version),
				slog.String("component", "handler.middleware"),
				slog.String("method", "EnsureSession"))

			sess, err = h.service.Auth.GetRequestSession(r, true)
			if err != nil {
				common.Logger.Warn("failed to get request session with user",
					slog.Any("error", err),
					slog.Any("session", sess),
					slog.Any("raw", sess.Raw),
					slog.String("component", "handler.middleware"),
					slog.String("method", "EnsureSession"))

				common.WriteJson(w, http.StatusInternalServerError, apperror.ErrInternalServer)
				return
			}

			if err = h.service.Auth.UpdateSessionUser(sess, w, r, sess.User, sess.Provider, config.Configs.Version); err != nil {
				common.Logger.Error("failed to update session version",
					slog.Any("error", err),
					slog.Any("session", sess),
					slog.Any("raw", sess.Raw),
					slog.String("component", "handler.middleware"),
					slog.String("method", "EnsureSession"))

				common.WriteJson(w, http.StatusInternalServerError, apperror.ErrInternalServer)
				return
			}

		} else {
			if sess.Raw.IsNew {
				common.Logger.Debug("saving new session",
					slog.Any("session", sess),
					slog.String("component", "handler.middleware"),
					slog.String("method", "EnsureSession"))

				if err := sess.Raw.Save(r, w); err != nil {
					common.Logger.Error("failed to save request session",
						slog.Any("error", err),
						slog.Any("session", sess),
						slog.String("component", "handler.middleware"),
						slog.String("method", "EnsureSession"))

					common.WriteJson(w, http.StatusInternalServerError, apperror.ErrInternalServer)
					return
				}
			} else if sess.IsAuth() && shouldTouchSession(sess.Raw, time.Now()) {
				touchSession(sess.Raw, time.Now())
				if err := sess.Raw.Save(r, w); err != nil {
					common.Logger.Error("failed to touch request session",
						slog.Any("error", err),
						slog.Any("session", sess),
						slog.String("component", "handler.middleware"),
						slog.String("method", "EnsureSession"))

					common.WriteJson(w, http.StatusInternalServerError, apperror.ErrInternalServer)
					return
				}
			}
		}

		common.Logger.Debug("ensured request session is valid",
			slog.Any("sessionID", sess.Raw.ID),
			slog.Bool("isAuth", sess.IsAuth()),
			slog.String("component", "handler.middleware"),
			slog.String("method", "EnsureSession"))

		ctx := context.WithValue(r.Context(), common.CtxSessionIDKey, sess)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func shouldTouchSession(raw *sessions.Session, now time.Time) bool {
	if raw == nil {
		return false
	}

	v, ok := raw.Values["lastTouchedAt"]
	if !ok || v == nil {
		return true
	}

	lastUnix, ok := v.(int64)
	if !ok {
		return true
	}

	return now.Sub(time.Unix(lastUnix, 0)) >= sessionTouchInterval
}

func touchSession(raw *sessions.Session, now time.Time) {
	if raw == nil {
		return
	}
	raw.Values["lastTouchedAt"] = now.Unix()
}

// WithJWTValidation validates JWT tokens from Authorization header
func (h *Handler) WithJWTValidation(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			common.Logger.Warn("missing authorization header",
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithJWTValidation"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		// Check if it's a Bearer token
		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			common.Logger.Warn("invalid authorization header format",
				slog.String("header", authHeader),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithJWTValidation"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		// Extract token
		tokenStr := authHeader[7:]
		if tokenStr == "" {
			common.Logger.Warn("empty token in authorization header",
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithJWTValidation"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		// Verify token
		claims, err := common.VerifyAccessToken(tokenStr)
		if err != nil {
			common.Logger.Warn("invalid JWT token",
				slog.Any("error", err),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithJWTValidation"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		// Attach claims to context
		ctx := common.WithClaims(r.Context(), claims)

		common.Logger.Debug("JWT token validated successfully",
			slog.String("userID", claims.UserID),
			slog.String("provider", claims.Provider),
			slog.String("component", "handler.middleware"),
			slog.String("method", "WithJWTValidation"))

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// WithJWTOrSessionAuth allows either JWT token or session-based authentication
func (h *Handler) WithJWTOrSessionAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check for JWT token first
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" && len(authHeader) >= 7 && authHeader[:7] == "Bearer " {
			// Use JWT validation
			h.WithJWTValidation(next).ServeHTTP(w, r)
			return
		}

		// Fall back to session-based authentication
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err != nil || !sess.IsAuth() {
			common.Logger.Warn("no valid JWT token or session found",
				slog.Any("error", err),
				slog.Any("session", sess),
				slog.String("component", "handler.middleware"),
				slog.String("method", "WithJWTOrSessionAuth"))
			common.ServeUnauthorizedErrorResponse(w, r, apperror.ErrUserNotAuthenticated)
			return
		}

		// Attach session to context
		ctx := context.WithValue(r.Context(), common.CtxSessionIDKey, sess)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
