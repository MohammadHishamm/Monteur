// Command admin serves the Monteur admin portal — a Django-admin-style web
// UI over the PostgreSQL database — on its own port, separate from the API.
//
//	go run ./cmd/admin          # http://localhost:8001/admin/
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin"
	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/joho/godotenv"
)

func main() {
	ctx := context.Background()

	common.InitLogger(false)
	_ = godotenv.Load("docker/.env")

	config.MustInitConfig()
	common.InitLogger(config.Configs.Env.IsDev())

	cfg := admin.LoadConfig(config.Configs.Env.IsProd(), config.Configs.SessionKey)

	db, err := config.NewDatabase(
		ctx,
		config.Configs.DatabaseAddr,
		config.Configs.DatabaseMaxIdleTime,
		config.Configs.DatabaseMaxLifetime,
		// The portal is a low-traffic tool; a small pool is plenty.
		10, 5,
	)
	if err != nil {
		common.Logger.Error("failed to establish database connection",
			slog.Any("error", err),
			slog.String("component", "admin.main"),
			slog.String("method", "main"))
		panic(err)
	}
	defer db.Close()

	handler, err := admin.New(ctx, cfg, db)
	if err != nil {
		common.Logger.Error("failed to initialize admin portal",
			slog.Any("error", err),
			slog.String("component", "admin.main"),
			slog.String("method", "main"))
		panic(err)
	}

	if err := run(ctx, cfg.Addr, cfg.BasePath, handler); err != nil {
		panic(err)
	}
}

func run(ctx context.Context, addr, basePath string, h http.Handler) error {
	srv := &http.Server{
		Addr:              addr,
		Handler:           h,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       1 * time.Minute,
		WriteTimeout:      2 * time.Minute,
		IdleTimeout:       120 * time.Second,
	}

	shutdown := make(chan error, 1)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-quit
		common.Logger.Info("received shutdown signal",
			slog.Any("signal", sig),
			slog.String("component", "admin.main"),
			slog.String("method", "run"))
		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		shutdown <- srv.Shutdown(ctx)
	}()

	common.Logger.Info("started admin portal",
		slog.String("addr", addr),
		slog.String("url", "http://localhost"+addr+basePath+"/"),
		slog.String("component", "admin.main"),
		slog.String("method", "run"))

	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	if err := <-shutdown; err != nil {
		return err
	}

	common.Logger.Info("stopped admin portal gracefully",
		slog.String("component", "admin.main"),
		slog.String("method", "run"))
	return nil
}
