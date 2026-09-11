package common

import (
	"fmt"

	"github.com/google/uuid"
)

type Options struct {
	Name string
	Addr string
	Env  string

	ApiURL      string
	ApiKey      string
	FrontendURL string
	AuthApiURL  string
	AuthApiKey  string

	AdminEmails []string

	Version  string
	LogLevel string

	CacheEnabled bool

	CryptoKey string
	SecretKey string

	GateKeeperDuration string
}



func InitOptions() *Options {
	return &Options{
		Name:               GetEnvString("NAME", "Ariatoon"),
		Addr:               GetEnvString("ADDR", ":8000"),
		Env:                GetEnvString("ENV", "development"),
		ApiURL:             GetEnvString("API_URL", "http://localhost:8000"),
		ApiKey:             GetEnvString("API_KEY", uuid.NewString()),
		FrontendURL:        GetEnvString("FRONTEND_URL", "http://localhost:3000"),
		AuthApiURL:         GetEnvString("AUTH_API_URL", "http://localhost:3567"),
		AuthApiKey:         GetEnvString("AUTH_API_KEY", ""),
		AdminEmails:        GetEnvStrings("ADMIN_EMAILS", []string{""}),
		LogLevel:           GetEnvString("LOG_LEVEL", "info"),
		CacheEnabled:       GetEnvBool("CACHE_ENABLED", true),
		CryptoKey:          uuid.NewString(),
		SecretKey:          GetEnvString("SECRET_KEY", uuid.NewString()),
		GateKeeperDuration: GateKeeperDuration,
	}
}

func (o *Options) String() string {
	if o == nil {
		return "Options<nil>"
	}
	return fmt.Sprintf("Options{Name:%q, Addr:%q, Env:%q, ApiURL:%q, ApiKey: %s, "+
		"FrontendURL:%q, AuthApiURL:%q, AuthApiKey: %s, AdminEmails:%v, Version:%q, "+
		"LogLevel:%q, CacheEnabled:%v, SecretKey: %s, "+
		"GateKeeperDuration:%q}",
		o.Name, o.Addr, o.Env, o.ApiURL, o.ApiKey, o.FrontendURL, o.AuthApiURL, o.AuthApiKey, o.AdminEmails,
		o.Version, o.LogLevel, o.CacheEnabled, o.SecretKey, o.GateKeeperDuration)
}

func (o *Options) IsEnvDev() bool {
	return o.IsEnvDev()
}

func (o *Options) IsEnvProd() bool {
	return o.IsEnvProd()
}
