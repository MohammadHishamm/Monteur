// Package web embeds the portal's templates and static assets and renders
// pages. Each page template is parsed together with base.html into its own
// template set, giving Django-style template inheritance with html/template.
package web

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/site"
)

//go:embed templates/*.html
var templateFS embed.FS

//go:embed static/*
var staticFS embed.FS

// Crumb is one breadcrumb; an empty URL renders as plain text (current page).
type Crumb struct {
	Title string
	URL   string
}

// Page is the context every template receives. Data carries the
// page-specific view model.
type Page struct {
	Site        *site.Site
	Title       string
	Admin       *auth.Admin
	Messages    []auth.Flash
	CSRFField   string
	CSRFToken   string
	Breadcrumbs []Crumb
	BodyClass   string
	Data        any
}

// Renderer holds the parsed template sets.
type Renderer struct {
	pages map[string]*template.Template
}

// NewRenderer parses every page template against base.html at startup so a
// broken template fails the boot, not a request.
func NewRenderer() (*Renderer, error) {
	base, err := templateFS.ReadFile("templates/base.html")
	if err != nil {
		return nil, err
	}

	entries, err := fs.ReadDir(templateFS, "templates")
	if err != nil {
		return nil, err
	}

	r := &Renderer{pages: map[string]*template.Template{}}
	for _, e := range entries {
		name := e.Name()
		if name == "base.html" || !strings.HasSuffix(name, ".html") {
			continue
		}
		body, err := templateFS.ReadFile(path.Join("templates", name))
		if err != nil {
			return nil, err
		}
		t := template.New(name).Funcs(funcs)
		if _, err := t.Parse(string(base)); err != nil {
			return nil, fmt.Errorf("web: parse base for %s: %w", name, err)
		}
		if _, err := t.Parse(string(body)); err != nil {
			return nil, fmt.Errorf("web: parse %s: %w", name, err)
		}
		r.pages[strings.TrimSuffix(name, ".html")] = t
	}
	return r, nil
}

// Render writes the page. The template is executed into a buffer first so a
// runtime template error yields a clean 500 instead of a half-written page.
func (r *Renderer) Render(w http.ResponseWriter, status int, page string, data *Page) error {
	t, ok := r.pages[page]
	if !ok {
		return fmt.Errorf("web: unknown page %q", page)
	}
	var buf bytes.Buffer
	if err := t.ExecuteTemplate(&buf, "base", data); err != nil {
		return err
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "same-origin")
	// Django wraps every admin view in never_cache: data pages must always
	// be fetched fresh so the portal never shows a stale row.
	w.Header().Set("Cache-Control", "no-store, max-age=0")
	w.WriteHeader(status)
	_, err := buf.WriteTo(w)
	return err
}

// StaticHandler serves the embedded CSS/JS under the given URL prefix.
func StaticHandler(prefix string) http.Handler {
	sub, err := fs.Sub(staticFS, "static")
	if err != nil {
		panic(err)
	}
	return http.StripPrefix(prefix, http.FileServer(http.FS(sub)))
}

var funcs = template.FuncMap{
	"lower":    strings.ToLower,
	"capfirst": site.Capfirst,
}
