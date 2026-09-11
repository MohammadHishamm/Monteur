package auth

import (
	"context"
	"crypto/subtle"
	"encoding/gob"
	"net/http"
	"net/url"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
)

const (
	sessionAdminID = "admin_id"
	sessionCSRF    = "csrf_token"
	csrfField      = "csrfmiddlewaretoken" // same field name as Django, so muscle memory works
)

// Flash is a one-shot message shown on the next page, like Django's
// messages framework. Level is "success", "warning" or "error".
type Flash struct {
	Level string
	Text  string
}

func init() {
	gob.Register(Flash{})
}

// Sessions wraps a cookie store with the operations the portal needs.
type Sessions struct {
	store *sessions.CookieStore
	name  string
}

// NewSessions builds a cookie-backed session store. path scopes the cookie
// to the admin mount point so it is never sent to the public API.
func NewSessions(key []byte, name, path string, secure bool, maxAgeSeconds int) *Sessions {
	cs := sessions.NewCookieStore(key)
	cs.Options = &sessions.Options{
		Path:     path,
		MaxAge:   maxAgeSeconds,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}
	return &Sessions{store: cs, name: name}
}

func (s *Sessions) get(r *http.Request) *sessions.Session {
	// CookieStore.Get only errors on a tampered cookie; treat that as "no session".
	sess, _ := s.store.Get(r, s.name)
	return sess
}

// Login binds the session to an admin and rotates the CSRF token.
func (s *Sessions) Login(w http.ResponseWriter, r *http.Request, adminID uuid.UUID) error {
	sess := s.get(r)
	sess.Values[sessionAdminID] = adminID.String()
	sess.Values[sessionCSRF] = newToken()
	return sess.Save(r, w)
}

// Logout destroys the session.
func (s *Sessions) Logout(w http.ResponseWriter, r *http.Request) error {
	sess := s.get(r)
	sess.Options.MaxAge = -1
	return sess.Save(r, w)
}

// AdminID returns the signed-in admin's id, if any.
func (s *Sessions) AdminID(r *http.Request) (uuid.UUID, bool) {
	raw, ok := s.get(r).Values[sessionAdminID].(string)
	if !ok {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(raw)
	return id, err == nil
}

// CSRFToken returns the session's CSRF token, minting one if needed so the
// login form is protected too.
func (s *Sessions) CSRFToken(w http.ResponseWriter, r *http.Request) string {
	sess := s.get(r)
	tok, ok := sess.Values[sessionCSRF].(string)
	if !ok || tok == "" {
		tok = newToken()
		sess.Values[sessionCSRF] = tok
		_ = sess.Save(r, w)
	}
	return tok
}

// AddFlash queues a message for the next request.
func (s *Sessions) AddFlash(w http.ResponseWriter, r *http.Request, level, text string) {
	sess := s.get(r)
	sess.AddFlash(Flash{Level: level, Text: text})
	_ = sess.Save(r, w)
}

// Flashes pops all queued messages.
func (s *Sessions) Flashes(w http.ResponseWriter, r *http.Request) []Flash {
	sess := s.get(r)
	raw := sess.Flashes()
	if len(raw) == 0 {
		return nil
	}
	_ = sess.Save(r, w)
	out := make([]Flash, 0, len(raw))
	for _, f := range raw {
		if fl, ok := f.(Flash); ok {
			out = append(out, fl)
		}
	}
	return out
}

// CSRFFieldName is the hidden input name templates must use.
func CSRFFieldName() string { return csrfField }

func newToken() string {
	tok, err := common.GenerateRandomString(32)
	if err != nil {
		panic("auth: crypto/rand unavailable: " + err.Error())
	}
	return tok
}

// ─── Middleware ──────────────────────────────────────────────────────────────

type ctxKey int

const ctxAdmin ctxKey = iota

// CurrentAdmin returns the admin attached to the request by RequireLogin.
func CurrentAdmin(ctx context.Context) *Admin {
	a, _ := ctx.Value(ctxAdmin).(*Admin)
	return a
}

// RequireLogin redirects anonymous requests to loginPath?next=<url> and
// attaches the Admin to the context otherwise. A session whose admin was
// deleted or deactivated is treated as anonymous.
func RequireLogin(s *Sessions, repo *Repository, loginPath string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			redirect := func() {
				http.Redirect(w, r, loginPath+"?next="+url.QueryEscape(r.URL.RequestURI()), http.StatusFound)
			}
			id, ok := s.AdminID(r)
			if !ok {
				redirect()
				return
			}
			admin, err := repo.FindByID(r.Context(), id)
			if err != nil {
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if admin == nil || !admin.IsActive {
				_ = s.Logout(w, r)
				redirect()
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxAdmin, admin)))
		})
	}
}

// RequireCSRF rejects state-changing requests whose form token does not
// match the session token.
func RequireCSRF(s *Sessions) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
				next.ServeHTTP(w, r)
				return
			}
			want, _ := s.get(r).Values[sessionCSRF].(string)
			got := r.PostFormValue(csrfField)
			if want == "" || subtle.ConstantTimeCompare([]byte(want), []byte(got)) != 1 {
				http.Error(w, "CSRF verification failed. Request aborted.", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
