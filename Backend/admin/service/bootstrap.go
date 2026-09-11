package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/common"
)

// EnsureSuperuser creates the initial portal account if it does not exist —
// the equivalent of running `createsuperuser` once. It never modifies an
// existing account, so rotating the password later through the portal is
// safe across restarts.
func EnsureSuperuser(ctx context.Context, repo *auth.Repository, email, password, fullName string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil
	}

	existing, err := repo.FindByEmail(ctx, email)
	if err != nil {
		return fmt.Errorf("service: bootstrap lookup: %w", err)
	}
	if existing != nil {
		return nil
	}

	hash, err := common.HashPassword(password)
	if err != nil {
		return fmt.Errorf("service: bootstrap hash: %w", err)
	}
	if _, err := repo.Create(ctx, email, fullName, hash); err != nil {
		return fmt.Errorf("service: bootstrap create: %w", err)
	}

	common.Logger.Info("created initial admin account",
		slog.String("email", email),
		slog.String("component", "admin.service"),
		slog.String("method", "EnsureSuperuser"))
	return nil
}
