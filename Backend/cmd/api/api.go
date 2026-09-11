package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/cache"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/OmarHosny18/APP-frontend/internal/gatekeeper"
	"github.com/OmarHosny18/APP-frontend/internal/handler"
	"github.com/OmarHosny18/APP-frontend/internal/ratelimiter"
	"github.com/OmarHosny18/APP-frontend/internal/service"
	"github.com/OmarHosny18/APP-frontend/internal/store"
	"github.com/OmarHosny18/APP-frontend/internal/worker"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/go-chi/cors"
	redismod "github.com/gomodule/redigo/redis"
	"github.com/redis/go-redis/v9"
)

type application struct {
	Keeper  gatekeeper.Keeper
	Limiter ratelimiter.Limiter
	DB      *sql.DB
	RDB     *redis.Client
	RPool   *redismod.Pool
}

func (app *application) Init(ctx context.Context) (http.Handler, error) {

	// --- Initialize dependencies ---
	ss := config.MustInitSessionStore(app.RPool, []byte(config.Configs.SessionKey),
		config.Configs.Env, config.Configs.FrontendURL, config.Configs.SessionPrefix, common.SessionTTL)

	common.Logger.Info("initialized session store",
		slog.String("component", "api.api"),
		slog.String("method", "Init"))

	Mailer := common.InitMailer()
	common.Logger.Info("mailer initialized",
		slog.String("component", "api.api"),
		slog.String("method", "Init"))

	store := store.New(app.DB)
	cache := cache.New(app.RDB)
	service := service.New(store, cache, ss)
	handler := handler.New(service, store, Mailer)
	worker := worker.New(service, store)

	mux := chi.NewMux()

	// ---------- MIDDLEWARE SETUP ----------

	mux.Use(middleware.RequestID)
	mux.Use(middleware.RealIP)
	mux.Use(middleware.Recoverer)

	// Use slog for app-level logs
	common.Logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Use standard log for request middleware
	if config.Configs.AccessLogEnabled {
		mux.Use(middleware.RequestLogger(&middleware.DefaultLogFormatter{
			Logger:  log.New(os.Stdout, "[request] ", log.LstdFlags),
			NoColor: true,
		}))
	}

	// Log IP headers for debugging (optional)
	mux.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			common.Logger.Info("IP headers",
				slog.String("X-Forwarded-For", r.Header.Get("X-Forwarded-For")),
				slog.String("X-Real-IP", r.Header.Get("X-Real-IP")),
				slog.String("RemoteAddr", r.RemoteAddr),
			)
			next.ServeHTTP(w, r)
		})
	})

	mux.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{config.Configs.FrontendURL.String(), "http://localhost:3000", "http://localhost:3001"},
		AllowedMethods: []string{
			http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions,
		},
		AllowedHeaders: []string{
			"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With",
		},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           600,
	}))

	// Performance / Safety middleware
	mux.Use(middleware.Compress(5))              // Compresses responses
	mux.Use(middleware.RedirectSlashes)          // Avoids duplicate routes
	mux.Use(middleware.Heartbeat("/ping"))       // Health check endpoint
	mux.Use(middleware.Timeout(2 * time.Minute)) // Timeout for slow/hanging requests

	// --- Rate limiting & Throttling ---
	mux.Use(app.Limiter.Middleware) // Custom rate limiter

	// --- Upload size limit (500MB) ---
	mux.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, 500<<20) // 500 MB
			next.ServeHTTP(w, r)
		})
	})

	// ---------- ROUTES ----------
	handler.Init(mux)

	common.Logger.Info("initialized routes",
		slog.String("component", "api.api"),
		slog.String("method", "Init"))

	// ---------- WORKERS ----------
	app.Limiter.Worker(ctx)
	worker.Run(ctx)

	common.Logger.Info("dispatched workers",
		slog.String("component", "api.api"),
		slog.String("method", "Init"))

	common.Logger.Info("started scheduled tasks",
		slog.String("component", "api.api"),
		slog.String("method", "Init"))

	return mux, nil
}

func (app *application) MustInit(ctx context.Context) http.Handler {
	mux, err := app.Init(ctx)
	if err != nil {
		// Handle error gracefully without panic (only log it)
		common.Logger.Error("failed to initialize application",
			slog.String("component", "api.api"),
			slog.String("method", "MustInit"))
		// Don't panic here; just return an empty handler
		return nil
	}
	return mux
}

func (app *application) Run(ctx context.Context) error {
	mux := app.MustInit(ctx)
	if mux == nil {
		// Gracefully handle the case where initialization failed
		return errors.New("failed to initialize the application")
	}
	srv := &http.Server{
		Addr:              ":8000",
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       5 * time.Minute,
		WriteTimeout:      5 * time.Minute,
		IdleTimeout:       120 * time.Second,
	}

	var (
		shutdown = make(chan error, 1)
		quit     = make(chan os.Signal, 1)
	)

	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT, syscall.SIGHUP)

	go func() {
		sig := <-quit

		common.Logger.Info("received shutdown signal",
			slog.Any("signal", sig),
			slog.String("component", "api.api"),
			slog.String("method", "Run"))

		ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()

		shutdown <- srv.Shutdown(ctx)
	}()

	common.Logger.Info("started server",
		slog.String("url", config.Configs.ApiURL.String()),
		slog.String("component", "api.api"),
		slog.String("method", "Run"))

	err := srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	err = <-shutdown
	if err != nil {
		common.Logger.Error("failed server shutdown",
			slog.Any("error", err),
			slog.String("component", "api.api"),
			slog.String("method", "Run"))
		return err
	}

	common.Logger.Info("stopped server gracefully",
		slog.String("component", "api.api"),
		slog.String("method", "Run"))
	return nil
}
