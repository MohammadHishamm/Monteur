package entity

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"encoding/gob"

	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
)

func init() {
	gob.Register(RoleNames{})
	gob.Register(RoleName(""))
	gob.Register(AuthProvider(""))
}

type RoleName string

const (
	RoleNameUser       RoleName = "client"
	RoleNameAdmin      RoleName = "Admin"
	RoleNameModerator  RoleName = "Moderator"
	RoleNameFreelance  RoleName = "Freelance"
	RoleNameSuperAdmin RoleName = "SuperAdmin"
	RoleNameAccountant RoleName = "Accountant"
)

func (r RoleName) String() string {
	return string(r)
}

type RoleNames []RoleName

func (rs RoleNames) has(target RoleName) bool {
	for _, r := range rs {
		if strings.EqualFold(string(r), string(target)) {
			return true
		}
	}

	return false
}

func (rs RoleNames) IsAdmin() bool      { return rs.has(RoleNameAdmin) }
func (rs RoleNames) IsModerator() bool  { return rs.has(RoleNameModerator) }
func (rs RoleNames) IsFreelance() bool  { return rs.has(RoleNameFreelance) }
func (rs RoleNames) IsSuperAdmin() bool { return rs.has(RoleNameSuperAdmin) }
func (rs RoleNames) IsAccountant() bool { return rs.has(RoleNameAccountant) }

type AuthProvider string

const (
	AuthProviderDiscord AuthProvider = "discord"
	AuthProviderGoogle  AuthProvider = "google"
	AuthProviderGitHub  AuthProvider = "github"
	AuthProviderEmail   AuthProvider = "email"
)

func (p AuthProvider) String() string {
	return string(p)
}

// Admin represents a platform administrator
type Admin struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	Email        string     `db:"email" json:"email"`
	PasswordHash string     `db:"password_hash" json:"-"`
	FullName     string     `db:"full_name" json:"full_name"`
	Phone        *string    `db:"phone" json:"phone,omitempty"`
	IsActive     bool       `db:"is_active" json:"is_active"`
	LastLoginAt  *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`
}

// User represents a freelancer or client user
type User struct {
	// Core fields
	ID           uuid.UUID `db:"id" json:"id"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Password     *string   `db:"-" json:"-"`
	FullName     string    `db:"full_name" json:"full_name"`
	UserName     string    `db:"-" json:"user_name,omitempty"`
	FirstName    *string   `db:"-" json:"first_name,omitempty"`
	LastName     *string   `db:"-" json:"last_name,omitempty"`
	Phone        *string   `db:"phone" json:"phone,omitempty"`

	// Type and status
	UserType string `db:"user_type" json:"user_type"` // "freelancer" or "client"
	Status   string `db:"status" json:"status"`       // "online" or "offline"

	// Profile
	AvatarURL    *string           `db:"avatar_url" json:"avatar_url,omitempty"`
	Bio          *string           `db:"bio" json:"bio,omitempty"`
	SocialLinks  map[string]string `db:"-" json:"social_links,omitempty"`
	Rating       float64           `db:"rating" json:"rating"`
	TotalReviews int               `db:"total_reviews" json:"total_reviews"`

	// Freelancer fields
	HourlyRate        *float64 `db:"hourly_rate" json:"hourly_rate,omitempty"`
	Skills            []string `db:"skills" json:"skills,omitempty"`
	PortfolioURL      *string  `db:"portfolio_url" json:"portfolio_url,omitempty"`
	YearsOfExperience *int     `db:"years_of_experience" json:"years_of_experience,omitempty"`

	// Freelancer profile display fields (added in migration 13)
	Tier              string          `db:"tier" json:"tier,omitempty"`
	Color             string          `db:"-" json:"color,omitempty"` // computed, not stored
	Tagline           string          `db:"tagline" json:"tagline,omitempty"`
	City              string          `db:"city" json:"city,omitempty"`
	Country           string          `db:"country" json:"country,omitempty"`
	OnTimeRate        int             `db:"on_time_rate" json:"on_time_rate,omitempty"`
	ResponseTime      string          `db:"response_time" json:"response_time,omitempty"`
	CompletedJobs     int             `db:"completed_jobs" json:"completed_jobs,omitempty"`
	ProfileCompletion int             `db:"profile_completion" json:"profile_completion,omitempty"`
	Languages         json.RawMessage `db:"languages" json:"languages,omitempty"`

	// Client fields
	CompanyName    *string `db:"company_name" json:"company_name,omitempty"`
	CompanyWebsite *string `db:"company_website" json:"company_website,omitempty"`
	Industry       *string `db:"industry" json:"industry,omitempty"`

	// Account status
	IsEmailVerified    bool       `db:"is_email_verified" json:"is_email_verified"`
	Is_activated       bool       `db:"-" json:"is_activated"`
	IsActive           bool       `db:"is_active" json:"is_active"`
	IsBanned           bool       `db:"is_banned" json:"is_banned"`
	BanReason          *string    `db:"ban_reason" json:"ban_reason,omitempty"`
	VerificationStatus string     `db:"verification_status" json:"verification_status"`
	OnboardingCompleted bool      `db:"onboarding_completed" json:"onboarding_completed"`
	LastIPAddress      *string    `db:"last_ip_address" json:"last_ip_address,omitempty"`
	BannedIPAddress    *string    `db:"banned_ip_address" json:"banned_ip_address,omitempty"`
	IPBannedAt         *time.Time `db:"ip_banned_at" json:"ip_banned_at,omitempty"`
	LastActivityAt     *time.Time `db:"last_activity_at" json:"last_activity_at,omitempty"`
	LastLoginAt        *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`

	// Timestamps
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`

	Roles RoleNames `db:"-" json:"roles"`
}

// UserVerification represents a user's submitted verification documents
type UserVerification struct {
	ID              uuid.UUID `db:"id" json:"id"`
	UserID          uuid.UUID `db:"user_id" json:"user_id"`
	IDFrontURL      string    `db:"id_front_url" json:"id_front_url"`
	IDBackURL       string    `db:"id_back_url" json:"id_back_url"`
	SelfieURL       string    `db:"selfie_url" json:"selfie_url"`
	Status          string    `db:"status" json:"status"` // pending, verified, rejected
	RejectionReason *string   `db:"rejection_reason" json:"rejection_reason,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`

	// Joined/derived fields for the admin verification list (not stored on the row).
	UserName    string    `db:"-" json:"user_name,omitempty"`
	UserEmail   string    `db:"-" json:"user_email,omitempty"`
	SubmittedAt time.Time `db:"-" json:"submitted_at"`
}

type UserCreateRequest struct {
	UserName  string  `json:"user_name"`
	Email     string  `json:"email" validate:"required,email"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	AvatarURL *string `json:"avatar_url"`
	UserType  string  `json:"user_type"` // "freelancer" or "client"
}

type EmailAuthRequest struct {
	Email     string  `json:"email" validate:"required,email"`
	Password  string  `json:"password" validate:"required,min=8"`
	UserName  string  `json:"user_name"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	AvatarURL *string `json:"avatar_url"`
	UserType  string  `json:"user_type" validate:"required,oneof=freelancer client"` // "freelancer" or "client"
}

func (r *EmailAuthRequest) Normalize() error {
	if r == nil {
		return apperror.ErrBadRequest.WithDetail("empty request")
	}

	r.Email = strings.ToLower(strings.TrimSpace(r.Email))
	r.UserName = strings.TrimSpace(r.UserName)
	r.Password = strings.TrimSpace(r.Password)
	r.UserType = strings.ToLower(strings.TrimSpace(r.UserType))

	if r.Email == "" || r.Password == "" {
		return apperror.ErrBadRequest.WithDetail("email and password are required")
	}

	if r.UserType != "freelancer" && r.UserType != "client" {
		return apperror.ErrBadRequest.WithDetail("user_type must be \"freelancer\" or \"client\"")
	}

	return nil
}

type UserUpdateRequest struct {
	Email       string            `json:"email"`
	UserName    string            `json:"user_name"`
	FirstName   *string           `json:"first_name"`
	LastName    *string           `json:"last_name"`
	AvatarURL   *string           `json:"avatar_url"`
	Bio         *string           `json:"bio"`
	SocialLinks map[string]string `json:"social_links"`
}

type UpdateUserRolesRequest struct {
	Roles RoleNames `json:"roles" validate:"required,min=1,dive,required"`
}

type UserSearchQuery struct {
	Page      int
	Limit     int
	Search    string
	Direction string
	Order     string
	Roles     []string
}

func NewUserSearchQueryDefault() *UserSearchQuery {
	return &UserSearchQuery{
		Page:      1,
		Limit:     10,
		Direction: "desc",
		Order:     "created_at",
	}
}

func (q *UserSearchQuery) Parse(r *http.Request) error {
	if q == nil {
		return apperror.ErrBadRequest
	}

	query := r.URL.Query()
	if page := query.Get("page"); page != "" {
		v, err := strconv.Atoi(page)
		if err != nil || v < 1 {
			return apperror.ErrSearchQueryInvalid.WithDetail("invalid page")
		}
		q.Page = v
	}

	if limit := query.Get("limit"); limit != "" {
		v, err := strconv.Atoi(limit)
		if err != nil || v < 1 || v > 100 {
			return apperror.ErrSearchQueryInvalid.WithDetail("invalid limit")
		}
		q.Limit = v
	}

	q.Search = strings.TrimSpace(query.Get("search"))
	if d := strings.ToLower(strings.TrimSpace(query.Get("direction"))); d != "" {
		q.Direction = d
	}
	if o := strings.TrimSpace(query.Get("order")); o != "" {
		q.Order = o
	}
	q.Roles = query["roles"]

	return nil
}

func (q *UserSearchQuery) GetOffset() int {
	if q == nil || q.Page <= 1 {
		return 0
	}

	return (q.Page - 1) * q.Limit
}

type ResourceCountWithGrowth struct {
	Count     int64   `json:"count"`
	PrevCount int64   `json:"prev_count"`
	Growth    float64 `json:"growth"`
}

type Session struct {
	UserID       *uuid.UUID        `json:"user_id,omitempty"`
	Provider     *AuthProvider     `json:"provider,omitempty"`
	Roles        RoleNames         `json:"roles"`
	Raw          *sessions.Session `json:"-"`
	User         *User             `json:"user,omitempty"`
	Version      *string           `json:"version,omitempty"`
	AccessToken  string            `json:"access_token,omitempty"`
	RefreshToken string            `json:"refresh_token,omitempty"`
}

func NewSession(uID *uuid.UUID, p *AuthProvider, roles *RoleNames) *Session {
	data := &Session{UserID: uID, Provider: p}
	if roles != nil {
		data.Roles = *roles
	} else {
		data.Roles = RoleNames{}
	}

	if data.Provider == nil {
		provider := AuthProviderEmail
		data.Provider = &provider
	}

	return data
}

func (s *Session) WithRawSession(raw *sessions.Session) *Session {
	s.Raw = raw
	return s
}

func (s *Session) WithVersion(version *string) *Session {
	s.Version = version
	return s
}

func (s *Session) WithAccessToken(token string) *Session {
	s.AccessToken = token
	return s
}

func (s *Session) WithRefreshToken(token string) *Session {
	s.RefreshToken = token
	return s
}

func (s *Session) WithUser(u *User) *Session {
	s.User = u
	if u != nil {
		s.UserID = &u.ID
		s.Roles = u.Roles
	}
	return s
}

func (s *Session) WithProvider(p *AuthProvider) *Session {
	s.Provider = p
	return s
}

func (s *Session) WithRoles(roles *RoleNames) *Session {
	if roles == nil {
		s.Roles = RoleNames{}
		return s
	}

	s.Roles = *roles
	return s
}

func (s *Session) IsUser(uID *uuid.UUID) bool {
	if s == nil || s.UserID == nil || uID == nil {
		return false
	}

	return *s.UserID == *uID
}

func (s *Session) IsAuth() bool {
	return s != nil && s.UserID != nil
}

// EmailSigninRequest is the lean signin payload — no user_type required.
type EmailSigninRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

func (r *EmailSigninRequest) Normalize() error {
	if r == nil {
		return apperror.ErrBadRequest.WithDetail("empty request")
	}
	r.Email = strings.ToLower(strings.TrimSpace(r.Email))
	r.Password = strings.TrimSpace(r.Password)
	if r.Email == "" || r.Password == "" {
		return apperror.ErrBadRequest.WithDetail("email and password are required")
	}
	return nil
}

type CreateUserRequest struct {
	Email          string   `json:"email" validate:"required,email"`
	Password       string   `json:"password" validate:"required,min=8"`
	FullName       string   `json:"full_name" validate:"required,min=2"`
	Phone          string   `json:"phone" validate:"omitempty,e164"`
	UserType       string   `json:"user_type" validate:"required,oneof=freelancer client"`
	HourlyRate     *float64 `json:"hourly_rate" validate:"omitempty,min=0"`
	Skills         []string `json:"skills" validate:"omitempty"`
	PortfolioURL   *string  `json:"portfolio_url" validate:"omitempty,url"`
	CompanyName    *string  `json:"company_name" validate:"omitempty,min=2"`
	CompanyWebsite *string  `json:"company_website" validate:"omitempty,url"`
	Industry       *string  `json:"industry" validate:"omitempty,min=2"`
}
