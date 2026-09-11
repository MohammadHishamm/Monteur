package service

import (
	"context"

	"github.com/google/uuid"
)

type UserBalanceService struct{}

func newUserBalanceService() *UserBalanceService {
	return &UserBalanceService{}
}

// CreateInitialBalance is a compatibility no-op until the balance module is implemented.
func (s *UserBalanceService) CreateInitialBalance(ctx context.Context, userID uuid.UUID) (bool, error) {
	_ = ctx
	_ = userID
	return false, nil
}
