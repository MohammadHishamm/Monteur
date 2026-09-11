package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/google/uuid"
)

// maxWarnings mirrors apperror.MaxWarnings for internal use.
const maxWarnings = 3

type ModerationService struct {
	store *store.Store
}

func newModerationService(s *store.Store) *ModerationService {
	return &ModerationService{store: s}
}

// IssueWarning increments the warning count of the flagged message sender.
// When the count reaches maxWarnings the user is automatically banned.
// Returns the updated warning count and whether the ban was triggered.
func (mod *ModerationService) IssueWarning(ctx context.Context, flaggedID uuid.UUID, reviewedBy uuid.UUID) (warningCount int, banned bool, err error) {
	flag, err := mod.store.Message.GetFlaggedMessageByID(ctx, flaggedID)
	if err != nil {
		return 0, false, err
	}
	if flag == nil {
		return 0, false, apperror.ErrFlaggedMessageNotFound
	}
	if flag.Status != "pending" {
		return 0, false, apperror.ErrFlaggedMessageReviewed
	}

	warningCount, err = mod.store.User.IncrementWarning(ctx, flag.SenderUserID)
	if err != nil {
		return 0, false, err
	}

	if err = mod.store.Message.UpdateFlaggedMessageStatus(ctx, flaggedID, "warned", reviewedBy); err != nil {
		return warningCount, false, err
	}

	if warningCount >= maxWarnings {
		reason := fmt.Sprintf("Automatically banned after %d chat policy violations", maxWarnings)
		if err = mod.store.User.BanUser(ctx, flag.SenderUserID, reason); err != nil {
			return warningCount, false, err
		}

		_, _ = mod.store.CreateNotifications(ctx, []entity.CreateNotificationParams{{
			UserID:   flag.SenderUserID.String(),
			Type:     "account_banned",
			Title:    "Account Banned",
			Message:  "Your account has been banned due to repeated chat policy violations.",
			Priority: "urgent",
		}})

		common.Logger.Warn("user auto-banned after reaching max warnings",
			slog.String("user_id", flag.SenderUserID.String()),
			slog.Int("warning_count", warningCount),
			slog.String("component", "service.moderation"),
			slog.String("method", "IssueWarning"))

		return warningCount, true, nil
	}

	_, _ = mod.store.CreateNotifications(ctx, []entity.CreateNotificationParams{{
		UserID:   flag.SenderUserID.String(),
		Type:     "moderation_warning",
		Title:    fmt.Sprintf("Warning %d/%d — Chat Policy Violation", warningCount, maxWarnings),
		Message:  fmt.Sprintf("Your message was flagged for sharing external contact information. %d more violation(s) will result in a ban.", maxWarnings-warningCount),
		Priority: "urgent",
	}})

	common.Logger.Info("warning issued to user",
		slog.String("user_id", flag.SenderUserID.String()),
		slog.Int("warning_count", warningCount),
		slog.String("flagged_message_id", flaggedID.String()),
		slog.String("component", "service.moderation"),
		slog.String("method", "IssueWarning"))

	return warningCount, false, nil
}

// DismissFlag marks a flagged message as dismissed without issuing a warning.
func (mod *ModerationService) DismissFlag(ctx context.Context, flaggedID uuid.UUID, reviewedBy uuid.UUID) error {
	flag, err := mod.store.Message.GetFlaggedMessageByID(ctx, flaggedID)
	if err != nil {
		return err
	}
	if flag == nil {
		return apperror.ErrFlaggedMessageNotFound
	}
	if flag.Status != "pending" {
		return apperror.ErrFlaggedMessageReviewed
	}

	if err = mod.store.Message.UpdateFlaggedMessageStatus(ctx, flaggedID, "dismissed", reviewedBy); err != nil {
		return err
	}

	common.Logger.Info("flagged message dismissed",
		slog.String("flagged_message_id", flaggedID.String()),
		slog.String("reviewed_by", reviewedBy.String()),
		slog.String("component", "service.moderation"),
		slog.String("method", "DismissFlag"))

	return nil
}

// BanUserManually bans a user with an admin-supplied reason.
func (mod *ModerationService) BanUserManually(ctx context.Context, userID uuid.UUID, reason string) error {
	if reason == "" {
		reason = "Banned by administrator"
	}

	if err := mod.store.User.BanUser(ctx, userID, reason); err != nil {
		return err
	}

	_, _ = mod.store.CreateNotifications(ctx, []entity.CreateNotificationParams{{
		UserID:   userID.String(),
		Type:     "account_banned",
		Title:    "Account Banned",
		Message:  "Your account has been banned. Reason: " + reason,
		Priority: "urgent",
	}})

	common.Logger.Warn("user manually banned",
		slog.String("user_id", userID.String()),
		slog.String("reason", reason),
		slog.String("component", "service.moderation"),
		slog.String("method", "BanUserManually"))

	return nil
}

// UnbanUser removes a ban and resets the warning count.
func (mod *ModerationService) UnbanUser(ctx context.Context, userID uuid.UUID) error {
	if err := mod.store.User.UnbanUser(ctx, userID); err != nil {
		return err
	}

	_, _ = mod.store.CreateNotifications(ctx, []entity.CreateNotificationParams{{
		UserID:   userID.String(),
		Type:     "account_unbanned",
		Title:    "Account Reinstated",
		Message:  "Your account ban has been lifted. Please review our chat policies to avoid future violations.",
		Priority: "high",
	}})

	common.Logger.Info("user unbanned",
		slog.String("user_id", userID.String()),
		slog.String("component", "service.moderation"),
		slog.String("method", "UnbanUser"))

	return nil
}

// ListFlaggedMessages returns paginated flagged messages, optionally filtered by status.
// Pass status="" to return all statuses.
func (mod *ModerationService) ListFlaggedMessages(ctx context.Context, status string, limit, offset int) ([]*entity.FlaggedMessage, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	return mod.store.Message.ListFlaggedMessages(ctx, status, limit, offset)
}

// GetUserWarningCount returns the current warning count for a user.
func (mod *ModerationService) GetUserWarningCount(ctx context.Context, userID uuid.UUID) (int, error) {
	return mod.store.User.GetWarningCount(ctx, userID)
}
