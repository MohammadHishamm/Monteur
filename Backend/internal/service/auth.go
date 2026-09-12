package service

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"

	"github.com/boj/redistore"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
	"github.com/lib/pq"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/discord"
	"github.com/markbates/goth/providers/github"
	"github.com/markbates/goth/providers/google"
)

type AuthService struct {
	session  *redistore.RediStore
	userSrv  *UserService
	tokenStr *store.TokenStore
}

func newAuthService(ss *redistore.RediStore, us *UserService, ts *store.TokenStore) *AuthService {
	// isDev := config.Configs.Env.IsDev()

	// if !isDev {
	// 	common.Logger.Warn("OAuth providers are disabled in production mode",
	// 		slog.String("env", "production"))
	// 	return &AuthService{session: ss, userSrv: us}
	// }

	// Only runs in dev
	discordUrl, err := common.BuildCallbackURL(true, config.Configs.ApiURL.Host, config.Configs.ApiURL.Port, config.Configs.ApiURL.Schema, "discord")
	if err != nil {
		common.Logger.Error("failed to build callback URL",
			slog.Any("error", err),
			slog.String("component", "service.auth"),
			slog.String("method", "newAuthService"))
		return &AuthService{session: ss, userSrv: us, tokenStr: ts}
	}

	googleUrl, err := common.BuildCallbackURL(true, config.Configs.ApiURL.Host, config.Configs.ApiURL.Port, config.Configs.ApiURL.Schema, "google")
	if err != nil {
		common.Logger.Error("failed to build callback URL",
			slog.Any("error", err),
			slog.String("provider", "google"),
			slog.String("component", "service.auth"),
			slog.String("method", "newAuthService"))
		return &AuthService{session: ss, userSrv: us, tokenStr: ts}
	}

	githubUrl, err := common.BuildCallbackURL(true, config.Configs.ApiURL.Host, config.Configs.ApiURL.Port, config.Configs.ApiURL.Schema, "github")
	if err != nil {
		common.Logger.Error("failed to build callback URL",
			slog.Any("error", err),
			slog.String("provider", "github"),
			slog.String("component", "service.auth"),
			slog.String("method", "newAuthService"))
		return &AuthService{session: ss, userSrv: us, tokenStr: ts}
	}

	gothic.Store = ss
	goth.UseProviders(
		discord.New(config.Configs.DiscordClientID, config.Configs.DiscordClientSecret, discordUrl, discord.ScopeIdentify, discord.ScopeEmail),
		google.New(config.Configs.GoogleClientID, config.Configs.GoogleClientSecret, googleUrl, "email", "profile"),
		github.New(config.Configs.GitHubClientID, config.Configs.GitHubClientSecret, githubUrl, "user:email"),
	)

	common.Logger.Info("OAuth providers enabled (Discord, Google & GitHub)",
		slog.String("env", "development"))

	return &AuthService{session: ss, userSrv: us, tokenStr: ts}
}

func (s *AuthService) GetSessionUserID(sess *sessions.Session) (*uuid.UUID, error) {
	if sess == nil {
		return nil, apperror.ErrUserNotAuthenticated
	}

	value, ok := sess.Values["uID"]
	if !ok || value == nil {
		return nil, nil
	}

	// uID is stored as a UUID string to avoid gob pointer-registration issues.
	// Support all formats that may exist in existing Redis sessions.
	var uID *uuid.UUID
	switch v := value.(type) {
	case string:
		if parsed, err := uuid.Parse(v); err == nil {
			uID = &parsed
		}
	case *uuid.UUID:
		uID = v
	case uuid.UUID:
		uID = &v
	}

	if uID == nil {
		common.Logger.Error("failed to parse session userID",
			slog.Any("uIDSess", value),
			slog.String("component", "service.auth"),
			slog.String("method", "getSessionUserID"))
		return nil, apperror.ErrUserNotAuthenticated
	}

	return uID, nil
}

func (s *AuthService) GetSessionUserRoles(sess *sessions.Session) (*entity.RoleNames, error) {
	if sess == nil {
		return nil, apperror.ErrUserNotAuthenticated
	}

	value, ok := sess.Values["roles"]

	common.Logger.Debug("retrieving session user roles",
		slog.Any("roles", value),
		slog.String("component", "service.auth"),
		slog.String("method", "getSessionUserRoles"))

	if !ok || value == nil {
		return &entity.RoleNames{}, nil
	}

	uRoles, ok := value.(entity.RoleNames)
	if !ok {
		common.Logger.Error("failed to get session user role",
			slog.String("error", "failed to convert user roles to []entity.RoleName"),
			slog.Bool("ok", ok),
			slog.String("component", "service.auth"),
			slog.String("method", "getSessionUserRoles"))
		return nil, apperror.ErrUserNotAuthenticated
	}

	return &uRoles, nil
}

func (s *AuthService) GetSessionJWTTokens(sess *sessions.Session) (accessToken, refreshToken string) {
	if sess == nil {
		return "", ""
	}

	accessTokenValue, ok := sess.Values["accessToken"]
	if ok && accessTokenValue != nil {
		if token, ok := accessTokenValue.(string); ok {
			accessToken = token
		}
	}

	refreshTokenValue, ok := sess.Values["refreshToken"]
	if ok && refreshTokenValue != nil {
		if token, ok := refreshTokenValue.(string); ok {
			refreshToken = token
		}
	}

	common.Logger.Debug("retrieved JWT token metadata from session",
		slog.Int("accessTokenLength", len(accessToken)),
		slog.Int("refreshTokenLength", len(refreshToken)),
		slog.String("component", "service.auth"),
		slog.String("method", "GetSessionJWTTokens"))

	return accessToken, refreshToken
}

func (s *AuthService) GetSessionVersion(sess *sessions.Session) (string, error) {
	if sess == nil {
		return "", apperror.ErrUserNotAuthenticated
	}

	value, ok := sess.Values["version"]

	common.Logger.Debug("retrieving session version",
		slog.Any("version", value),
		slog.String("component", "service.auth"),
		slog.String("method", "getSessionVersion"))

	if !ok || value == nil {
		return "", nil
	}

	version, ok := value.(string)
	if !ok {
		common.Logger.Error("failed to get session user role",
			slog.String("error", "failed to convert user roles to []entity.RoleName"),
			slog.Bool("ok", ok),
			slog.String("component", "service.auth"),
			slog.String("method", "getSessionVersion"))
		return "", apperror.ErrUserNotAuthenticated
	}

	return version, nil
}

func (s *AuthService) GetSessionUserProvider(sess *sessions.Session) (*entity.AuthProvider, error) {
	if sess == nil {
		return nil, apperror.ErrUserNotAuthenticated
	}

	value, ok := sess.Values["provider"]
	if !ok || value == nil {
		return nil, nil
	}

	// Provider is stored as a plain string to avoid gob pointer-type issues.
	// Support three formats that may exist in existing Redis sessions:
	//   1. string (new format, written going forward)
	//   2. entity.AuthProvider (value, old gob-registered format)
	//   3. *entity.AuthProvider (pointer, legacy format — gob decodes as string anyway)
	var providerStr string
	switch v := value.(type) {
	case string:
		providerStr = v
	case entity.AuthProvider:
		providerStr = string(v)
	case *entity.AuthProvider:
		if v != nil {
			providerStr = string(*v)
		}
	default:
		common.Logger.Warn("unknown provider type in session, ignoring",
			slog.Any("value", value),
			slog.String("component", "service.auth"),
			slog.String("method", "GetSessionUserProvider"))
		return nil, nil
	}

	if providerStr == "" {
		return nil, nil
	}

	p := entity.AuthProvider(providerStr)
	return &p, nil
}

func (s *AuthService) GetRequestSession(r *http.Request, fetchUser bool) (*entity.Session, error) {
	// 1. Attempt Redis session cookie resolution via Gorilla Redistore
	sess, err := s.session.New(r, config.Configs.SessionCookieName)
	if err != nil {
		common.Logger.Warn("session cookie decode error, attempting JWT fallback",
			slog.Any("error", err),
			slog.String("component", "service.auth"),
			slog.String("method", "GetRequestSession"))
	}

	uID, uIDErr := s.GetSessionUserID(sess)
	if uIDErr == nil && uID != nil {
		p, err := s.GetSessionUserProvider(sess)
		if err != nil {
			return nil, err
		}

		roles, err := s.GetSessionUserRoles(sess)
		if err != nil {
			return nil, err
		}

		version, err := s.GetSessionVersion(sess)
		if err != nil {
			return nil, err
		}

		// Get JWT tokens from session
		accessToken, refreshToken := s.GetSessionJWTTokens(sess)

		data := entity.NewSession(uID, p, roles)
		data.WithRawSession(sess)
		data.WithVersion(&version)
		data.WithAccessToken(accessToken)
		data.WithRefreshToken(refreshToken)

		if fetchUser && uID != nil {
			u, err := s.userSrv.GetUserByID(r.Context(), uID)
			if err != nil {
				return nil, err
			}

			data.WithUser(u)
		}

		return data, nil
	}

	// 2. Fallback: Authenticate via cryptographically verified JWT Access Token
	// Supports Bearer header, query params (for WebSockets), or secure token cookies
	jwtToken := s.extractAccessToken(r)
	if jwtToken != "" {
		claims, err := common.VerifyAccessToken(jwtToken)
		if err == nil && claims != nil && claims.UserID != "" {
			parsedUID, err := uuid.Parse(claims.UserID)
			if err == nil {
				provider := s.ValidateProvider(claims.Provider)
				roleNames := make(entity.RoleNames, len(claims.Roles))
				for i, rn := range claims.Roles {
					roleNames[i] = entity.RoleName(rn)
				}

				data := entity.NewSession(&parsedUID, provider, &roleNames)
				data.WithRawSession(&sessions.Session{ID: parsedUID.String()})
				data.WithAccessToken(jwtToken)

				u, err := s.userSrv.GetUserByID(r.Context(), &parsedUID)
				if err != nil {
					return nil, err
				}
				if u.IsBanned {
					return nil, apperror.ErrUserAlreadyBanned
				}
				if !u.IsActive {
					return nil, apperror.ErrUserNotAuthenticated.WithDetail("account is not active")
				}
				data.WithUser(u)

				common.Logger.Debug("authenticated request via verified JWT token",
					slog.String("userID", parsedUID.String()),
					slog.String("component", "service.auth"),
					slog.String("method", "GetRequestSession"))

				return data, nil
			}
		}
	}

	if uIDErr != nil {
		return nil, uIDErr
	}
	return nil, apperror.ErrUserNotAuthenticated
}

// extractAccessToken safely retrieves a JWT access token from Authorization header,
// query parameters (standard for browser WebSockets), or token cookies.
func (s *AuthService) extractAccessToken(r *http.Request) string {
	if r == nil {
		return ""
	}

	// Authorization: Bearer <token>
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		token := strings.TrimSpace(authHeader[7:])
		if token != "" {
			return token
		}
	}

	// Query parameter: ?token= or ?access_token=
	for _, param := range []string{"token", "access_token"} {
		if token := strings.TrimSpace(r.URL.Query().Get(param)); token != "" {
			return token
		}
	}

	// Token cookies: access_token, auth_token, auth-token
	for _, name := range []string{"access_token", "auth_token", "auth-token"} {
		if cookie, err := r.Cookie(name); err == nil {
			if token := strings.TrimSpace(cookie.Value); token != "" {
				return token
			}
		}
	}

	return ""
}

func (s *AuthService) SafeGetRequestSession(r *http.Request, fetchUser bool) *entity.Session {
	sess, err := s.GetRequestSession(r, fetchUser)
	if err != nil {
		return entity.NewSession(nil, nil, &entity.RoleNames{})
	}

	return sess
}

func (s *AuthService) CreateSessionUser(w http.ResponseWriter, r *http.Request, u *entity.User, p *entity.AuthProvider, accessToken, refreshToken string) (*entity.Session, error) {
	sess, err := s.session.New(r, config.Configs.SessionCookieName)
	if err != nil {
		// gorilla/sessions always returns a valid blank session even on decode errors.
		// A decode error means the old cookie was signed with a different key — safe to
		// overwrite it with a new session. Do NOT return early here.
		common.Logger.Warn("old session cookie could not be decoded, creating new session",
			slog.Any("error", err),
			slog.Any("user", u),
			slog.String("component", "service.auth"),
			slog.String("method", "CreateSessionUser"))
	}

	if sess == nil {
		common.Logger.Error("failed to create session user",
			slog.String("error", "session nil"),
			slog.Any("user", u),
			slog.String("component", "service.auth"),
			slog.String("method", "CreateSessionUser"))
		return nil, apperror.ErrUserNotAuthenticated
	}

	var uID *uuid.UUID
	var roles *entity.RoleNames
	if u != nil {
		uID = &u.ID
		roles = &u.Roles
	}

	s.updateRawSession(sess, uID, p, roles, config.Configs.Version, accessToken, refreshToken)

	if err := sess.Save(r, w); err != nil {
		common.Logger.Error("failed to save cookie to request",
			slog.Any("error", err),
			slog.Any("user", u),
			slog.String("component", "service.auth"),
			slog.String("method", "CreateSessionUser"))
		return nil, err
	}

	common.Logger.Debug("created and saved request session",
		slog.Any("sessionID", sess.ID),
		slog.Any("sessionValues", sess.Values),
		slog.String("component", "service.auth"),
		slog.String("method", "CreateSessionUser"))

	data := entity.NewSession(nil, nil, nil)
	data.WithUser(u)
	data.WithRawSession(sess)
	data.WithProvider(p)
	data.WithAccessToken(accessToken)
	data.WithRefreshToken(refreshToken)

	return data, nil
}

func (s *AuthService) RemoveSessionUser(sess *entity.Session, w http.ResponseWriter, r *http.Request) error {
	if sess != nil && sess.Raw != nil {
		s.updateRawSession(sess.Raw, nil, nil, nil, config.Configs.Version, "", "")
		sess.Raw.Options.MaxAge = -1

		if err := sess.Raw.Save(r, w); err != nil {
			return err
		}
	}

	return nil
}

func (s *AuthService) UpdateSessionUser(sess *entity.Session, w http.ResponseWriter, r *http.Request, u *entity.User, p *entity.AuthProvider, version string) error {
	if sess == nil {
		return apperror.ErrUserSessionInvalid.WithDetail("sess or user is nil")
	}

	if u != nil {
		sess.WithUser(u)
		s.updateRawSession(sess.Raw, &u.ID, p, &u.Roles, version, "", "")
	} else {
		s.updateRawSession(sess.Raw, nil, nil, nil, version, "", "")
	}

	if err := sess.Raw.Save(r, w); err != nil {
		return apperror.ErrUserSessionUpdate.WithDetailError(err)
	}

	return nil
}

func (s *AuthService) VerifyVersion(sess *entity.Session, current string) bool {
	if sess == nil {
		return false
	}

	if sess.Raw == nil {
		return true
	}

	v, ok := sess.Raw.Values["version"]
	if !ok {
		return false
	}

	version, ok := v.(string)
	if !ok {
		return false
	}

	return version == current
}

func (s *AuthService) updateRawSession(sess *sessions.Session, uID *uuid.UUID, p *entity.AuthProvider, roles *entity.RoleNames, version string, accessToken, refreshToken string) {
	// Store uID as a plain UUID string to avoid gob pointer-registration issues.
	if uID != nil {
		sess.Values["uID"] = uID.String()
	} else {
		delete(sess.Values, "uID")
	}

	// Store provider as a plain string to avoid gob pointer-registration issues.
	if p != nil {
		sess.Values["provider"] = string(*p)
	} else {
		delete(sess.Values, "provider")
	}

	if version != "" {
		sess.Values["version"] = version
	}

	if roles != nil {
		sess.Values["roles"] = *roles
	} else {
		sess.Values["roles"] = entity.RoleNames{}
	}

	// Store JWT tokens
	if accessToken != "" {
		sess.Values["accessToken"] = accessToken
	} else {
		delete(sess.Values, "accessToken")
	}

	if refreshToken != "" {
		sess.Values["refreshToken"] = refreshToken
	} else {
		delete(sess.Values, "refreshToken")
	}

	common.Logger.Debug("updated raw session token metadata",
		slog.Int("accessTokenLength", len(accessToken)),
		slog.Int("refreshTokenLength", len(refreshToken)),
		slog.String("component", "service.auth"),
		slog.String("method", "updateRawSession"))
}

func (s *AuthService) GetContextSession(ctx context.Context) (*entity.Session, error) {
	sess, ok := ctx.Value(common.CtxSessionIDKey).(*entity.Session)
	if !ok {
		common.Logger.Error("failed to retrieve session from context",
			slog.String("component", "service.auth"),
			slog.String("method", "GetContextSession"))

		return nil, apperror.ErrUserSessionInvalid.WithDetail("not found")
	}

	common.Logger.Debug("retrieved session from context",
		slog.Any("sessionID", sess.UserID),
		slog.String("component", "service.auth"),
		slog.String("method", "GetContextSession"))

	return sess, nil
}

func (s *AuthService) SafeGetContextSession(ctx context.Context) *entity.Session {
	sess, err := s.GetContextSession(ctx)
	if err != nil {
		return nil
	}

	return sess
}

func (s *AuthService) ValidateProvider(provider string) *entity.AuthProvider {
	switch provider {
	case entity.AuthProviderDiscord.String():
		p := entity.AuthProviderDiscord
		return &p
	case entity.AuthProviderGoogle.String():
		p := entity.AuthProviderGoogle
		return &p
	case entity.AuthProviderEmail.String():
		p := entity.AuthProviderEmail
		return &p
	default:
		return nil
	}
}

func (s *AuthService) CreateRefreshToken(ctx context.Context, userID uuid.UUID, ip, ua string) (string, error) {
	token, err := common.GenerateRefreshToken()
	if err != nil {
		return "", err
	}

	hash := common.HashToken(token)
	rt := &entity.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
		CreatedAt: time.Now(),
		IPAddress: ip,
		UserAgent: ua,
	}

	if err := s.tokenStr.Create(ctx, rt); err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) RotateRefreshToken(ctx context.Context, oldToken string, ip, ua string) (string, string, error) {
	hash := common.HashToken(oldToken)
	rt, err := s.tokenStr.GetByHash(ctx, hash)
	if err != nil {
		return "", "", err
	}

	if rt == nil {
		return "", "", apperror.ErrUserNotAuthenticated.WithDetail("token not found")
	}

	// Detection of token reuse (potential theft)
	if rt.IsRevoked() {
		// If token is revoked, it might be a reuse attack.
		// Revoke all tokens for this user as a safety measure.
		_ = s.tokenStr.RevokeAllForUser(ctx, rt.UserID)
		return "", "", apperror.ErrUserNotAuthenticated.WithDetail("token already revoked - potential theft detected")
	}

	if rt.IsExpired() {
		return "", "", apperror.ErrUserNotAuthenticated.WithDetail("token expired")
	}

	// Generate new tokens
	newToken, err := common.GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}

	newHash := common.HashToken(newToken)
	newRT := &entity.RefreshToken{
		ID:        uuid.New(),
		UserID:    rt.UserID,
		TokenHash: newHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		CreatedAt: time.Now(),
		IPAddress: ip,
		UserAgent: ua,
	}

	// Create new token and revoke old one in a transaction would be better, but for now:
	if err := s.tokenStr.Create(ctx, newRT); err != nil {
		return "", "", err
	}

	if err := s.tokenStr.Revoke(ctx, rt.ID, &newRT.ID); err != nil {
		// Log error but we already created the new token
		common.Logger.Error("failed to revoke old refresh token during rotation",
			slog.Any("error", err),
			slog.String("tokenID", rt.ID.String()))
	}

	// Also generate a new access token
	user, err := s.userSrv.GetUserByID(ctx, &rt.UserID)
	if err != nil {
		return "", "", err
	}

	roleStrings := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roleStrings[i] = role.String()
	}

	accessToken, err := common.GenerateAccessToken(user.ID.String(), "email", roleStrings)
	if err != nil {
		return "", "", err
	}

	return accessToken, newToken, nil
}

func (s *AuthService) RevokeRefreshToken(ctx context.Context, token string) error {
	hash := common.HashToken(token)
	rt, err := s.tokenStr.GetByHash(ctx, hash)
	if err != nil {
		return err
	}

	if rt != nil {
		return s.tokenStr.Revoke(ctx, rt.ID, nil)
	}

	return nil
}

type AuthResult struct {
	User         *entity.User `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token,omitempty"`
	TokenType    string       `json:"token_type"`
	ExpiresIn    int          `json:"expires_in"`
	Roles        []string     `json:"roles"`
}

// AuthenticateWithEmail verifies credentials, checks activation, and produces access and refresh tokens.
func (s *AuthService) AuthenticateWithEmail(ctx context.Context, email, password, ip, ua string) (*AuthResult, error) {
	u, err := s.userSrv.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, apperror.ErrInternalServer
	}
	if u == nil {
		return nil, apperror.ErrUserNotAuthenticated
	}

	if !u.Is_activated {
		return nil, apperror.ErrUserNotAuthenticated.WithDetail("account not activated")
	}

	if u.Password == nil || *u.Password == "" {
		return nil, apperror.ErrUserNotAuthenticated.WithDetail("account linked to social login")
	}

	if !common.VerifyPassword(*u.Password, password) {
		return nil, apperror.ErrUserNotAuthenticated.WithDetail("incorrect password")
	}

	roles := make([]string, len(u.Roles))
	for i, role := range u.Roles {
		roles[i] = role.String()
	}

	accessToken, err := common.GenerateAccessToken(u.ID.String(), "email", roles)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.CreateRefreshToken(ctx, u.ID, ip, ua)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:         u,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    15 * 60,
		Roles:        roles,
	}, nil
}

// RegisterWithEmail checks availability, creates user, stores password, and generates credentials.
func (s *AuthService) RegisterWithEmail(ctx context.Context, req *entity.EmailAuthRequest, ip, ua string) (*AuthResult, error) {
	fullName := req.UserName
	if req.FirstName != nil {
		fullName = strings.TrimSpace(*req.FirstName)
	}
	if req.LastName != nil {
		if fullName != "" {
			fullName += " "
		}
		fullName += strings.TrimSpace(*req.LastName)
	}
	if fullName == "" {
		fullName = strings.Split(req.Email, "@")[0]
	}

	u, err := s.userSrv.Create(ctx, req.Email, req.Password, fullName, "", req.UserType)
	if err != nil {
		if errors.Is(err, apperror.ErrUserAlreadyExists) || errors.Is(err, apperror.ErrUserEmailAlreadyExists) {
			return nil, apperror.ErrUserEmailAlreadyExists
		}
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, apperror.ErrUserEmailAlreadyExists
		}
		return nil, err
	}

	// Only immediately activate in development mode to allow local testing without SMTP.
	// In production, users must verify their email via /auth/activate before receiving access credentials.
	isDev := config.Configs != nil && config.Configs.Env != nil && config.Configs.Env.IsDev()
	if isDev {
		if _, err := s.userSrv.UpdateUserStatus(ctx, u.ID, true); err != nil {
			return nil, err
		}
		u.IsEmailVerified = true
		u.Is_activated = true
	} else {
		// In production, do not activate or generate session tokens.
		// Return the unactivated user so the handler can send activation email.
		return &AuthResult{
			User:      u,
			TokenType: "Bearer",
			Roles:     []string{req.UserType},
		}, nil
	}

	roles := make([]string, len(u.Roles))
	for i, role := range u.Roles {
		roles[i] = role.String()
	}

	accessToken, err := common.GenerateAccessToken(u.ID.String(), "email", roles)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.CreateRefreshToken(ctx, u.ID, ip, ua)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User:         u,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    15 * 60,
		Roles:        roles,
	}, nil
}
