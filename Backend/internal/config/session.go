package config

import (
	"encoding/gob"
	"fmt"
	"log/slog"
	"net/http"

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
	ss.Options.SameSite = http.SameSiteLaxMode
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
	domain := fmt.Sprintf(".%s", host)

	if env.IsDev() {
		domain = fmt.Sprintf("%s", "localhost")
	}

	return &sessions.Options{
		Path:   path,
		MaxAge: maxAge,
		Secure: url.Schema == "https",
		// HttpOnly must always be true so the session-ID cookie is never readable by
		// JavaScript (XSS protection). It is independent of the transport scheme.
		HttpOnly: true,
		Domain:   domain,
	}
}

func InitSecureCookieGob() {
	gob.Register(new(uuid.UUID))
	gob.Register(new(entity.User))
}
