package service

import (
	"context"
	"log/slog"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

type AdminDashboardService struct {
	store *store.AdminDashboardStore
	s     *store.Store // full store for notifications
}

func newAdminDashboardService(s *store.Store) *AdminDashboardService {
	return &AdminDashboardService{store: s.AdminDashboard, s: s}
}

func (svc *AdminDashboardService) GetAnalytics(ctx context.Context) (*store.AdminAnalyticsRow, error) {
	return svc.store.GetAnalytics(ctx)
}

func (svc *AdminDashboardService) ListUsers(ctx context.Context, role string, limit, offset int) ([]*store.AdminUserRow, int, error) {
	if limit <= 0 {
		limit = 50
	}
	return svc.store.ListUsers(ctx, role, limit, offset)
}

func (svc *AdminDashboardService) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	err := svc.store.DeleteUser(ctx, userID)
	if err != nil {
		return err
	}
	common.Logger.Warn("admin deleted user",
		slog.String("user_id", userID.String()),
		slog.String("component", "service.admin_dashboard"))
	return nil
}

func (svc *AdminDashboardService) AddBalance(ctx context.Context, userID uuid.UUID, amount float64) error {
	if amount <= 0 {
		return common.ErrBadRequest
	}
	err := svc.store.AddBalance(ctx, userID, amount)
	if err != nil {
		return err
	}
	_, _ = svc.s.CreateNotifications(ctx, []entity.CreateNotificationParams{{
		UserID:   userID.String(),
		Type:     "balance_added",
		Title:    "تم إضافة رصيد لحسابك",
		Message:  "قام فريق الدعم بإضافة رصيد لمحفظتك.",
		Priority: "normal",
	}})
	common.Logger.Info("admin added balance",
		slog.String("user_id", userID.String()),
		slog.Float64("amount", amount),
		slog.String("component", "service.admin_dashboard"))
	return nil
}

func (svc *AdminDashboardService) DeductBalance(ctx context.Context, userID uuid.UUID, amount float64) error {
	if amount <= 0 {
		return common.ErrBadRequest
	}
	err := svc.store.DeductBalance(ctx, userID, amount)
	if err != nil {
		return err
	}
	_, _ = svc.s.CreateNotifications(ctx, []entity.CreateNotificationParams{{
		UserID:   userID.String(),
		Type:     "balance_deducted",
		Title:    "تم خصم رصيد من حسابك",
		Message:  "قام فريق الدعم بخصم رصيد من محفظتك.",
		Priority: "normal",
	}})
	common.Logger.Info("admin deducted balance",
		slog.String("user_id", userID.String()),
		slog.Float64("amount", amount),
		slog.String("component", "service.admin_dashboard"))
	return nil
}

// SendWarning increments warning_count and notifies the user with the given message.
func (svc *AdminDashboardService) SendWarning(ctx context.Context, userID uuid.UUID, message string) (int, error) {
	if message == "" {
		message = "تحذير من إدارة المنصة — يرجى الالتزام بشروط الاستخدام."
	}
	count, err := svc.store.IncrementWarning(ctx, userID)
	if err != nil {
		return 0, err
	}
	_, _ = svc.s.CreateNotifications(ctx, []entity.CreateNotificationParams{{
		UserID:   userID.String(),
		Type:     "admin_warning",
		Title:    "تحذير من الإدارة",
		Message:  message,
		Priority: "high",
	}})
	common.Logger.Warn("admin sent warning",
		slog.String("user_id", userID.String()),
		slog.Int("warning_count", count),
		slog.String("component", "service.admin_dashboard"))
	return count, nil
}

func (svc *AdminDashboardService) ListSupportConversations(ctx context.Context, limit, offset int) ([]*store.SupportConversationRow, int, error) {
	if limit <= 0 {
		limit = 30
	}
	return svc.store.ListSupportConversations(ctx, limit, offset)
}

func (svc *AdminDashboardService) GetSupportMessages(ctx context.Context, conversationID uuid.UUID, limit int) ([]*store.SupportMessageRow, error) {
	if limit <= 0 {
		limit = 100
	}
	return svc.store.GetSupportMessages(ctx, conversationID, limit)
}

func (svc *AdminDashboardService) ReplyToSupport(ctx context.Context, conversationID, adminID uuid.UUID, body string) (*store.SupportMessageRow, error) {
	if body == "" {
		return nil, common.ErrBadRequest
	}
	return svc.store.CreateAdminSupportMessage(ctx, conversationID, adminID, body)
}
