package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type UserService struct {
	store *store.UserStore
}

func newUserService(s *store.UserStore) *UserService {
	return &UserService{store: s}
}

// CheckByEmail checks if user exists by email
func (us *UserService) CheckByEmail(ctx context.Context, email string) (bool, error) {
	if email == "" {
		return false, common.ErrFileInvalidType
	}

	exists, err := us.store.CheckByEmail(ctx, email)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// FindByEmail finds a user by email
func (us *UserService) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	if email == "" {
		return nil, common.ErrFileInvalidType
	}

	user, err := us.store.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// FindByID finds a user by ID
func (us *UserService) FindByID(ctx context.Context, id string) (*entity.User, error) {
	if id == "" {
		return nil, common.ErrFileInvalidType
	}

	userID, err := uuid.Parse(id)
	if err != nil {
		return nil, common.ErrFileInvalidType
	}

	user, err := us.store.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (us *UserService) IsIPBanned(ctx context.Context, ipAddress string) (bool, error) {
	ipAddress = strings.TrimSpace(ipAddress)
	if ipAddress == "" {
		return false, nil
	}

	return us.store.IsIPBanned(ctx, ipAddress)
}

// Create creates a new user
func (us *UserService) Create(ctx context.Context, email, password, fullName, phone, userType string) (*entity.User, error) {
	// Check if user already exists
	exists, err := us.CheckByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, apperror.ErrUserAlreadyExists
	}

	// Hash password
	hashedPassword, err := common.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &entity.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hashedPassword,
		FullName:     fullName,
		Phone:        &phone,
		UserType:     userType,
		Status:       "offline",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	success, err := us.store.Create(ctx, user)
	if err != nil || !success {
		return nil, err
	}

	common.Logger.Info("user created",
		slog.String("email", email),
		slog.String("user_type", userType),
		slog.String("component", "service.user"),
		slog.String("method", "Create"))

	return user, nil
}

// ListFreelancers lists all active freelancers
func (us *UserService) ListFreelancers(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	users, err := us.store.ListByType(ctx, "freelancer", limit, offset)
	if err != nil {
		return nil, err
	}
	return users, nil
}

// ListOnlineFreelancers lists online freelancers
func (us *UserService) ListOnlineFreelancers(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	users, err := us.store.ListOnline(ctx, "freelancer", limit, offset)
	if err != nil {
		return nil, err
	}
	return users, nil
}

// ListClients lists all active clients
func (us *UserService) ListClients(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	users, err := us.store.ListByType(ctx, "client", limit, offset)
	if err != nil {
		return nil, err
	}
	return users, nil
}

// UpdateStatus updates user online/offline status
func (us *UserService) UpdateStatus(ctx context.Context, userID, status string) error {
	if userID == "" {
		return apperror.ErrInvalidInput
	}

	id, err := uuid.Parse(userID)
	if err != nil {
		return apperror.ErrInvalidInput
	}

	err = us.store.UpdateStatus(ctx, id, status)
	if err != nil {
		return err
	}

	common.Logger.Info("user status updated",
		slog.String("user_id", userID),
		slog.String("status", status),
		slog.String("component", "service.user"),
		slog.String("method", "UpdateStatus"))

	return nil
}

// UpdateLastActivity updates last activity timestamp
func (us *UserService) UpdateLastActivity(ctx context.Context, userID string) error {
	if userID == "" {
		return apperror.ErrInvalidInput
	}

	id, err := uuid.Parse(userID)
	if err != nil {
		return apperror.ErrInvalidInput
	}

	return us.store.UpdateLastActivity(ctx, id)
}

func (us *UserService) GetUserByID(ctx context.Context, id *uuid.UUID) (*entity.User, error) {
	if id == nil {
		return nil, apperror.ErrInvalidInput
	}

	u, err := us.store.FindByID(ctx, *id)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, apperror.ErrUserNotFound
	}

	us.store.SeedDisplayFields(u)
	return u, nil
}

func (us *UserService) GetUserByEmail(ctx context.Context, email string) (*entity.User, error) {
	u, err := us.FindByEmail(ctx, email)
	if err != nil || u == nil {
		return u, err
	}

	us.store.SeedDisplayFields(u)
	return u, nil
}

func (us *UserService) CreateOrUpdateUser(ctx context.Context, req *entity.UserCreateRequest) (*entity.User, error) {
	if req == nil {
		return nil, apperror.ErrBadRequest
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, apperror.ErrInvalidInput.WithDetail("email required")
	}

	existing, err := us.store.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		if req.UserName != "" {
			existing.UserName = req.UserName
		}
		if req.FirstName != nil {
			existing.FirstName = req.FirstName
		}
		if req.LastName != nil {
			existing.LastName = req.LastName
		}
		if req.AvatarURL != nil {
			existing.AvatarURL = req.AvatarURL
		}
		us.store.SeedDisplayFields(existing)
		return existing, nil
	}

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
		fullName = strings.Split(email, "@")[0]
	}

	userType := req.UserType
	if userType != "freelancer" && userType != "client" {
		userType = "freelancer"
	}

	u := &entity.User{
		ID:              uuid.New(),
		Email:           email,
		FullName:        fullName,
		UserType:        userType,
		Status:          "offline",
		AvatarURL:       req.AvatarURL,
		IsEmailVerified: false,
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		UserName:        req.UserName,
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		Roles:           entity.RoleNames{entity.RoleNameUser},
	}

	ok, err := us.store.Create(ctx, u)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, apperror.ErrInternalServer
	}

	us.store.SeedDisplayFields(u)
	return u, nil
}

func (us *UserService) IsUserActivated(ctx context.Context, id uuid.UUID) (bool, error) {
	u, err := us.store.FindByID(ctx, id)
	if err != nil {
		return false, err
	}
	if u == nil {
		return false, apperror.ErrUserNotFound
	}

	return u.IsEmailVerified || u.Is_activated, nil
}

func (us *UserService) UpdateUserStatus(ctx context.Context, id uuid.UUID, activated bool) (bool, error) {
	return us.store.UpdateActivation(ctx, id, activated)
}

func (us *UserService) UpdateUserPassword(ctx context.Context, id uuid.UUID, hashedPassword string) (bool, error) {
	return us.store.UpdatePassword(ctx, id, hashedPassword)
}

func (us *UserService) UpdateUser(ctx context.Context, u *entity.User, data *entity.UserUpdateRequest) (*entity.User, error) {
	if u == nil {
		return nil, apperror.ErrInvalidInput
	}

	if data != nil {
		if data.Email != "" {
			u.Email = strings.ToLower(strings.TrimSpace(data.Email))
		}
		if data.UserName != "" {
			u.UserName = strings.TrimSpace(data.UserName)
		}
		if data.FirstName != nil {
			u.FirstName = data.FirstName
		}
		if data.LastName != nil {
			u.LastName = data.LastName
		}
		if data.AvatarURL != nil {
			u.AvatarURL = data.AvatarURL
		}
		u.Bio = data.Bio
		u.SocialLinks = data.SocialLinks
	}

	u.UpdatedAt = time.Now()
	us.store.SeedDisplayFields(u)
	return u, nil
}

func (us *UserService) UpdateUserByID(ctx context.Context, id *uuid.UUID, data *entity.UserUpdateRequest) (*entity.User, error) {
	u, err := us.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return us.UpdateUser(ctx, u, data)
}

func (us *UserService) GetUsers(ctx context.Context, q *entity.UserSearchQuery) ([]*entity.User, error) {
	limit := 100
	offset := 0
	if q != nil {
		if q.Limit > 0 {
			limit = q.Limit
		}
		offset = q.GetOffset()
	}

	list, err := us.store.ListAll(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	for _, u := range list {
		us.store.SeedDisplayFields(u)
	}

	return list, nil
}

func (us *UserService) DeleteUserByID(ctx context.Context, id *uuid.UUID) (bool, error) {
	if id == nil {
		return false, apperror.ErrInvalidInput
	}

	return us.store.DeleteByID(ctx, *id)
}

func (us *UserService) UpdateUserRolesByID(ctx context.Context, id *uuid.UUID, data *entity.UpdateUserRolesRequest) (*entity.User, error) {
	u, err := us.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if data != nil && len(data.Roles) > 0 {
		u.Roles = data.Roles
	}

	return u, nil
}

func (us *UserService) ExportUsers(ctx context.Context) ([]*entity.User, int, error) {
	users, err := us.store.ListAll(ctx, 10000, 0)
	if err != nil {
		return nil, 0, err
	}
	for _, u := range users {
		us.store.SeedDisplayFields(u)
	}

	return users, len(users), nil
}

func (us *UserService) CountActiveUsersWithGrowth(ctx context.Context) (*entity.ResourceCountWithGrowth, error) {
	count, err := us.store.CountActiveUsers(ctx)
	if err != nil {
		return nil, err
	}

	return &entity.ResourceCountWithGrowth{Count: count, PrevCount: count, Growth: 0}, nil
}
