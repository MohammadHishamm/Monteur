package service

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
)

func (s *Service) CreateNotifications(ctx context.Context, params []entity.CreateNotificationParams) ([]entity.Notification, error) {
	return s.store.CreateNotifications(ctx, params)
}

func (s *Service) ListNotifications(ctx context.Context, userID string, limit, offset int) ([]entity.Notification, error) {
	return s.store.ListNotifications(ctx, userID, limit, offset)
}

func (s *Service) MarkNotificationRead(ctx context.Context, id int64, userID string) (*entity.Notification, error) {
	return s.store.MarkNotificationRead(ctx, id, userID)
}
