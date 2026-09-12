// Package handler is the HTTP layer of the admin portal. Handlers parse the
// request, call a service, and render a template; nothing else lives here.
//
// URL layout (mirrors django.contrib.admin):
//
//	/admin/                                  index
//	/admin/login/  /admin/logout/            auth
//	/admin/two-factor/setup/  …/verify/      TOTP enrolment and challenge
//	/admin/<app>/                            app index
//	/admin/<app>/<model>/                    changelist (GET) / bulk actions (POST)
//	/admin/<app>/<model>/add/                add form
//	/admin/<app>/<model>/<key>/change/       change form
//	/admin/<app>/<model>/<key>/delete/       delete confirmation
package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/repository"
	"github.com/OmarHosny18/APP-frontend/admin/service"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/OmarHosny18/APP-frontend/admin/web"
	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/go-chi/chi/v5"
)

// TwoFactorConfig controls TOTP enrolment.
type TwoFactorConfig struct {
	Required bool
	Issuer   string
}

// Deps are the collaborators a Handler needs.
type Deps struct {
	Site      *site.Site
	Models    *service.ModelService
	Logs      *service.LogService
	Auth      *auth.Authenticator
	Admins    *auth.Repository
	Sessions  *auth.Sessions
	Throttle  *auth.Throttle
	Renderer  *web.Renderer
	TwoFactor TwoFactorConfig
}

// Handler serves the portal.
type Handler struct {
	site      *site.Site
	models    *service.ModelService
	logs      *service.LogService
	auth      *auth.Authenticator
	admins    *auth.Repository
	sessions  *auth.Sessions
	throttle  *auth.Throttle
	render    *web.Renderer
	twoFactor TwoFactorConfig
}

// New wires the handler.
func New(d Deps) *Handler {
	return &Handler{
		site: d.Site, models: d.Models, logs: d.Logs,
		auth: d.Auth, admins: d.Admins, sessions: d.Sessions, throttle: d.Throttle,
		render: d.Renderer, twoFactor: d.TwoFactor,
	}
}

// Register mounts every route under the site's base path.
func (h *Handler) Register(r chi.Router) {
	base := h.site.BasePath

	r.Route(base, func(r chi.Router) {
		// chi serves the mount root for both "/admin" and "/admin/"; Django
		// redirects the former, and so do we, before any auth runs.
		r.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == base {
					http.Redirect(w, r, base+"/", http.StatusMovedPermanently)
					return
				}
				next.ServeHTTP(w, r)
			})
		})
		r.Handle("/static/*", web.StaticHandler(base+"/static/"))

		gate := auth.Gate{
			Sessions:         h.sessions,
			Repo:             h.admins,
			LoginPath:        base + "/login/",
			SetupPath:        base + "/two-factor/setup/",
			VerifyPath:       base + "/two-factor/verify/",
			RequireTwoFactor: h.twoFactor.Required,
		}

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireCSRF(h.sessions))

			r.Get("/login/", h.LoginForm)
			r.Post("/login/", h.Login)

			// Password-only stage: logout and the second-factor pages.
			r.Group(func(r chi.Router) {
				r.Use(gate.RequirePassword)
				r.Post("/logout/", h.Logout)
				r.Get("/two-factor/setup/", h.TwoFactorSetupForm)
				r.Post("/two-factor/setup/", h.TwoFactorSetup)
				r.Get("/two-factor/verify/", h.TwoFactorVerifyForm)
				r.Post("/two-factor/verify/", h.TwoFactorVerify)
			})

			// Fully authenticated stage: everything else.
			r.Group(func(r chi.Router) {
				r.Use(gate.RequirePassword, gate.RequireSecondFactor)

				r.Get("/", h.Index)
				r.Get("/two-factor/setup/for/{adminID}/", h.TwoFactorSetupForForm)
				r.Post("/two-factor/setup/for/{adminID}/", h.TwoFactorSetupFor)
				r.Get("/{app}/", h.AppIndex)

				r.Route("/{app}/{model}", func(r chi.Router) {
					r.Use(h.withModel)
					r.Get("/", h.ChangeList)
					r.Post("/", h.ChangeListAction)
					r.Get("/add/", h.AddForm)
					r.Post("/add/", h.Add)
					r.Get("/{key}/", h.redirectToChange)
					r.Get("/{key}/change/", h.ChangeForm)
					r.Post("/{key}/change/", h.Change)
					r.Get("/{key}/delete/", h.DeleteForm)
					r.Post("/{key}/delete/", h.Delete)
				})
			})
		})
	})
}

// NotFound mirrors Django's APPEND_SLASH: a GET whose path lacks the
// trailing slash is redirected when the slashed path resolves to a route
// (/admin → /admin/, /admin/app/users → /admin/app/users/); anything else
// is a plain 404. POSTs are never redirected — the body would be lost.
func (h *Handler) NotFound(mux *chi.Mux) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && !strings.HasSuffix(r.URL.Path, "/") {
			if mux.Match(chi.NewRouteContext(), r.Method, r.URL.Path+"/") {
				u := *r.URL
				u.Path += "/"
				http.Redirect(w, r, u.String(), http.StatusMovedPermanently)
				return
			}
		}
		h.notFound(w)
	}
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

// page builds the common template context.
func (h *Handler) page(w http.ResponseWriter, r *http.Request, title string, data any) *web.Page {
	return &web.Page{
		Site:      h.site,
		Title:     title,
		Admin:     auth.CurrentAdmin(r.Context()),
		Messages:  h.sessions.Flashes(w, r),
		CSRFField: auth.CSRFFieldName(),
		CSRFToken: h.sessions.CSRFToken(w, r),
		Data:      data,
	}
}

func (h *Handler) show(w http.ResponseWriter, r *http.Request, status int, tmpl string, p *web.Page) {
	if err := h.render.Render(w, status, tmpl, p); err != nil {
		h.serverError(w, r, err)
	}
}

func (h *Handler) serverError(w http.ResponseWriter, r *http.Request, err error) {
	common.Logger.Error("admin request failed",
		slog.Any("error", err),
		slog.String("path", r.URL.Path),
		slog.String("component", "admin.handler"))
	http.Error(w, "Server Error (500)", http.StatusInternalServerError)
}

func (h *Handler) notFound(w http.ResponseWriter) {
	http.Error(w, "Not Found (404)", http.StatusNotFound)
}

// modelCtxKey carries the resolved model through the request context.
type modelCtxKey struct{}

// withModel resolves {app}/{model} once for every model-scoped route.
func (h *Handler) withModel(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m, ok := h.site.Lookup(chi.URLParam(r, "app"), chi.URLParam(r, "model"))
		if !ok {
			h.notFound(w)
			return
		}
		next.ServeHTTP(w, r.WithContext(withModelCtx(r, m)))
	})
}

func (h *Handler) model(r *http.Request) *site.Model {
	m, _ := r.Context().Value(modelCtxKey{}).(*site.Model)
	return m
}

// keyParam decodes the {key} path segment for the current model.
func (h *Handler) keyParam(r *http.Request, m *site.Model) (repository.Key, error) {
	return repository.DecodeKey(m.Table, chi.URLParam(r, "key"))
}

func (h *Handler) redirectToChange(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	http.Redirect(w, r, m.ObjectURL(chi.URLParam(r, "key")), http.StatusFound)
}

// crumbs builds Home › App › Model › … breadcrumbs.
func (h *Handler) crumbs(m *site.Model, tail ...web.Crumb) []web.Crumb {
	out := []web.Crumb{{Title: "Home", URL: h.site.BasePath + "/"}}
	if m != nil {
		out = append(out,
			web.Crumb{Title: m.App.VerboseName, URL: m.App.URL() + "/"},
			web.Crumb{Title: site.Capfirst(m.Admin.VerboseNamePlural), URL: m.URL()},
		)
	}
	return append(out, tail...)
}

// changelistFilters is the query-string name Django uses to carry the
// changelist state through add/change pages, so "Save" returns the admin to
// the same filtered, sorted page they came from.
const changelistFilters = "_changelist_filters"

// preservedQuery extracts the changelist state from the request.
func preservedQuery(r *http.Request) string {
	return r.URL.Query().Get(changelistFilters)
}

// changelistURL returns the changelist URL with the preserved state applied.
func changelistURL(m *site.Model, preserved string) string {
	if preserved == "" {
		return m.URL()
	}
	return m.URL() + "?" + preserved
}

// withPreserved appends the preserved changelist state to a URL.
func withPreserved(u, preserved string) string {
	if preserved == "" {
		return u
	}
	return u + "?" + changelistFilters + "=" + url.QueryEscape(preserved)
}

func isNotFound(err error) bool { return errors.Is(err, service.ErrNotFound) }
