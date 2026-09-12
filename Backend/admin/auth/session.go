package auth

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/gob"
	"net/http"
	"net/url"
	"strings"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
)

const (
	sessionAdminID = "admin_id"
	sessionOTPOK   = "otp_verified" // second factor passed for this session
	sessionPending = "pending_totp" // secret being enrolled; cookie is encrypted
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
// to the admin mount point so it is never sent to the public API. The cookie
// is signed with key and encrypted with a key derived from it, so its
// contents (admin id, second-factor state) are opaque to the browser.
func NewSessions(key []byte, name, path string, secure bool, maxAgeSeconds int) *Sessions {
	encKey := sha256.Sum256(append([]byte("monteur-admin-session-enc:"), key...))
	cs := sessions.NewCookieStore(key, encKey[:])
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

// Login binds the session to an admin after the password check and rotates
// the CSRF token. The second factor starts unverified.
func (s *Sessions) Login(w http.ResponseWriter, r *http.Request, adminID uuid.UUID) error {
	sess := s.get(r)
	sess.Values[sessionAdminID] = adminID.String()
	sess.Values[sessionOTPOK] = false
	sess.Values[sessionCSRF] = newToken()
	return sess.Save(r, w)
}

// MarkOTPVerified records that the second factor passed.
func (s *Sessions) MarkOTPVerified(w http.ResponseWriter, r *http.Request) error {
	sess := s.get(r)
	sess.Values[sessionOTPOK] = true
	return sess.Save(r, w)
}

// SetPendingTOTP remembers a secret shown on a setup page, and which admin
// it is for, until a valid code proves the phone has it. Lives only in the
// encrypted cookie. An empty secret clears it.
func (s *Sessions) SetPendingTOTP(w http.ResponseWriter, r *http.Request, forAdmin uuid.UUID, secret string) error {
	sess := s.get(r)
	if secret == "" {
		delete(sess.Values, sessionPending)
	} else {
		sess.Values[sessionPending] = forAdmin.String() + ":" + secret
	}
	return sess.Save(r, w)
}

// PendingTOTP returns the secret pending for the given admin, or "" when
// none is pending or it belongs to a different admin.
func (s *Sessions) PendingTOTP(r *http.Request, forAdmin uuid.UUID) string {
	v, _ := s.get(r).Values[sessionPending].(string)
	prefix := forAdmin.String() + ":"
	if !strings.HasPrefix(v, prefix) {
		return ""
	}
	return strings.TrimPrefix(v, prefix)
}

// OTPVerified reports whether the second factor passed in this session.
func (s *Sessions) OTPVerified(r *http.Request) bool {
	ok, _ := s.get(r).Values[sessionOTPOK].(bool)
	return ok
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

// Gate is the two-stage access check shared by the middleware below.
type Gate struct {
	Sessions  *Sessions
	Repo      *Repository
	LoginPath string
	// SetupPath / VerifyPath are the two-factor pages.
	SetupPath  string
	VerifyPath string
	// RequireTwoFactor forces admins who have not enrolled into setup before
	// they can reach anything else.
	RequireTwoFactor bool
}

func (g Gate) toLogin(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, g.LoginPath+"?next="+url.QueryEscape(r.URL.RequestURI()), http.StatusFound)
}

// RequirePassword admits sessions that passed the password check and
// attaches the Admin to the context. It is enough for the two-factor pages
// and logout; everything else also needs RequireSecondFactor. A session
// whose admin was deleted or deactivated is treated as anonymous.
func (g Gate) RequirePassword(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, ok := g.Sessions.AdminID(r)
		if !ok {
			g.toLogin(w, r)
			return
		}
		admin, err := g.Repo.FindByID(r.Context(), id)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if admin == nil || !admin.IsActive {
			_ = g.Sessions.Logout(w, r)
			g.toLogin(w, r)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxAdmin, admin)))
	})
}

// RequireSecondFactor runs after RequirePassword: an enrolled admin must
// have verified a code this session; when two-factor is mandatory an
// unenrolled admin is sent to setup first.
func (g Gate) RequireSecondFactor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		admin := CurrentAdmin(r.Context())
		next2 := "?next=" + url.QueryEscape(r.URL.RequestURI())
		switch {
		case admin.TOTPEnrolled() && !g.Sessions.OTPVerified(r):
			http.Redirect(w, r, g.VerifyPath+next2, http.StatusFound)
		case g.RequireTwoFactor && !admin.TOTPEnrolled():
			http.Redirect(w, r, g.SetupPath+next2, http.StatusFound)
		default:
			next.ServeHTTP(w, r)
		}
	})
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
