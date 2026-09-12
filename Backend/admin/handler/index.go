package handler

import (
	"net/http"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/service"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/OmarHosny18/APP-frontend/admin/web"
	"github.com/go-chi/chi/v5"
)

type modelView struct {
	Slug      string
	Name      string
	URL       string
	AddURL    string
	CanAdd    bool
	CanChange bool
}

type appView struct {
	Label  string
	Name   string
	URL    string
	Models []modelView
}

type actionView struct {
	Repr     string
	Model    string
	URL      string
	CSSClass string
	When     string
}

type indexData struct {
	Apps          []appView
	RecentActions []actionView
}

// Index is the dashboard: every app with its models, plus recent actions.
func (h *Handler) Index(w http.ResponseWriter, r *http.Request) {
	admin := auth.CurrentAdmin(r.Context())

	entries, err := h.logs.Recent(r.Context(), admin.ID, 10)
	if err != nil {
		h.serverError(w, r, err)
		return
	}

	data := indexData{
		Apps:          h.appViews(h.site.Apps()),
		RecentActions: h.actionViews(entries),
	}
	p := h.page(w, r, h.site.IndexTitle, data)
	p.BodyClass = "dashboard"
	h.show(w, r, http.StatusOK, "index", p)
}

// AppIndex lists the models of one app.
func (h *Handler) AppIndex(w http.ResponseWriter, r *http.Request) {
	var app *site.App
	for _, a := range h.site.Apps() {
		if a.Label == chi.URLParam(r, "app") {
			app = a
		}
	}
	if app == nil {
		h.notFound(w)
		return
	}

	p := h.page(w, r, app.VerboseName+" administration", indexData{Apps: h.appViews([]*site.App{app})})
	p.Breadcrumbs = []web.Crumb{{Title: "Home", URL: h.site.BasePath + "/"}, {Title: app.VerboseName}}
	h.show(w, r, http.StatusOK, "app_index", p)
}

func (h *Handler) appViews(apps []*site.App) []appView {
	out := make([]appView, 0, len(apps))
	for _, a := range apps {
		av := appView{Label: a.Label, Name: a.VerboseName, URL: a.URL()}
		for _, m := range a.Models() {
			av.Models = append(av.Models, modelView{
				Slug:      m.Name(),
				Name:      m.Admin.VerboseNamePlural,
				URL:       m.URL(),
				AddURL:    m.AddURL(),
				CanAdd:    !m.Admin.DisableAdd,
				CanChange: !m.Admin.DisableChange,
			})
		}
		out = append(out, av)
	}
	return out
}

func (h *Handler) actionViews(entries []service.LogEntry) []actionView {
	out := make([]actionView, 0, len(entries))
	for _, e := range entries {
		v := actionView{
			Repr:  e.ObjectRepr,
			Model: e.Model,
			When:  e.CreatedAt.UTC().Format("Jan 2, 15:04"),
		}
		switch e.Action {
		case service.ActionAdd:
			v.CSSClass = "addlink"
		case service.ActionChange:
			v.CSSClass = "changelink"
		case service.ActionDelete:
			v.CSSClass = "deletelink"
		}
		// Deleted rows have nowhere to link to.
		if m, ok := h.site.Lookup(e.AppLabel, e.Model); ok && e.Action != service.ActionDelete {
			v.URL = m.ObjectURL(e.ObjectID)
		}
		out = append(out, v)
	}
	return out
}
