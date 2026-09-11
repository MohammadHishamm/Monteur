package service

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type VerificationService struct {
	store *store.Store
}

func newVerificationService(store *store.Store) *VerificationService {
	return &VerificationService{store: store}
}

func (s *VerificationService) SubmitVerification(ctx context.Context, userID uuid.UUID, idFrontURL, idBackURL, selfieURL string) (*entity.UserVerification, error) {
	// Check if a pending verification already exists
	existing, err := s.store.Verification.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil && existing.Status == "pending" {
		return nil, apperror.ErrBadRequest.WithDetail("A verification request is already pending")
	}

	verification := &entity.UserVerification{
		ID:         uuid.New(),
		UserID:     userID,
		IDFrontURL: idFrontURL,
		IDBackURL:  idBackURL,
		SelfieURL:  selfieURL,
		Status:     "pending",
	}

	if err := s.store.Verification.Create(ctx, verification); err != nil {
		return nil, err
	}

	return verification, nil
}

func (s *VerificationService) ListVerifications(ctx context.Context, status string, limit, offset int) ([]*entity.UserVerification, int, error) {
	return s.store.Verification.ListByStatus(ctx, status, limit, offset)
}

func (s *VerificationService) ReviewVerification(ctx context.Context, verificationID uuid.UUID, status string, rejectionReason *string) error {
	if status != "approved" && status != "rejected" {
		return apperror.ErrBadRequest.WithDetail("Status must be 'approved' or 'rejected'")
	}
	if status == "rejected" && (rejectionReason == nil || *rejectionReason == "") {
		return apperror.ErrBadRequest.WithDetail("Rejection reason is required when rejecting")
	}

	existing, err := s.store.Verification.GetByID(ctx, verificationID)
	if err != nil {
		return err
	}
	if existing == nil {
		return apperror.ErrNotFound.WithDetail("Verification request not found")
	}

	if existing.Status != "pending" {
		return apperror.ErrBadRequest.WithDetail("Verification request is not pending")
	}

	return s.store.Verification.UpdateStatus(ctx, verificationID, status, rejectionReason)
}
