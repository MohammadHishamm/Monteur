// Package admin assembles the portal: it reads its own configuration, wires
// the schema → repository → service → handler layers and exposes a single
// http.Handler for the entrypoint in cmd/admin to serve.
package admin

import (
	"github.com/OmarHosny18/APP-frontend/common"
)

// Config is everything the portal needs beyond the shared database settings.
// All of it comes from the environment (docker/.env) with sensible defaults.
type Config struct {
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
}

// LoadConfig reads the environment. It must be called after godotenv has
// loaded docker/.env.
func LoadConfig(isProd bool, sessionKeyFallback string) Config {
	return Config{
		Addr:              common.GetEnvString("ADMIN_ADDR", ":8001"),
		BasePath:          common.GetEnvString("ADMIN_BASE_PATH", "/admin"),
		SiteHeader:        common.GetEnvString("ADMIN_SITE_HEADER", "Monteur administration"),
		SiteTitle:         common.GetEnvString("ADMIN_SITE_TITLE", "Monteur admin"),
		SessionKey:        common.GetEnvString("ADMIN_SESSION_KEY", sessionKeyFallback),
		SessionName:       common.GetEnvString("ADMIN_SESSION_NAME", "monteur_admin_session"),
		SessionMaxAge:     common.GetEnvInt("ADMIN_SESSION_MAX_AGE", 8*60*60),
		SecureCookies:     common.GetEnvBool("ADMIN_SECURE_COOKIES", isProd),
		BootstrapEmail:    common.GetEnvString("ADMIN_BOOTSTRAP_EMAIL", "admin@monteur.com"),
		BootstrapPassword: common.GetEnvString("ADMIN_BOOTSTRAP_PASSWORD", "test1234"),
		BootstrapName:     common.GetEnvString("ADMIN_BOOTSTRAP_NAME", "Monteur Admin"),
	}
}
