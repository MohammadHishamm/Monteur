package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
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

// Login verifies credentials and starts a session.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	data := loginData{
		Email: strings.TrimSpace(r.PostFormValue("email")),
		Next:  r.PostFormValue("next"),
	}

	admin, err := h.auth.Authenticate(r.Context(), data.Email, r.PostFormValue("password"))
	switch {
	case errors.Is(err, auth.ErrInvalidCredentials):
		data.Error = "Please enter the correct email and password for a staff account. Note that both fields may be case-sensitive."
		h.showLogin(w, r, http.StatusOK, data)
		return
	case err != nil:
		h.serverError(w, r, err)
		return
	}

	if err := h.sessions.Login(w, r, admin.ID); err != nil {
		h.serverError(w, r, err)
		return
	}
	_ = h.admins.TouchLogin(r.Context(), admin.ID)

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
