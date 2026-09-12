package handler

import (
	"encoding/base64"
	"errors"
	"fmt"
	"html/template"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/service"
	"github.com/OmarHosny18/APP-frontend/admin/web"
	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	qrcode "github.com/skip2/go-qrcode"
)

const (
	msgBadCredentials = "Please enter the correct email and password for a staff account. Note that both fields may be case-sensitive."
	msgLockedOut      = "Account locked: too many login attempts. Please try again in %s."
	msgBadCode        = "Invalid authentication code. Enter the current code from your authenticator app."
)

type loginData struct {
	Email string
	Next  string
	Error string
}

// LoginForm renders the sign-in page; an already signed-in admin is sent home.
func (h *Handler) LoginForm(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.sessions.AdminID(r); ok {
		http.Redirect(w, r, h.site.BasePath+"/", http.StatusFound)
		return
	}
	h.showLogin(w, r, http.StatusOK, loginData{Next: r.URL.Query().Get("next")})
}

// Login verifies credentials, subject to the lockout throttle, and starts a
// password-authenticated session. The second factor, if any, comes next.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	data := loginData{
		Email: strings.TrimSpace(r.PostFormValue("email")),
		Next:  r.PostFormValue("next"),
	}
	subjects := auth.Subjects(clientIP(r), data.Email)

	if until, locked := h.lockedOut(w, r, subjects); locked {
		data.Error = lockoutMessage(until)
		h.showLogin(w, r, http.StatusTooManyRequests, data)
		return
	}

	admin, err := h.auth.Authenticate(r.Context(), data.Email, r.PostFormValue("password"))
	switch {
	case errors.Is(err, auth.ErrInvalidCredentials):
		data.Error = msgBadCredentials
		status := http.StatusOK
		if until := h.recordFailure(r, subjects); !until.IsZero() {
			data.Error = lockoutMessage(until)
			status = http.StatusTooManyRequests
		}
		h.showLogin(w, r, status, data)
		return
	case err != nil:
		h.serverError(w, r, err)
		return
	}

	if err := h.sessions.Login(w, r, admin.ID); err != nil {
		h.serverError(w, r, err)
		return
	}
	_ = h.throttle.Reset(r.Context(), subjects)
	_ = h.admins.TouchLogin(r.Context(), admin.ID)

	// RequireSecondFactor will divert to verify/setup as needed.
	http.Redirect(w, r, h.safeNext(data.Next), http.StatusFound)
}

// Logout ends the session (POST only, like Django ≥ 4.1).
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	_ = h.sessions.Logout(w, r)
	http.Redirect(w, r, h.site.BasePath+"/login/", http.StatusFound)
}

func (h *Handler) showLogin(w http.ResponseWriter, r *http.Request, status int, data loginData) {
	p := h.page(w, r, "Log in", data)
	p.BodyClass = "login"
	h.show(w, r, status, "login", p)
}

// safeNext only honours redirect targets inside the portal, preventing open
// redirects via ?next=https://evil.example.
func (h *Handler) safeNext(next string) string {
	home := h.site.BasePath + "/"
	if next == "" || !strings.HasPrefix(next, h.site.BasePath+"/") || strings.HasPrefix(next, "//") {
		return home
	}
	return next
}

// ─── Two-factor authentication ───────────────────────────────────────────────

type twoFactorData struct {
	Next     string
	Error    string
	Enrolled bool
	// Setup only:
	ForEmail string // the account being enrolled (differs from the viewer in assisted setup)
	Assisted bool   // enrolling someone else from the Admins page
	Secret   string // grouped for manual entry
	// QRData is the data: URI of the QR code PNG. Typed as template.URL so
	// html/template does not neutralise the data: scheme in the img src.
	QRData template.URL
	Issuer string
}

// TwoFactorSetupForm shows a QR code for a new secret. The secret is kept
// in the encrypted session until a valid code confirms it, so an existing
// enrolment is untouched by an abandoned page, and re-enrolling (a new
// phone) requires having passed the current second factor first.
func (h *Handler) TwoFactorSetupForm(w http.ResponseWriter, r *http.Request) {
	admin := auth.CurrentAdmin(r.Context())
	if admin.TOTPEnrolled() && !h.sessions.OTPVerified(r) {
		http.Redirect(w, r, h.site.BasePath+"/two-factor/verify/?next="+url.QueryEscape(r.URL.RequestURI()), http.StatusFound)
		return
	}

	secret, err := auth.NewTOTPSecret()
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	if err := h.sessions.SetPendingTOTP(w, r, admin.ID, secret); err != nil {
		h.serverError(w, r, err)
		return
	}
	h.showSetup(w, r, http.StatusOK, admin, secret, twoFactorData{Next: r.URL.Query().Get("next")})
}

// TwoFactorSetup confirms the pending secret with a code from the app.
func (h *Handler) TwoFactorSetup(w http.ResponseWriter, r *http.Request) {
	admin := auth.CurrentAdmin(r.Context())
	data := twoFactorData{Next: r.PostFormValue("next")}
	secret := h.sessions.PendingTOTP(r, admin.ID)
	if secret == "" || (admin.TOTPEnrolled() && !h.sessions.OTPVerified(r)) {
		http.Redirect(w, r, h.site.BasePath+"/two-factor/setup/", http.StatusFound)
		return
	}

	step, ok := auth.VerifyTOTP(secret, r.PostFormValue("code"), time.Now(), 0)
	if !ok {
		data.Error = msgBadCode
		h.showSetup(w, r, http.StatusBadRequest, admin, secret, data)
		return
	}
	if err := h.admins.EnrolTOTP(r.Context(), admin.ID, secret, step); err != nil {
		h.serverError(w, r, err)
		return
	}
	if err := h.sessions.SetPendingTOTP(w, r, admin.ID, ""); err != nil {
		h.serverError(w, r, err)
		return
	}
	if err := h.sessions.MarkOTPVerified(w, r); err != nil {
		h.serverError(w, r, err)
		return
	}
	h.sessions.AddFlash(w, r, "success", "Two-factor authentication is now enabled for your account.")
	http.Redirect(w, r, h.safeNext(data.Next), http.StatusFound)
}

// ─── Assisted enrolment (from the Admins change page) ────────────────────────

// twoFactorTarget resolves the {adminID} of an assisted-setup URL.
func (h *Handler) twoFactorTarget(w http.ResponseWriter, r *http.Request) *auth.Admin {
	id, err := uuid.Parse(chi.URLParam(r, "adminID"))
	if err != nil {
		h.notFound(w)
		return nil
	}
	target, err := h.admins.FindByID(r.Context(), id)
	if err != nil {
		h.serverError(w, r, err)
		return nil
	}
	if target == nil {
		h.notFound(w)
		return nil
	}
	return target
}

// TwoFactorSetupForForm lets a fully authenticated admin enrol a colleague:
// the colleague scans the QR code on their own phone and reads out the
// code. The action is audited on the admins model.
func (h *Handler) TwoFactorSetupForForm(w http.ResponseWriter, r *http.Request) {
	target := h.twoFactorTarget(w, r)
	if target == nil {
		return
	}
	secret, err := auth.NewTOTPSecret()
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	if err := h.sessions.SetPendingTOTP(w, r, target.ID, secret); err != nil {
		h.serverError(w, r, err)
		return
	}
	h.showSetup(w, r, http.StatusOK, target, secret, twoFactorData{Assisted: true})
}

// TwoFactorSetupFor confirms an assisted enrolment.
func (h *Handler) TwoFactorSetupFor(w http.ResponseWriter, r *http.Request) {
	target := h.twoFactorTarget(w, r)
	if target == nil {
		return
	}
	secret := h.sessions.PendingTOTP(r, target.ID)
	if secret == "" {
		http.Redirect(w, r, r.URL.Path, http.StatusFound) // start over with a fresh code
		return
	}
	step, ok := auth.VerifyTOTP(secret, r.PostFormValue("code"), time.Now(), 0)
	if !ok {
		h.showSetup(w, r, http.StatusBadRequest, target, secret, twoFactorData{Assisted: true, Error: msgBadCode})
		return
	}
	if err := h.admins.EnrolTOTP(r.Context(), target.ID, secret, step); err != nil {
		h.serverError(w, r, err)
		return
	}
	_ = h.sessions.SetPendingTOTP(w, r, target.ID, "")

	actor := auth.CurrentAdmin(r.Context())
	if m, ok := h.site.Lookup("app", "admins"); ok {
		h.logs.RecordAction(r.Context(), actor, service.ActionChange, m, target.ID.String(), target.Email,
			"Set up two-factor authentication.")
		h.sessions.AddFlash(w, r, "success", fmt.Sprintf("Two-factor authentication is now enabled for %s.", target.Email))
		http.Redirect(w, r, m.ObjectURL(target.ID.String()), http.StatusFound)
		return
	}
	http.Redirect(w, r, h.site.BasePath+"/", http.StatusFound)
}

// TwoFactorVerifyForm asks for the code after a password login.
func (h *Handler) TwoFactorVerifyForm(w http.ResponseWriter, r *http.Request) {
	admin := auth.CurrentAdmin(r.Context())
	if !admin.TOTPEnrolled() {
		http.Redirect(w, r, h.site.BasePath+"/", http.StatusFound)
		return
	}
	if h.sessions.OTPVerified(r) {
		http.Redirect(w, r, h.safeNext(r.URL.Query().Get("next")), http.StatusFound)
		return
	}
	h.showVerify(w, r, http.StatusOK, twoFactorData{Next: r.URL.Query().Get("next"), Enrolled: true})
}

// TwoFactorVerify checks the code; failures count towards the lockout.
func (h *Handler) TwoFactorVerify(w http.ResponseWriter, r *http.Request) {
	admin := auth.CurrentAdmin(r.Context())
	data := twoFactorData{Next: r.PostFormValue("next"), Enrolled: true}
	if !admin.TOTPEnrolled() {
		http.Redirect(w, r, h.site.BasePath+"/", http.StatusFound)
		return
	}
	subjects := auth.Subjects(clientIP(r), admin.Email)

	if until, locked := h.lockedOut(w, r, subjects); locked {
		data.Error = lockoutMessage(until)
		h.showVerify(w, r, http.StatusTooManyRequests, data)
		return
	}

	step, ok := auth.VerifyTOTP(*admin.TOTPSecret, r.PostFormValue("code"), time.Now(), admin.TOTPLastUsedStep)
	if !ok {
		data.Error = msgBadCode
		status := http.StatusBadRequest
		if until := h.recordFailure(r, subjects); !until.IsZero() {
			data.Error = lockoutMessage(until)
			status = http.StatusTooManyRequests
		}
		h.showVerify(w, r, status, data)
		return
	}
	if err := h.admins.MarkTOTPUsed(r.Context(), admin.ID, step); err != nil {
		h.serverError(w, r, err)
		return
	}
	if err := h.sessions.MarkOTPVerified(w, r); err != nil {
		h.serverError(w, r, err)
		return
	}
	_ = h.throttle.Reset(r.Context(), subjects)
	http.Redirect(w, r, h.safeNext(data.Next), http.StatusFound)
}

func (h *Handler) showSetup(w http.ResponseWriter, r *http.Request, status int, admin *auth.Admin, secret string, data twoFactorData) {
	uri := auth.TOTPURI(h.twoFactor.Issuer, admin.Email, secret)
	png, err := qrcode.Encode(uri, qrcode.Medium, 220)
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	data.Secret = auth.FormatSecret(secret)
	data.QRData = template.URL("data:image/png;base64," + base64.StdEncoding.EncodeToString(png))
	data.Issuer = h.twoFactor.Issuer
	data.Enrolled = admin.TOTPEnrolled()
	data.ForEmail = admin.Email

	p := h.page(w, r, "Set up two-factor authentication", data)
	p.Breadcrumbs = []web.Crumb{{Title: "Home", URL: h.site.BasePath + "/"}}
	if data.Assisted {
		if m, ok := h.site.Lookup("app", "admins"); ok {
			p.Breadcrumbs = append(p.Breadcrumbs,
				web.Crumb{Title: "Admins", URL: m.URL()},
				web.Crumb{Title: admin.Email, URL: m.ObjectURL(admin.ID.String())})
		}
	}
	p.Breadcrumbs = append(p.Breadcrumbs, web.Crumb{Title: "Two-factor authentication"})
	h.show(w, r, status, "two_factor_setup", p)
}

func (h *Handler) showVerify(w http.ResponseWriter, r *http.Request, status int, data twoFactorData) {
	p := h.page(w, r, "Two-factor authentication", data)
	p.BodyClass = "login"
	h.show(w, r, status, "two_factor_verify", p)
}

// ─── Lockout helpers ─────────────────────────────────────────────────────────

func (h *Handler) lockedOut(w http.ResponseWriter, r *http.Request, subjects []string) (time.Time, bool) {
	until, err := h.throttle.LockedUntil(r.Context(), subjects)
	if err != nil {
		// A throttle outage must not open the door: log and treat as locked.
		common.Logger.Error("login throttle unavailable",
			slog.Any("error", err), slog.String("component", "admin.handler"))
		return time.Now().Add(time.Minute), true
	}
	return until, !until.IsZero()
}

func (h *Handler) recordFailure(r *http.Request, subjects []string) time.Time {
	until, err := h.throttle.Fail(r.Context(), subjects)
	if err != nil {
		common.Logger.Error("failed to record login failure",
			slog.Any("error", err), slog.String("component", "admin.handler"))
	}
	if !until.IsZero() {
		common.Logger.Warn("admin login locked out",
			slog.Any("subjects", subjects), slog.Time("until", until),
			slog.String("component", "admin.handler"))
	}
	return until
}

func lockoutMessage(until time.Time) string {
	remaining := time.Until(until).Round(time.Minute)
	if remaining < time.Minute {
		remaining = time.Minute
	}
	return fmt.Sprintf(msgLockedOut, remaining)
}

// clientIP relies on chi's RealIP middleware having already folded
// X-Forwarded-For / X-Real-IP into RemoteAddr.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
