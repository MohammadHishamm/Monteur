package config

import (
	"encoding/gob"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/entity"

	"github.com/boj/redistore"
	"github.com/gomodule/redigo/redis"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
)

func NewSessionStore(rp *redis.Pool, sessionKey []byte, prefix string,
	opts *sessions.Options) (*redistore.RediStore, error) {
	ss, err := redistore.NewRediStoreWithPool(rp, sessionKey)
	if err != nil {
		return nil, err
	}

	ss.Options.Path = opts.Path
	if opts.SameSite != 0 {
		ss.Options.SameSite = opts.SameSite
	} else {
		ss.Options.SameSite = http.SameSiteLaxMode
	}
	ss.Options.Secure = opts.Secure
	ss.Options.HttpOnly = opts.HttpOnly
	ss.Options.Domain = opts.Domain

	ss.SetMaxLength(4096)
	ss.SetKeyPrefix(prefix)
	ss.SetMaxAge(opts.MaxAge)

	common.Logger.Debug("created session store",
		slog.Any("options", ss.Options),
		slog.String("component", "config.session"),
		slog.String("method", "NewSessionStore"))

	return ss, nil
}

func MustInitSessionStore(rPool *redis.Pool, sessionKey []byte, env *Env, url *URL, prefix string, maxAge int) *redistore.RediStore {
	if sessionKey == nil || env == nil || url.Host == "" || prefix == "" {
		panic(fmt.Sprintf("failed to initialize session store, session key: %v, env: %v, host: %v, prefix: %v", sessionKey, env, url.Host, prefix))
	}

	opts := NewSessionStoreOptions(env, url, "/", url.Host, maxAge)
	cs, err := NewSessionStore(rPool, sessionKey, prefix, opts)
	if err != nil {
		panic(err)
	}

	InitSecureCookieGob()

	return cs
}

func NewSessionStoreOptions(env *Env, url *URL, path, host string, maxAge int) *sessions.Options {
	cleanHost := host
	if h, _, err := net.SplitHostPort(host); err == nil {
		cleanHost = h
	}

	// For localhost, dev environments, or direct IP addresses, RFC 6265 requires
	// omitting the Domain attribute (empty string) so browsers treat it as a host-only cookie.
	// Setting Domain="localhost" causes modern browsers to reject or fail to send the cookie.
	domain := ""
	isIP, isLocal := common.ValidateDomain(cleanHost)
	if !isIP && !isLocal && env != nil && !env.IsDev() && cleanHost != "" {
		// Production with actual domain name: prefix with dot for subdomain sharing if desired
		if strings.Contains(cleanHost, ".") {
			domain = fmt.Sprintf(".%s", cleanHost)
		}
	}

	isSecure := false
	if url != nil && url.Schema == "https" {
		isSecure = true
	}

	return &sessions.Options{
		Path:   path,
		MaxAge: maxAge,
		Secure: isSecure,
		// HttpOnly must always be true so the session-ID cookie is never readable by
		// JavaScript (XSS protection). It is independent of the transport scheme.
		HttpOnly: true,
		Domain:   domain,
		SameSite: http.SameSiteLaxMode,
	}
}

func InitSecureCookieGob() {
	gob.Register(new(uuid.UUID))
	gob.Register(new(entity.User))
}
