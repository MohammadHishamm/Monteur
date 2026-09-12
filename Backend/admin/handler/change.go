package handler

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/form"
	"github.com/OmarHosny18/APP-frontend/admin/repository"
	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/OmarHosny18/APP-frontend/admin/service"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/OmarHosny18/APP-frontend/admin/web"
	"github.com/lib/pq"
)

type formField struct {
	Name         string
	Label        string
	Widget       form.Widget
	Value        string
	Display      string
	Checked      bool
	Choices      []string
	Required     bool
	Readonly     bool
	MaxLength    int
	CSSClass     string
	Help         string
	Error        string
	RelatedURL   string
	RelatedLabel string
	RelatedRepr  string
}

type changeFormData struct {
	Slug        string
	VerboseName string
	IsAdd       bool
	Fields      []formField
	Errors      []string
	FormError   string
	DeleteURL   string
	HistoryURL  string
	CanAdd      bool
	CanChange   bool
	CanDelete   bool
}

// AddForm renders an empty form.
func (h *Handler) AddForm(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	if m.Admin.DisableAdd {
		http.Error(w, "Forbidden (403)", http.StatusForbidden)
		return
	}
	h.showForm(w, r, m, nil, nil, nil, "")
}

// Add creates a row from the posted form.
func (h *Handler) Add(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	if m.Admin.DisableAdd {
		http.Error(w, "Forbidden (403)", http.StatusForbidden)
		return
	}

	row, err := h.models.Create(r.Context(), m, auth.CurrentAdmin(r.Context()), r.PostForm)
	if err != nil {
		h.showForm(w, r, m, nil, r.PostForm, err, "")
		return
	}

	repr := h.models.Repr(m, row)
	h.sessions.AddFlash(w, r, "success", fmt.Sprintf("The %s “%s” was added successfully.", m.Admin.VerboseName, repr))
	h.redirectAfterSave(w, r, m, row)
}

// ChangeForm renders the form pre-filled with a row.
func (h *Handler) ChangeForm(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	key, err := h.keyParam(r, m)
	if err != nil {
		h.notFound(w)
		return
	}
	row, err := h.models.Get(r.Context(), m, key)
	if isNotFound(err) {
		h.notFound(w)
		return
	}
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	h.showForm(w, r, m, row, nil, nil, key.Encode())
}

// Change writes the posted form to the row.
func (h *Handler) Change(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	if m.Admin.DisableChange {
		http.Error(w, "Forbidden (403)", http.StatusForbidden)
		return
	}
	key, err := h.keyParam(r, m)
	if err != nil {
		h.notFound(w)
		return
	}

	row, err := h.models.Update(r.Context(), m, auth.CurrentAdmin(r.Context()), key, r.PostForm)
	if isNotFound(err) {
		h.notFound(w)
		return
	}
	if err != nil {
		// Re-render with the stored row for readonly fields and the posted
		// values for everything else.
		stored, getErr := h.models.Get(r.Context(), m, key)
		if getErr != nil {
			h.serverError(w, r, getErr)
			return
		}
		h.showForm(w, r, m, stored, r.PostForm, err, key.Encode())
		return
	}

	repr := h.models.Repr(m, row)
	h.sessions.AddFlash(w, r, "success", fmt.Sprintf("The %s “%s” was changed successfully.", m.Admin.VerboseName, repr))
	h.redirectAfterSave(w, r, m, row)
}

// DeleteForm asks for confirmation.
func (h *Handler) DeleteForm(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	if m.Admin.DisableDelete {
		http.Error(w, "Forbidden (403)", http.StatusForbidden)
		return
	}
	key, err := h.keyParam(r, m)
	if err != nil {
		h.notFound(w)
		return
	}
	h.showDeleteConfirmation(w, r, m, []repository.Key{key}, m.DeleteURL(key.Encode()))
}

// Delete removes one row.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	m := h.model(r)
	if m.Admin.DisableDelete {
		http.Error(w, "Forbidden (403)", http.StatusForbidden)
		return
	}
	key, err := h.keyParam(r, m)
	if err != nil {
		h.notFound(w)
		return
	}
	rows, err := h.models.GetMany(r.Context(), m, []repository.Key{key})
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	if len(rows) == 0 {
		h.notFound(w)
		return
	}
	repr := h.models.Repr(m, rows[0])

	n, err := h.models.Delete(r.Context(), m, auth.CurrentAdmin(r.Context()), []repository.Key{key})
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	if n == 0 {
		h.notFound(w) // deleted by someone else between the confirmation page and this POST
		return
	}
	h.sessions.AddFlash(w, r, "success", fmt.Sprintf("The %s “%s” was deleted successfully.", m.Admin.VerboseName, repr))
	http.Redirect(w, r, changelistURL(m, preservedQuery(r)), http.StatusFound)
}

// ─── Shared form plumbing ────────────────────────────────────────────────────

type deleteObject struct {
	Key  string
	Repr string
	URL  string
}

type deleteData struct {
	VerboseName       string
	VerboseNamePlural string
	Objects           []deleteObject
	ActionURL         string
	CancelURL         string
}

func (h *Handler) showDeleteConfirmation(w http.ResponseWriter, r *http.Request, m *site.Model, keys []repository.Key, actionURL string) {
	rows, err := h.models.GetMany(r.Context(), m, keys)
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	if len(rows) == 0 {
		h.notFound(w)
		return
	}

	data := deleteData{
		VerboseName:       m.Admin.VerboseName,
		VerboseNamePlural: m.Admin.VerboseNamePlural,
		ActionURL:         actionURL,
		CancelURL:         m.URL(),
	}
	for _, row := range rows {
		key := repository.KeyOf(m.Table, row).Encode()
		data.Objects = append(data.Objects, deleteObject{Key: key, Repr: h.models.Repr(m, row), URL: m.ObjectURL(key)})
	}

	p := h.page(w, r, "Are you sure?", data)
	p.Breadcrumbs = h.crumbs(m, web.Crumb{Title: "Delete"})
	h.show(w, r, http.StatusOK, "delete_confirmation", p)
}

// showForm renders the add/change page. row is the stored row (nil on add),
// posted holds submitted values to echo back after a validation failure, and
// err is the failure to display.
func (h *Handler) showForm(w http.ResponseWriter, r *http.Request, m *site.Model, row repository.Row, posted url.Values, err error, key string) {
	isAdd := row == nil
	data := changeFormData{
		Slug:        m.Name(),
		VerboseName: m.Admin.VerboseName,
		IsAdd:       isAdd,
		HistoryURL:  changelistURL(m, preservedQuery(r)),
		CanAdd:      !m.Admin.DisableAdd,
		CanChange:   !m.Admin.DisableChange,
		CanDelete:   !m.Admin.DisableDelete,
	}
	if !isAdd {
		data.DeleteURL = withPreserved(m.DeleteURL(key), preservedQuery(r))
	}

	var verr *service.ValidationError
	if err != nil && !errors.As(err, &verr) {
		data.FormError = friendlyDBError(err)
	}

	for _, c := range m.FormColumns() {
		f := h.field(m, c, row, posted, isAdd)
		if verr != nil {
			if msg := verr.ForColumn(c.Name); msg != "" {
				f.Error = msg
				data.Errors = append(data.Errors, msg)
			}
		}
		data.Fields = append(data.Fields, f)
	}

	title := "Add " + m.Admin.VerboseName
	tail := web.Crumb{Title: "Add " + m.Admin.VerboseName}
	if !isAdd {
		title = "Change " + m.Admin.VerboseName
		tail = web.Crumb{Title: h.models.Repr(m, row)}
	}
	status := http.StatusOK
	if err != nil {
		status = http.StatusBadRequest
	}
	p := h.page(w, r, title, data)
	p.Breadcrumbs = h.crumbs(m, tail)
	h.show(w, r, status, "change_form", p)
}

func (h *Handler) field(m *site.Model, c schema.Column, row repository.Row, posted url.Values, isAdd bool) formField {
	f := formField{
		Name:      c.Name,
		Label:     labelFor(c.Name),
		Widget:    form.WidgetFor(c, m.IsPassword(c.Name)),
		Choices:   c.Choices,
		Required:  !c.Nullable && !c.HasDefault && c.Kind != schema.KindBool,
		Readonly:  m.IsReadonly(c.Name),
		MaxLength: c.MaxLength,
		CSSClass:  cssClassFor(c),
	}
	if c.Kind == schema.KindText && !c.Nullable {
		f.Required = false // empty string is a valid value
	}

	var stored any
	if row != nil {
		stored = row[c.Name]
	}

	// Posted values win (re-rendering after a validation error), otherwise
	// the stored value; readonly fields always show what is stored.
	switch {
	case f.Readonly:
		f.Display = form.Display(c, stored)
		f.Value = form.InputValue(c, stored)
		if isAdd {
			f.Display = "(auto)"
		}
	case posted != nil:
		f.Value = posted.Get(c.Name)
		f.Checked = posted.Has(c.Name)
	default:
		f.Value = form.InputValue(c, stored)
		if b, ok := stored.(bool); ok {
			f.Checked = b
		}
	}
	if f.Widget == form.WidgetPassword {
		f.Value = ""
	}
	if m.IsSecret(c.Name) {
		f.Widget = form.WidgetSecret
		f.Value = ""
		f.Display = secretDisplay(stored)
		f.Readonly = isAdd // nothing to clear on a new row
		if isAdd {
			f.Display = "Not set"
		}
	}

	switch f.Widget {
	case form.WidgetArray:
		f.Help = "One item per line."
	case form.WidgetJSON:
		f.Help = "Must be valid JSON."
	case form.WidgetDateTime:
		f.Help = "UTC."
	}
	if c.HasDefault && isAdd && !f.Readonly {
		f.Help = joinHelp(f.Help, "Leave blank for the database default: "+c.Default)
	}

	if related := h.models.RelatedModel(c); related != nil {
		f.RelatedLabel = related.Admin.VerboseNamePlural
		f.RelatedURL = related.URL()
		if id := repository.Stringify(stored); id != "" {
			f.RelatedURL = related.ObjectURL(url.PathEscape(id))
			f.RelatedRepr = "Open " + related.Admin.VerboseName
		}
	}
	return f
}

// redirectAfterSave honours Django's three save buttons.
func (h *Handler) redirectAfterSave(w http.ResponseWriter, r *http.Request, m *site.Model, row repository.Row) {
	preserved := preservedQuery(r)
	key := repository.KeyOf(m.Table, row).Encode()
	switch {
	case r.PostForm.Has("_continue"):
		http.Redirect(w, r, withPreserved(m.ObjectURL(key), preserved), http.StatusFound)
	case r.PostForm.Has("_addanother"):
		http.Redirect(w, r, withPreserved(m.AddURL(), preserved), http.StatusFound)
	default:
		http.Redirect(w, r, changelistURL(m, preserved), http.StatusFound)
	}
}

func secretDisplay(v any) string {
	if v == nil || v == "" {
		return "Not set"
	}
	return "Set"
}

func labelFor(col string) string {
	s := make([]rune, 0, len(col))
	for i, r := range col {
		if r == '_' {
			r = ' '
		}
		if i == 0 && r >= 'a' && r <= 'z' {
			r -= 'a' - 'A'
		}
		s = append(s, r)
	}
	return string(s)
}

func cssClassFor(c schema.Column) string {
	switch c.Kind {
	case schema.KindUUID:
		return "vUUIDField"
	case schema.KindInt:
		return "vIntegerField"
	case schema.KindDecimal:
		return "vDecimalField"
	default:
		return "vTextField"
	}
}

func joinHelp(a, b string) string {
	if a == "" {
		return b
	}
	return a + " " + b
}

// friendlyDBError turns the most common PostgreSQL constraint failures into
// the messages an admin expects to read on a form.
func friendlyDBError(err error) string {
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) {
		return err.Error()
	}
	switch pqErr.Code {
	case "23505": // unique_violation
		return "A row with these values already exists: " + pqErr.Detail
	case "23503": // foreign_key_violation
		return "Referenced row does not exist: " + pqErr.Detail
	case "23514": // check_violation
		return "Value rejected by constraint " + pqErr.Constraint + "."
	case "23502": // not_null_violation
		return "Column " + pqErr.Column + " cannot be empty."
	case "22003": // numeric_value_out_of_range
		return "Value out of range: " + pqErr.Detail
	case "22P02", "22007", "22008": // invalid_text_representation, invalid datetime
		return "Invalid value: " + pqErr.Message
	default:
		return pqErr.Message
	}
}
