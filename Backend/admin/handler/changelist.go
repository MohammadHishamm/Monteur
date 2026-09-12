package handler

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/form"
	"github.com/OmarHosny18/APP-frontend/admin/repository"
	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/OmarHosny18/APP-frontend/admin/service"
	"github.com/OmarHosny18/APP-frontend/admin/site"
)

// Query-string parameters with special meaning on the changelist, matching
// Django's names: q = search, o = ordering, p = page.
const (
	paramSearch = "q"
	paramOrder  = "o"
	paramPage   = "p"
)

type clColumn struct {
	Label   string
	SortURL string
	Sorted  string // "asc", "desc" or ""
}

type clCell struct {
	Text   string
	Title  string
	Href   string
	Class  string
	IsBool bool
	Bool   bool
}

type clRow struct {
	Key   string
	Cells []clCell
}

type clFilterOption struct {
	Label    string
	URL      string
	Selected bool
}

type clFilter struct {
	Title   string
	Options []clFilterOption
}

type clPage struct {
	Number    int
	URL       string
	IsCurrent bool
	IsGap     bool
}

type changelistData struct {
	Slug              string
	VerboseName       string
	VerboseNamePlural string
	AddURL            string
	ActionURL         string
	CanAdd            bool
	CanChange         bool
	CanDelete         bool

	Columns []clColumn
	Rows    []clRow
	Total   int

	HasSearch         bool
	Search            string
	SearchFieldsLabel string
	ClearSearchURL    string
	HiddenParams      map[string]string

	Filters          []clFilter
	HasActiveFilters bool
	ClearFiltersURL  string

	NumPages int
	Pages    []clPage
	PrevURL  string
	NextURL  string

	PreservedQuery string
}

// ChangeList renders the paginated, searchable, filterable table.
func (h *Handler) ChangeList(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	query := r.URL.Query()

	params := service.ListParams{
		Search:  query.Get(paramSearch),
		Order:   query.Get(paramOrder),
		Filters: map[string]string{},
	}
	params.Page, _ = strconv.Atoi(query.Get(paramPage))
	for _, col := range m.Admin.ListFilter {
		if v := query.Get(col); v != "" {
			params.Filters[col] = v
		}
	}

	result, err := h.models.List(r.Context(), m, params)
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	specs, err := h.models.FilterSpecs(r.Context(), m)
	if err != nil {
		h.serverError(w, r, err)
		return
	}

	data := h.changelistView(m, query, params, result, specs)
	p := h.page(w, r, "Select "+m.Admin.VerboseName+" to change", data)
	p.Breadcrumbs = h.crumbs(m)
	p.Breadcrumbs[len(p.Breadcrumbs)-1].URL = "" // current page
	h.show(w, r, http.StatusOK, "change_list", p)
}

// ChangeListAction handles the bulk-action form. The only built-in action is
// delete_selected, which — like Django — shows a confirmation page first and
// performs the deletion when it is posted back with post=yes.
func (h *Handler) ChangeListAction(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	if r.PostFormValue("action") != "delete_selected" {
		h.sessions.AddFlash(w, r, "warning", "No action selected.")
		http.Redirect(w, r, m.URL(), http.StatusFound)
		return
	}
	if m.Admin.DisableDelete {
		http.Error(w, "Forbidden (403)", http.StatusForbidden)
		return
	}

	keys, err := selectedKeys(m, r.PostForm["_selected_action"])
	if err != nil || len(keys) == 0 {
		h.sessions.AddFlash(w, r, "warning", "Items must be selected in order to perform actions on them. No items have been changed.")
		http.Redirect(w, r, m.URL(), http.StatusFound)
		return
	}

	if r.PostFormValue("post") == "yes" {
		n, err := h.models.Delete(r.Context(), m, auth.CurrentAdmin(r.Context()), keys)
		if err != nil {
			h.serverError(w, r, err)
			return
		}
		h.sessions.AddFlash(w, r, "success", fmt.Sprintf("Successfully deleted %d %s.", n, pluralize(m, int(n))))
		http.Redirect(w, r, m.URL(), http.StatusFound)
		return
	}

	h.showDeleteConfirmation(w, r, m, keys, m.URL())
}

// ─── View-model construction ─────────────────────────────────────────────────

func (h *Handler) changelistView(m *site.Model, query url.Values, params service.ListParams,
	result *service.ListResult, specs []service.FilterSpec) changelistData {

	preserved := query.Encode()
	data := changelistData{
		Slug:              m.Name(),
		VerboseName:       m.Admin.VerboseName,
		VerboseNamePlural: m.Admin.VerboseNamePlural,
		AddURL:            m.AddURL(),
		ActionURL:         m.URL(),
		CanAdd:            !m.Admin.DisableAdd,
		CanChange:         !m.Admin.DisableChange,
		CanDelete:         !m.Admin.DisableDelete,
		Total:             result.Total,
		HasSearch:         len(m.Admin.SearchFields) > 0,
		Search:            params.Search,
		SearchFieldsLabel: strings.Join(m.Admin.SearchFields, ", "),
		NumPages:          result.NumPages,
		PreservedQuery:    preserved,
	}

	// Search form must re-submit the active filters/ordering as hidden inputs.
	data.HiddenParams = map[string]string{}
	for k, v := range query {
		if k != paramSearch && k != paramPage && len(v) > 0 {
			data.HiddenParams[k] = v[0]
		}
	}
	data.ClearSearchURL = m.URL() + queryWithout(query, paramSearch, paramPage)

	// Columns and sort links.
	for _, col := range m.Admin.ListDisplay {
		c := clColumn{Label: strings.ReplaceAll(col, "_", " ")}
		next := col
		switch result.Order {
		case col:
			c.Sorted, next = "asc", "-"+col
		case "-" + col:
			c.Sorted, next = "desc", col
		}
		c.SortURL = m.URL() + queryWith(query, map[string]string{paramOrder: next, paramPage: ""})
		data.Columns = append(data.Columns, c)
	}

	// Rows.
	for _, row := range result.Rows {
		key := repository.KeyOf(m.Table, row)
		rv := clRow{Key: key.Encode()}
		for _, col := range m.Admin.ListDisplay {
			c := m.Table.Column(col)
			cell := clCell{Text: form.Display(*c, row[col]), Title: repository.Stringify(row[col])}
			if m.IsSecret(col) {
				cell.Text, cell.Title = secretDisplay(row[col]), ""
			}
			switch {
			case m.IsLinkColumn(col):
				cell.Href = withPreserved(m.ObjectURL(rv.Key), preserved)
			case c.FK != nil:
				if label, ok := result.FKLabels[col][repository.Stringify(row[col])]; ok && label != "" {
					cell.Text = label
				}
				if related := h.models.RelatedModel(*c); related != nil && row[col] != nil {
					cell.Href = related.ObjectURL(url.PathEscape(repository.Stringify(row[col])))
				}
			case c.Kind == schema.KindBool && row[col] != nil:
				cell.IsBool, cell.Bool = true, row[col].(bool)
			}
			if c.Kind == schema.KindUUID {
				cell.Class = "mono"
			}
			rv.Cells = append(rv.Cells, cell)
		}
		data.Rows = append(data.Rows, rv)
	}

	// Filter sidebar.
	for _, spec := range specs {
		active := params.Filters[spec.Column]
		f := clFilter{Title: spec.Title}
		f.Options = append(f.Options, clFilterOption{
			Label:    "All",
			URL:      m.URL() + queryWith(query, map[string]string{spec.Column: "", paramPage: ""}),
			Selected: active == "",
		})
		for _, opt := range spec.Options {
			f.Options = append(f.Options, clFilterOption{
				Label:    opt.Label,
				URL:      m.URL() + queryWith(query, map[string]string{spec.Column: opt.Value, paramPage: ""}),
				Selected: active == opt.Value,
			})
		}
		if active != "" {
			data.HasActiveFilters = true
		}
		data.Filters = append(data.Filters, f)
	}
	data.ClearFiltersURL = m.URL() + queryWithout(query, append([]string{paramPage}, m.Admin.ListFilter...)...)

	// Pagination: Django shows 1 2 3 … 8 9 [10] 11 12 … 20 21 22.
	pageURL := func(n int) string {
		return m.URL() + queryWith(query, map[string]string{paramPage: strconv.Itoa(n)})
	}
	if result.Page > 1 {
		data.PrevURL = pageURL(result.Page - 1)
	}
	if result.Page < result.NumPages {
		data.NextURL = pageURL(result.Page + 1)
	}
	lastShown := 0
	for n := 1; n <= result.NumPages; n++ {
		nearCurrent := n >= result.Page-2 && n <= result.Page+2
		if n <= 3 || n > result.NumPages-3 || nearCurrent {
			if lastShown != 0 && n-lastShown > 1 {
				data.Pages = append(data.Pages, clPage{IsGap: true})
			}
			data.Pages = append(data.Pages, clPage{Number: n, URL: pageURL(n), IsCurrent: n == result.Page})
			lastShown = n
		}
	}
	return data
}

// queryWith clones the query, sets (or deletes, when empty) each override,
// and renders it with a leading "?" — or "" when nothing is left.
func queryWith(q url.Values, overrides map[string]string) string {
	out := url.Values{}
	for k, v := range q {
		if k != changelistFilters {
			out[k] = v
		}
	}
	for k, v := range overrides {
		if v == "" {
			out.Del(k)
		} else {
			out.Set(k, v)
		}
	}
	if len(out) == 0 {
		return ""
	}
	return "?" + out.Encode()
}

func queryWithout(q url.Values, keys ...string) string {
	overrides := make(map[string]string, len(keys))
	for _, k := range keys {
		overrides[k] = ""
	}
	return queryWith(q, overrides)
}

func selectedKeys(m *site.Model, raw []string) ([]repository.Key, error) {
	keys := make([]repository.Key, 0, len(raw))
	for _, s := range raw {
		k, err := repository.DecodeKey(m.Table, s)
		if err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func pluralize(m *site.Model, n int) string {
	if n == 1 {
		return m.Admin.VerboseName
	}
	return m.Admin.VerboseNamePlural
}
