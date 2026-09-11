// Package site holds the declarative registry of the admin portal — the
// equivalent of Django's admin.site and ModelAdmin.
//
// A Site is a set of Apps; an App is a set of Models; a Model pairs a
// database table with a ModelAdmin describing how the portal should present
// it. The registry is pure configuration: it is populated at startup by the
// registry package and read by everything else.
package site

import (
	"fmt"
	"sort"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
)

// ModelAdmin is the per-table presentation config. Field names mirror
// Django's ModelAdmin so that anyone who has written app/admin.py feels at
// home. Every field is optional; zero values mean "sensible default".
type ModelAdmin struct {
	// VerboseName / VerboseNamePlural override the humanised table name.
	VerboseName       string
	VerboseNamePlural string

	// ListDisplay is the ordered list of columns shown in the changelist.
	// Defaults to the primary key plus the first few columns.
	ListDisplay []string
	// ListDisplayLinks names which ListDisplay columns link to the change
	// page. Defaults to the first ListDisplay column.
	ListDisplayLinks []string
	// SearchFields are searched with ILIKE, OR'd together, one term at a
	// time (Django semantics: every whitespace-separated term must match).
	SearchFields []string
	// ListFilter columns get a filter sidebar. Booleans, choice columns and
	// timestamps get purpose-built filters; everything else lists distinct values.
	ListFilter []string
	// Ordering is the default sort, "-col" for descending.
	Ordering []string
	// ListPerPage is the page size, default 100 (Django's default).
	ListPerPage int

	// Fields restricts and orders the columns shown on the add/change form.
	// Defaults to every column.
	Fields []string
	// Exclude removes columns from the form.
	Exclude []string
	// ReadonlyFields are shown on the form but never written.
	ReadonlyFields []string
	// PasswordFields are rendered as password inputs; a non-empty submitted
	// value is bcrypt-hashed before being written, an empty one keeps the
	// stored hash. This is how the portal edits password_hash columns safely.
	PasswordFields []string

	// ReprField is the column used as the human-readable label of a row
	// (Django's __str__). Defaults to the first text column, else the PK.
	ReprField string

	// Permissions. Zero value = allowed, matching "all tables full CRUD".
	DisableAdd    bool
	DisableChange bool
	DisableDelete bool
}

// Model is a registered table together with its introspected schema and
// resolved (defaults applied) admin config.
type Model struct {
	App   *App
	Table *schema.Table
	Admin ModelAdmin
}

// Name is the URL slug of the model — the table name.
func (m *Model) Name() string { return m.Table.Name }

// URL returns the changelist path, e.g. /admin/app/users/.
func (m *Model) URL() string { return fmt.Sprintf("%s/%s/", m.App.URL(), m.Name()) }

// AddURL returns the add-form path.
func (m *Model) AddURL() string { return m.URL() + "add/" }

// ObjectURL returns the change-form path for a row key.
func (m *Model) ObjectURL(key string) string { return m.URL() + key + "/change/" }

// DeleteURL returns the delete-confirmation path for a row key.
func (m *Model) DeleteURL(key string) string { return m.URL() + key + "/delete/" }

// FormColumns returns the columns rendered on the add/change form, honouring
// Fields, Exclude and the always-hidden password hash semantics.
func (m *Model) FormColumns() []schema.Column {
	names := m.Admin.Fields
	if len(names) == 0 {
		names = m.Table.ColumnNames()
	}
	excluded := toSet(m.Admin.Exclude)
	var out []schema.Column
	for _, n := range names {
		if excluded[n] {
			continue
		}
		if c := m.Table.Column(n); c != nil {
			out = append(out, *c)
		}
	}
	return out
}

// IsReadonly reports whether the column is display-only on the form.
func (m *Model) IsReadonly(col string) bool { return contains(m.Admin.ReadonlyFields, col) }

// IsPassword reports whether the column is a hashed password.
func (m *Model) IsPassword(col string) bool { return contains(m.Admin.PasswordFields, col) }

// IsLinkColumn reports whether a changelist column links to the change page.
func (m *Model) IsLinkColumn(col string) bool { return contains(m.Admin.ListDisplayLinks, col) }

// App groups models under a label, exactly like a Django app. The portal's
// URLs are /admin/<app>/<model>/.
type App struct {
	Label       string
	VerboseName string
	site        *Site
	models      map[string]*Model
}

// URL returns the app index path, e.g. /admin/app.
func (a *App) URL() string { return a.site.BasePath + "/" + a.Label }

// Models returns the app's models sorted by verbose name.
func (a *App) Models() []*Model {
	out := make([]*Model, 0, len(a.models))
	for _, m := range a.models {
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Admin.VerboseNamePlural < out[j].Admin.VerboseNamePlural
	})
	return out
}

// Model returns the model with the given slug or nil.
func (a *App) Model(name string) *Model { return a.models[name] }

// Site is the registry root.
type Site struct {
	// SiteTitle is the <title> suffix; SiteHeader is the big header text.
	SiteTitle  string
	SiteHeader string
	IndexTitle string
	// BasePath is the URL prefix every route is mounted under ("/admin").
	BasePath string

	apps map[string]*App
}

// New creates an empty site mounted at basePath.
func New(basePath string) *Site {
	return &Site{
		SiteTitle:  "Monteur admin",
		SiteHeader: "Monteur administration",
		IndexTitle: "Site administration",
		BasePath:   strings.TrimSuffix(basePath, "/"),
		apps:       map[string]*App{},
	}
}

// App returns (creating if needed) the app with the given label.
func (s *Site) App(label string) *App {
	if a, ok := s.apps[label]; ok {
		return a
	}
	a := &App{Label: label, VerboseName: Capfirst(humanize(label)), site: s, models: map[string]*Model{}}
	s.apps[label] = a
	return a
}

// Apps returns all apps sorted by label.
func (s *Site) Apps() []*App {
	out := make([]*App, 0, len(s.apps))
	for _, a := range s.apps {
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Label < out[j].Label })
	return out
}

// Register attaches a table to an app. The table must already be
// introspected; defaults are filled in here so the rest of the portal never
// has to special-case an empty ModelAdmin.
func (s *Site) Register(appLabel string, table *schema.Table, admin ModelAdmin) (*Model, error) {
	if err := validate(table, &admin); err != nil {
		return nil, fmt.Errorf("site: register %s: %w", table.Name, err)
	}
	applyDefaults(table, &admin)

	app := s.App(appLabel)
	if _, dup := app.models[table.Name]; dup {
		return nil, fmt.Errorf("site: %s already registered in app %s", table.Name, appLabel)
	}
	m := &Model{App: app, Table: table, Admin: admin}
	app.models[table.Name] = m
	return m, nil
}

// Lookup resolves an (app, model) pair from a URL.
func (s *Site) Lookup(appLabel, model string) (*Model, bool) {
	a, ok := s.apps[appLabel]
	if !ok {
		return nil, false
	}
	m, ok := a.models[model]
	return m, ok
}

// validate rejects references to columns that don't exist so misconfiguration
// surfaces at boot.
func validate(t *schema.Table, a *ModelAdmin) error {
	if len(t.PrimaryKey) == 0 {
		return fmt.Errorf("table has no primary key; the admin cannot address its rows")
	}
	lists := map[string][]string{
		"ListDisplay":    a.ListDisplay,
		"SearchFields":   a.SearchFields,
		"ListFilter":     a.ListFilter,
		"Fields":         a.Fields,
		"Exclude":        a.Exclude,
		"ReadonlyFields": a.ReadonlyFields,
		"PasswordFields": a.PasswordFields,
	}
	for label, cols := range lists {
		for _, c := range cols {
			if !t.HasColumn(c) {
				return fmt.Errorf("%s references unknown column %q", label, c)
			}
		}
	}
	for _, o := range a.Ordering {
		if !t.HasColumn(strings.TrimPrefix(o, "-")) {
			return fmt.Errorf("Ordering references unknown column %q", o)
		}
	}
	if a.ReprField != "" && !t.HasColumn(a.ReprField) {
		return fmt.Errorf("ReprField references unknown column %q", a.ReprField)
	}
	return nil
}

func applyDefaults(t *schema.Table, a *ModelAdmin) {
	// Like Django, verbose names are lowercase; templates capitalise where
	// the Django admin does ("Users" on the index, "4 users" in the paginator).
	if a.VerboseName == "" {
		a.VerboseName = humanize(singular(t.Name))
	}
	if a.VerboseNamePlural == "" {
		a.VerboseNamePlural = humanize(t.Name)
	}
	if len(a.ListDisplay) == 0 {
		// PK first, then up to four more columns — enough to recognise a row.
		a.ListDisplay = append([]string{}, t.PrimaryKey...)
		for _, c := range t.Columns {
			if len(a.ListDisplay) >= 5 {
				break
			}
			if !c.IsPrimary {
				a.ListDisplay = append(a.ListDisplay, c.Name)
			}
		}
	}
	if len(a.ListDisplayLinks) == 0 {
		a.ListDisplayLinks = []string{a.ListDisplay[0]}
	}
	if len(a.Ordering) == 0 {
		a.Ordering = defaultOrdering(t)
	}
	if a.ListPerPage <= 0 {
		a.ListPerPage = 100
	}
	if a.ReprField == "" {
		a.ReprField = defaultRepr(t)
	}
	if len(a.ReadonlyFields) == 0 {
		// Django never lets you edit an auto PK, and bookkeeping timestamps
		// are maintained by the database.
		for _, c := range t.Columns {
			if (c.IsPrimary && c.HasDefault) || c.Name == "created_at" || c.Name == "updated_at" {
				a.ReadonlyFields = append(a.ReadonlyFields, c.Name)
			}
		}
	}
	if len(a.PasswordFields) == 0 && t.HasColumn("password_hash") {
		a.PasswordFields = []string{"password_hash"}
	}
}

func defaultOrdering(t *schema.Table) []string {
	if t.HasColumn("created_at") {
		return []string{"-created_at"}
	}
	out := make([]string, len(t.PrimaryKey))
	for i, pk := range t.PrimaryKey {
		out[i] = "-" + pk
	}
	return out
}

func defaultRepr(t *schema.Table) string {
	for _, preferred := range []string{"email", "title", "name", "full_name", "subject"} {
		if t.HasColumn(preferred) {
			return preferred
		}
	}
	for _, c := range t.Columns {
		if c.Kind == schema.KindText && !c.IsPrimary {
			return c.Name
		}
	}
	return t.PrimaryKey[0]
}

// humanize turns "freelancer_showcases" into "freelancer showcases".
func humanize(s string) string {
	return strings.ReplaceAll(s, "_", " ")
}

// Capfirst upper-cases the first letter, Django's |capfirst filter.
func Capfirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// singular is a deliberately tiny English singulariser — good enough for the
// table names in this schema, and VerboseName can always override it.
func singular(s string) string {
	switch {
	case strings.HasSuffix(s, "ies"):
		return strings.TrimSuffix(s, "ies") + "y"
	case strings.HasSuffix(s, "sses"), strings.HasSuffix(s, "xes"),
		strings.HasSuffix(s, "shes"), strings.HasSuffix(s, "ches"):
		return strings.TrimSuffix(s, "es") // addresses, boxes, wishes, matches
	case strings.HasSuffix(s, "s"):
		return strings.TrimSuffix(s, "s") // showcases, users, entries handled above
	}
	return s
}

func toSet(xs []string) map[string]bool {
	m := make(map[string]bool, len(xs))
	for _, x := range xs {
		m[x] = true
	}
	return m
}

func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}
