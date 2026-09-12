package config

import (
	"fmt"
	"net/url"

	"github.com/OmarHosny18/APP-frontend/common"

	"github.com/google/uuid"
)

var (
	Configs *Config

	EnvDev  string = "development"
	EnvProd string = "production"
)

type Config struct {
	jwt_secret               string
	DiscordClientID          string
	DiscordClientSecret      string
	GoogleClientID           string
	GoogleClientSecret       string
	GitHubClientID           string
	GitHubClientSecret       string
	LogLevel                 string
	SecretKey                string
	EncryptionKey            string
	SessionKey               string
	ApiKey                   string
	SessionPrefix            string
	SessionCookieName        string
	Version                  string
	AdminEmails              []string
	RateLimiterEnabled       bool
	RateLimiterTimeFrame     string
	RateLimiterRequestsCount int
	RateLimiterBucketCount   int
	RateLimiterLogAllowed    bool
	GateKeeperEnabled        bool
	AccessLogEnabled         bool
	DatabaseAddr             string
	DatabaseMaxOpenConns     int
	DatabaseMaxIdleConns     int
	DatabaseMaxIdleTime      string
	DatabaseMaxLifetime      string
	CacheEnabled             bool
	CacheAddr                string
	CachePassword            string
	CacheDB                  int
	Env                      *Env
	ApiURL                   *URL
	FrontendURL              *URL
}

type Env struct {
	Env string
}

func (e *Env) Parse(env string) {
	e.Env = env
}

func (e *Env) IsDev() bool {
	return e.Env == EnvDev
}

func (e *Env) IsProd() bool {
	return e.Env == EnvProd
}

func (e *Env) String() string {
	return e.Env
}

type URL struct {
	Host   string
	Port   string
	Schema string
}

func (u *URL) Parse(s string) {
	url, err := url.Parse(s)
	if err != nil {
		host, port := common.GetHostPort(s)
		u.Host = host
		u.Port = port
		u.Schema = "http"
		return
	}

	u.Host = url.Hostname()
	u.Port = url.Port()
	u.Schema = url.Scheme
}

func (u *URL) String() string {
	if u.Port == "" || (u.Schema == "http" && u.Port == "80") || (u.Schema == "https" && u.Port == "443") {
		return fmt.Sprintf("%s://%s", u.Schema, u.Host)
	}
	return fmt.Sprintf("%s://%s:%s", u.Schema, u.Host, u.Port)
}

func (u *URL) WithPath(path string) string {
	return fmt.Sprintf("%s%s", u.String(), path)
}

// GetEncryptionKey returns the encryption key for sensitive data
func (c *Config) GetEncryptionKey() string {
	return c.EncryptionKey
}

// GetJWTSecret returns the JWT secret
func (c *Config) GetJWTSecret() string {
	return c.jwt_secret
}

func InitConfig() *Config {
	env := Env{}
	env.Parse(common.GetEnvString("ENV", EnvDev))

	name := common.GetEnvString("NAME", "Ariatoon")

	apiUrl := URL{}
	apiUrl.Parse(common.GetEnvString("API_URL", "http://localhost:8080"))

	frontendUrl := URL{}
	frontendUrl.Parse(common.GetEnvString("FRONTEND_URL", "http://localhost:8080"))

	apiKey := common.GetEnvString("API_KEY", uuid.NewString())
	secretKey := common.GetEnvString("SECRET_KEY", uuid.NewString())
	encryptionKey := common.GetEnvString("ENCRYPTION_KEY", secretKey) // Fallback to SecretKey if not provided

	return &Config{
		jwt_secret:               common.GetEnvString("JWT_SECRET", ""),
		DiscordClientID:          common.GetEnvString("DISCORD_CLIENT_ID", ""),
		DiscordClientSecret:      common.GetEnvString("DISCORD_CLIENT_SECRET", ""),
		GoogleClientID:           common.GetEnvString("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:       common.GetEnvString("GOOGLE_CLIENT_SECRET", ""),
		GitHubClientID:           common.GetEnvString("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret:       common.GetEnvString("GITHUB_CLIENT_SECRET", ""),
		LogLevel:                 common.GetEnvString("LOG_LEVEL", "info"),
		CacheEnabled:             common.GetEnvBool("CACHE_ENABLED", true),
		ApiKey:                   apiKey,
		SecretKey:                secretKey,
		EncryptionKey:            encryptionKey,
		SessionKey:               common.GetEnvString("SESSION_KEY", secretKey),
		AdminEmails:              common.GetEnvStrings("ADMIN_EMAILS", []string{""}),
		SessionCookieName:        common.GetSessionName(name, "ck"),
		SessionPrefix:            common.GetSessionName(name),
		Version:                  common.GetEnvString("GH_VERSION", uuid.NewString()),
		RateLimiterEnabled:       common.GetEnvBool("RATE_LIMITER_ENABLED", true),
		RateLimiterTimeFrame:     common.GetEnvString("RATE_LIMITER_TIME_FRAME", "30s"),
		RateLimiterRequestsCount: common.GetEnvInt("RATELIMITER_REQUESTS_COUNT", 1800),
		RateLimiterBucketCount:   common.GetEnvInt("RATE_LIMITER_BUCKET_COUNT", 64),
		RateLimiterLogAllowed:    common.GetEnvBool("RATE_LIMITER_LOG_ALLOWED", false),
		GateKeeperEnabled:        false,
		AccessLogEnabled:         common.GetEnvBool("ACCESS_LOG_ENABLED", env.IsDev()),
		DatabaseAddr:             common.GetEnvString("DB_ADDR", ""),
		DatabaseMaxOpenConns:     common.GetEnvInt("DB_MAX_OPEN_CONNS", 200),
		DatabaseMaxIdleConns:     common.GetEnvInt("DB_MAX_IDLE_CONNS", 50),
		DatabaseMaxIdleTime:      common.GetEnvString("DB_MAX_IDLE_TIME", "15m"),
		DatabaseMaxLifetime:      common.GetEnvString("DB_MAX_LIFETIME", "60m"),
		CacheAddr:                common.GetEnvString("REDIS_ADDR", "redis:6379"),
		CachePassword:            common.GetEnvString("REDIS_PASSWORD", ""),
		CacheDB:                  common.GetEnvInt("REDIS_DB", 0),
		Env:                      &env,
		ApiURL:                   &apiUrl,
		FrontendURL:              &frontendUrl,
	}
}

func MustInitConfig() {
	if Configs != nil {
		panic("config: failed to initialize config, already initialized")
	}

	Configs = InitConfig()
}
