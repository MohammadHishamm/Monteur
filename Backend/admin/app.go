package admin

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/handler"
	"github.com/OmarHosny18/APP-frontend/admin/registry"
	"github.com/OmarHosny18/APP-frontend/admin/repository"
	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/OmarHosny18/APP-frontend/admin/service"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/OmarHosny18/APP-frontend/admin/web"
	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Portal is a fully wired admin site: the handler to serve and the registry
// it was built from (exposed for tests and tooling).
type Portal struct {
	Handler http.Handler
	Site    *site.Site
}

// New builds the portal's http.Handler. It introspects every registered
// table and creates the bootstrap superuser, so a misconfigured registry or
// unreachable database fails here, at startup.
func New(ctx context.Context, cfg Config, db *sql.DB) (http.Handler, error) {
	p, err := Build(ctx, cfg, db)
	if err != nil {
		return nil, err
	}
	return p.Handler, nil
}

// Build is New but also returns the registry.
func Build(ctx context.Context, cfg Config, db *sql.DB) (*Portal, error) {
	s := site.New(cfg.BasePath)
	s.SiteHeader = cfg.SiteHeader
	s.SiteTitle = cfg.SiteTitle

	if err := registry.Register(ctx, s, schema.NewIntrospector(db)); err != nil {
		return nil, err
	}
	common.Logger.Info("registered admin models",
		slog.Int("apps", len(s.Apps())),
		slog.Int("models", countModels(s)),
		slog.String("component", "admin.app"),
		slog.String("method", "New"))

	admins := auth.NewRepository(db)
	if err := service.EnsureSuperuser(ctx, admins, cfg.BootstrapEmail, cfg.BootstrapPassword, cfg.BootstrapName); err != nil {
		return nil, err
	}

	renderer, err := web.NewRenderer()
	if err != nil {
		return nil, fmt.Errorf("admin: templates: %w", err)
	}

	sessions := auth.NewSessions([]byte(cfg.SessionKey), cfg.SessionName, cfg.BasePath, cfg.SecureCookies, cfg.SessionMaxAge)
	logs := service.NewLogService(db)
	models := service.NewModelService(repository.New(db), s, logs)
	h := handler.New(s, models, logs, auth.NewAuthenticator(admins), admins, sessions, renderer)

	mux := chi.NewMux()
	mux.Use(middleware.RequestID)
	mux.Use(middleware.RealIP)
	mux.Use(middleware.Recoverer)
	mux.Use(middleware.Compress(5))
	mux.Use(middleware.Timeout(60 * time.Second))
	mux.Use(middleware.Heartbeat(cfg.BasePath + "/ping"))
	h.Register(mux)
	mux.NotFound(h.NotFound(mux))

	return &Portal{Handler: mux, Site: s}, nil
}

func countModels(s *site.Site) int {
	n := 0
	for _, a := range s.Apps() {
		n += len(a.Models())
	}
	return n
}
