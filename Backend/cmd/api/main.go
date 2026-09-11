package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/OmarHosny18/APP-frontend/internal/gatekeeper"
	"github.com/OmarHosny18/APP-frontend/internal/ratelimiter"
	"github.com/joho/godotenv"
)

//	@title			API
//	@version		1.0
//	@description	Backend API for Freelance platform
//	@termsOfService	http://swagger.io/terms/

//	@host		localhost:8000
//	@BasePath	/v1

//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				JWT token for mobile clients. Use 'Bearer <token>'

//	@securityDefinitions.apikey	CookieAuth
//	@in							cookie
//	@name						session
//	@description				Session cookie for web clients

// @security	BearerAuth
// @security	CookieAuth
func main() {
	ctx := context.Background()

	// Init default logger
	common.InitLogger(false)

	// Load env variables if they exist
	_ = godotenv.Load("docker/.env")

	config.MustInitConfig()
	common.SetJWTSecret(config.Configs.GetJWTSecret())

	common.Logger.Info("loaded options and configurations",
		slog.String("component", "api.main"),
		slog.String("method", "main"))

	// Re-init logger with proper level
	common.InitLogger(config.Configs.Env.IsDev())

	// Init uploader
	// Always use absolute path in Docker to ensure files are saved to the volume
	// Check if running in Docker by checking if /app/uploads exists or if we're in a container
	path := common.UploadDirName
	// if config.Configs.Env.IsDev() {
	// 	path = "server/" + path
	// }
	common.MustInitUploader(common.MaxUploadSize, path)

	// Init database
	db, err := config.NewDatabase(
		ctx,
		config.Configs.DatabaseAddr,
		config.Configs.DatabaseMaxIdleTime,
		config.Configs.DatabaseMaxLifetime,
		config.Configs.DatabaseMaxOpenConns,
		config.Configs.DatabaseMaxIdleConns,
	)
	if err != nil {
		common.Logger.Error("failed to establish database connection",
			slog.String("component", "api.main"),
			slog.String("method", "main"))
		panic(err)
	}
	defer db.Close()

	common.Logger.Info("established database connection",
		slog.String("component", "api.main"),
		slog.String("method", "main"))

	// Init Cache
	rdb, err := config.NewRedis(ctx, config.Configs.CacheAddr, config.Configs.CachePassword, config.Configs.CacheDB)
	if err != nil {
		common.Logger.Error("failed to establish cache connection",
			slog.String("component", "api.main"),
			slog.String("method", "main"))
		panic(err)
	}

	rPool, err := config.NewRedisPool(ctx, config.Configs.CacheAddr, config.Configs.CachePassword, config.Configs.CacheDB)
	if err != nil {
		common.Logger.Error("failed to establish redis pool",
			slog.String("component", "api.main"),
			slog.String("method", "main"))
		panic(err)
	}

	common.Logger.Info("established redis connection",
		slog.String("component", "api.main"),
		slog.String("method", "main"))

	// Init validator
	common.InitValidator()

	// Init rate limiter
	tf, err := time.ParseDuration(config.Configs.RateLimiterTimeFrame)
	if err != nil {
		common.Logger.Warn("failed to parse rate limiter time frame, using default",
			slog.String("given", config.Configs.RateLimiterTimeFrame),
			slog.String("component", "api.main"))
		tf = 30 * time.Second
	}

	limiter, err := ratelimiter.NewDefaultBucketRateLimiter(
		config.Configs.RateLimiterBucketCount,
		ratelimiter.WithEnabled(config.Configs.RateLimiterEnabled),
		ratelimiter.WithRequestCount(config.Configs.RateLimiterRequestsCount),
		ratelimiter.WithTimeFrame(tf),
		ratelimiter.WithLogAllowed(config.Configs.RateLimiterLogAllowed),
	)
	if err != nil {
		common.Logger.Error("failed to initialize rate limiter",
			slog.String("component", "api.main"),
			slog.String("method", "main"))
		panic(err)
	}

	common.Logger.Info("initialized rate limiter middleware",
		slog.Bool("enabled", config.Configs.RateLimiterEnabled),
		slog.Int("requests", config.Configs.RateLimiterRequestsCount),
		slog.String("timeframe", config.Configs.RateLimiterTimeFrame),
		slog.String("component", "api.main"),
		slog.String("method", "main"))


	// Init Gatekeeper
	keeper, err := gatekeeper.NewHMACKeeper(config.Configs.GateKeeperEnabled, config.Configs.ApiKey, config.Configs.SecretKey)
	if err != nil {
		common.Logger.Error("failed to initialize gatekeeper",
			slog.String("component", "api.main"),
			slog.String("method", "main"))
		panic(err)
	}

	common.Logger.Info("initialized gatekeeper",
		slog.String("component", "api.main"),
		slog.String("method", "main"))

	// Init application
	app := application{
		DB:      db,
		RDB:     rdb,
		RPool:   rPool,
		Limiter: limiter,
		Keeper:  keeper,
	}

	if err := app.Run(ctx); err != nil {
		panic(err)
	}
}
