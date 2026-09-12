// Package admin assembles the portal: it reads its own configuration, wires
// the schema → repository → service → handler layers and exposes a single
// http.Handler for the entrypoint in cmd/admin to serve.
package admin

import (
	"errors"
	"fmt"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

// devBootstrapPassword is the out-of-the-box password for local development.
// It is never applied in production: there the bootstrap account is only
// created when ADMIN_BOOTSTRAP_PASSWORD is set explicitly, and this value
// is refused outright.
const devBootstrapPassword = "test1234"

// Config is everything the portal needs beyond the shared database settings.
// All of it comes from the environment (docker/.env) with sensible defaults.
type Config struct {
	// Production tightens defaults: secure cookies, no default bootstrap
	// password.
	Production bool
	// Addr is the listen address; the portal runs on its own port so it can
	// be deployed and firewalled independently of the public API.
	Addr string
	// BasePath is the URL prefix; in production nginx routes
	// api-v1.<domain>/admin/* here, so the default is "/admin".
	BasePath string
	// SiteHeader / SiteTitle brand the pages.
	SiteHeader string
	SiteTitle  string

	// SessionKey signs the session cookie; SessionMaxAge is in seconds.
	SessionKey    string
	SessionName   string
	SessionMaxAge int
	SecureCookies bool

	// Bootstrap superuser, created on first start if missing.
	BootstrapEmail    string
	BootstrapPassword string
	BootstrapName     string

	// Login lockout (django-axes semantics): LoginMaxFailures failures within
	// LoginWindow lock the IP and the account for LoginLockout. 0 disables.
	LoginMaxFailures int
	LoginWindow      time.Duration
	LoginLockout     time.Duration

	// Two-factor authentication. TwoFactorRequired forces every admin to
	// enrol before using the portal; TwoFactorIssuer labels the entry in the
	// authenticator app.
	TwoFactorRequired bool
	TwoFactorIssuer   string
}

// LoadConfig reads the environment. It must be called after godotenv has
// loaded docker/.env.
func LoadConfig(isProd bool, sessionKeyFallback string) Config {
	defaultPassword := devBootstrapPassword
	if isProd {
		defaultPassword = ""
	}
	return Config{
		Production:        isProd,
		Addr:              common.GetEnvString("ADMIN_ADDR", ":8001"),
		BasePath:          common.GetEnvString("ADMIN_BASE_PATH", "/admin"),
		SiteHeader:        common.GetEnvString("ADMIN_SITE_HEADER", "Monteur administration"),
		SiteTitle:         common.GetEnvString("ADMIN_SITE_TITLE", "Monteur admin"),
		SessionKey:        common.GetEnvString("ADMIN_SESSION_KEY", sessionKeyFallback),
		SessionName:       common.GetEnvString("ADMIN_SESSION_NAME", "monteur_admin_session"),
		SessionMaxAge:     common.GetEnvInt("ADMIN_SESSION_MAX_AGE", 8*60*60),
		SecureCookies:     common.GetEnvBool("ADMIN_SECURE_COOKIES", isProd),
		BootstrapEmail:    common.GetEnvString("ADMIN_BOOTSTRAP_EMAIL", "admin@monteur.com"),
		BootstrapPassword: common.GetEnvString("ADMIN_BOOTSTRAP_PASSWORD", defaultPassword),
		BootstrapName:     common.GetEnvString("ADMIN_BOOTSTRAP_NAME", "Monteur Admin"),
		LoginMaxFailures:  common.GetEnvInt("ADMIN_LOGIN_MAX_FAILURES", 5),
		LoginWindow:       envDuration("ADMIN_LOGIN_WINDOW", 15*time.Minute),
		LoginLockout:      envDuration("ADMIN_LOGIN_LOCKOUT", 15*time.Minute),
		TwoFactorRequired: common.GetEnvBool("ADMIN_2FA_REQUIRED", isProd),
		TwoFactorIssuer:   common.GetEnvString("ADMIN_2FA_ISSUER", "Monteur admin"),
	}
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if d, err := time.ParseDuration(common.GetEnvString(key, "")); err == nil && d > 0 {
		return d
	}
	return fallback
}

// Validate rejects configurations that would leave the portal insecure.
// It is called by Build so a bad deployment fails at startup, loudly.
func (c Config) Validate() error {
	if c.SessionKey == "" {
		return errors.New("admin: ADMIN_SESSION_KEY (or SESSION_KEY) must not be empty — session cookies would be unsigned")
	}
	if c.BasePath == "" || c.BasePath[0] != '/' {
		return fmt.Errorf("admin: ADMIN_BASE_PATH %q must start with '/'", c.BasePath)
	}
	if c.Production && c.BootstrapPassword == devBootstrapPassword {
		return errors.New("admin: ADMIN_BOOTSTRAP_PASSWORD is the development default; set a real password in production")
	}
	return nil
}
