package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/google/uuid"
)

type AdminService struct {
	store *store.AdminStore
}

func newAdminService(s *store.AdminStore) *AdminService {
	return &AdminService{store: s}
}

// CheckByEmail checks if admin exists by email
func (as *AdminService) CheckByEmail(ctx context.Context, email string) (bool, error) {
	if email == "" {
		return false, apperror.ErrInvalidInput
	}

	exists, err := as.store.CheckByEmail(ctx, email)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// FindByEmail finds an admin by email
func (as *AdminService) FindByEmail(ctx context.Context, email string) (*entity.Admin, error) {
	if email == "" {
		return nil, apperror.ErrInvalidInput
	}

	admin, err := as.store.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	return admin, nil
}

// FindByID finds an admin by ID
func (as *AdminService) FindByID(ctx context.Context, id string) (*entity.Admin, error) {
	if id == "" {
		return nil, apperror.ErrInvalidInput
	}

	adminID, err := uuid.Parse(id)
	if err != nil {
		return nil, apperror.ErrInvalidInput
	}

	admin, err := as.store.FindByID(ctx, adminID)
	if err != nil {
		return nil, err
	}

	return admin, nil
}

// Create creates a new admin
func (as *AdminService) Create(ctx context.Context, email, password, fullName, phone string) (*entity.Admin, error) {
	// Check if admin already exists
	exists, err := as.CheckByEmail(ctx, email)
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

	admin := &entity.Admin{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hashedPassword,
		FullName:     fullName,
		Phone:        &phone,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	success, err := as.store.Create(ctx, admin)
	if err != nil || !success {
		return nil, err
	}

	common.Logger.Info("admin created",
		slog.String("email", email),
		slog.String("component", "service.admin"),
		slog.String("method", "Create"))

	return admin, nil
}

// ListAll lists all admins
func (as *AdminService) ListAll(ctx context.Context, limit, offset int) ([]*entity.Admin, error) {
	admins, err := as.store.ListAll(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	return admins, nil
}

// Update updates an admin
func (as *AdminService) Update(ctx context.Context, admin *entity.Admin) error {
	err := as.store.Update(ctx, admin)
	if err != nil {
		return err
	}

	common.Logger.Info("admin updated",
		slog.String("admin_id", admin.ID.String()),
		slog.String("component", "service.admin"),
		slog.String("method", "Update"))

	return nil
}

// Delete deletes an admin
func (as *AdminService) Delete(ctx context.Context, id string) error {
	if id == "" {
		return apperror.ErrInvalidInput
	}

	adminID, err := uuid.Parse(id)
	if err != nil {
		return apperror.ErrInvalidInput
	}

	err = as.store.Delete(ctx, adminID)
	if err != nil {
		return err
	}

	common.Logger.Info("admin deleted",
		slog.String("admin_id", id),
		slog.String("component", "service.admin"),
		slog.String("method", "Delete"))

	return nil
}
