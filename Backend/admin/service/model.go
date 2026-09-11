package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/auth"
	"github.com/OmarHosny18/APP-frontend/admin/form"
	"github.com/OmarHosny18/APP-frontend/admin/repository"
	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/OmarHosny18/APP-frontend/common"
)

// ErrNotFound is returned when a key matches no row.
var ErrNotFound = repository.ErrNotFound

// ValidationError carries per-field messages back to the form.
type ValidationError struct {
	Fields []form.FieldError
}

func (e *ValidationError) Error() string {
	msgs := make([]string, len(e.Fields))
	for i, f := range e.Fields {
		msgs[i] = f.Error()
	}
	return "validation failed: " + strings.Join(msgs, "; ")
}

// ForColumn returns the message for a column, or "".
func (e *ValidationError) ForColumn(col string) string {
	for _, f := range e.Fields {
		if f.Column == col {
			return f.Message
		}
	}
	return ""
}

// ModelService implements the changelist / add / change / delete use cases.
type ModelService struct {
	repo *repository.Repository
	site *site.Site
	log  *LogService
}

// NewModelService wires the service.
func NewModelService(repo *repository.Repository, s *site.Site, log *LogService) *ModelService {
	return &ModelService{repo: repo, site: s, log: log}
}

// ─── Changelist ──────────────────────────────────────────────────────────────

// ListParams are the changelist's query-string inputs.
type ListParams struct {
	Search  string
	Filters map[string]string // column → raw filter value, see applyFilter
	Order   string            // "col" or "-col"; empty means the model default
	Page    int               // 1-based
}

// ListResult is one changelist page.
type ListResult struct {
	Rows     []repository.Row
	Total    int
	Page     int
	NumPages int
	PerPage  int
	Order    string
	// FKLabels maps column → foreign id → label of the referenced row, so
	// the changelist can show "alice@example.com" instead of a bare UUID.
	FKLabels map[string]map[string]string
}

// List runs the changelist query.
func (s *ModelService) List(ctx context.Context, m *site.Model, p ListParams) (*ListResult, error) {
	q := repository.ListQuery{
		Search:        p.Search,
		SearchColumns: m.Admin.SearchFields,
		Limit:         m.Admin.ListPerPage,
	}

	for col, raw := range p.Filters {
		c := m.Table.Column(col)
		if c == nil || raw == "" {
			continue
		}
		q.Filters = append(q.Filters, filtersFor(*c, raw)...)
	}

	order := p.Order
	if order == "" || !m.Table.HasColumn(strings.TrimPrefix(order, "-")) {
		order = ""
		q.OrderBy = m.Admin.Ordering
	} else {
		q.OrderBy = []string{order}
	}

	total, err := s.repo.Count(ctx, m.Table, q)
	if err != nil {
		return nil, err
	}

	numPages := (total + q.Limit - 1) / q.Limit
	if numPages == 0 {
		numPages = 1
	}
	page := p.Page
	if page < 1 {
		page = 1
	}
	if page > numPages {
		page = numPages
	}
	q.Offset = (page - 1) * q.Limit

	rows, err := s.repo.List(ctx, m.Table, q)
	if err != nil {
		return nil, err
	}

	labels, err := s.foreignLabels(ctx, m, rows, m.Admin.ListDisplay)
	if err != nil {
		return nil, err
	}

	return &ListResult{
		Rows:     rows,
		Total:    total,
		Page:     page,
		NumPages: numPages,
		PerPage:  q.Limit,
		Order:    order,
		FKLabels: labels,
	}, nil
}

// Date-filter values understood for timestamp/date columns.
const (
	DateAnyTime  = ""
	DateToday    = "today"
	DatePast7    = "past_7_days"
	DateMonth    = "this_month"
	DateYear     = "this_year"
	FilterIsNull = "__null__"
)

// filtersFor translates a raw query-string value into repository predicates
// according to the column kind — the counterpart of Django's list filters.
func filtersFor(c schema.Column, raw string) []repository.Filter {
	if raw == FilterIsNull {
		return []repository.Filter{{Column: c.Name, Op: repository.OpIsNull}}
	}

	switch c.Kind {
	case schema.KindBool:
		return []repository.Filter{{Column: c.Name, Op: repository.OpEq, Value: raw == "1" || raw == "true"}}

	case schema.KindTimestamp, schema.KindDate:
		now := time.Now().UTC()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		var from, to time.Time
		switch raw {
		case DateToday:
			from, to = today, today.AddDate(0, 0, 1)
		case DatePast7:
			from, to = today.AddDate(0, 0, -6), today.AddDate(0, 0, 1)
		case DateMonth:
			from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
			to = from.AddDate(0, 1, 0)
		case DateYear:
			from = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
			to = from.AddDate(1, 0, 0)
		default:
			return nil
		}
		return []repository.Filter{
			{Column: c.Name, Op: repository.OpGte, Value: from},
			{Column: c.Name, Op: repository.OpLt, Value: to},
		}

	default:
		return []repository.Filter{{Column: c.Name, Op: repository.OpEq, Value: raw}}
	}
}

// FilterOption is one entry in a filter sidebar section.
type FilterOption struct {
	Label string
	Value string
}

// FilterSpec is one filter sidebar section.
type FilterSpec struct {
	Column  string
	Title   string
	Options []FilterOption
}

// FilterSpecs builds the sidebar for a model. Distinct-value filters are
// capped so a column with thousands of values does not explode the page.
func (s *ModelService) FilterSpecs(ctx context.Context, m *site.Model) ([]FilterSpec, error) {
	const maxDistinct = 50

	var specs []FilterSpec
	for _, name := range m.Admin.ListFilter {
		c := m.Table.Column(name)
		if c == nil {
			continue
		}
		spec := FilterSpec{Column: c.Name, Title: strings.ReplaceAll(c.Name, "_", " ")}

		switch {
		case c.Kind == schema.KindBool:
			spec.Options = []FilterOption{{"Yes", "1"}, {"No", "0"}}
		case c.Kind.IsTemporal():
			spec.Options = []FilterOption{
				{"Today", DateToday}, {"Past 7 days", DatePast7},
				{"This month", DateMonth}, {"This year", DateYear},
			}
		case len(c.Choices) > 0:
			for _, ch := range c.Choices {
				spec.Options = append(spec.Options, FilterOption{ch, ch})
			}
		default:
			vals, err := s.repo.Distinct(ctx, m.Table, c.Name, maxDistinct)
			if err != nil {
				return nil, err
			}
			for _, v := range vals {
				str := repository.Stringify(v)
				if str == "" {
					continue // an empty string cannot round-trip through a query parameter
				}
				spec.Options = append(spec.Options, FilterOption{form.Display(*c, v), str})
			}
		}
		if c.Nullable {
			spec.Options = append(spec.Options, FilterOption{"Unknown", FilterIsNull})
		}
		specs = append(specs, spec)
	}
	return specs, nil
}

// foreignLabels resolves the labels of every FK value appearing in the
// given columns of rows, one query per referenced table.
func (s *ModelService) foreignLabels(ctx context.Context, m *site.Model, rows []repository.Row, cols []string) (map[string]map[string]string, error) {
	out := map[string]map[string]string{}
	for _, name := range cols {
		c := m.Table.Column(name)
		if c == nil || c.FK == nil {
			continue
		}
		target := s.findModel(c.FK.Table)
		if target == nil {
			continue // referenced table is not registered; show the raw id
		}

		seen := map[string]bool{}
		var ids []string
		for _, r := range rows {
			if id := repository.Stringify(r[name]); id != "" && !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
		labels, err := s.repo.LookupRepr(ctx, c.FK.Table, c.FK.Column, target.Admin.ReprField, ids)
		if err != nil {
			return nil, err
		}
		out[name] = labels
	}
	return out, nil
}

// findModel locates a registered model by table name across all apps.
func (s *ModelService) findModel(table string) *site.Model {
	for _, app := range s.site.Apps() {
		if m := app.Model(table); m != nil {
			return m
		}
	}
	return nil
}

// RelatedModel returns the registered model a FK column points at, or nil.
func (s *ModelService) RelatedModel(c schema.Column) *site.Model {
	if c.FK == nil {
		return nil
	}
	return s.findModel(c.FK.Table)
}

// ─── Single objects ──────────────────────────────────────────────────────────

// Get loads one row.
func (s *ModelService) Get(ctx context.Context, m *site.Model, key repository.Key) (repository.Row, error) {
	return s.repo.Get(ctx, m.Table, key)
}

// GetMany loads several rows (for the delete confirmation page).
func (s *ModelService) GetMany(ctx context.Context, m *site.Model, keys []repository.Key) ([]repository.Row, error) {
	return s.repo.GetMany(ctx, m.Table, keys)
}

// Repr is the human label of a row, Django's __str__.
func (s *ModelService) Repr(m *site.Model, row repository.Row) string {
	if v := repository.Stringify(row[m.Admin.ReprField]); v != "" {
		return v
	}
	return repository.KeyOf(m.Table, row).String()
}

// Create validates the submitted form and inserts a row.
func (s *ModelService) Create(ctx context.Context, m *site.Model, admin *auth.Admin, values url.Values) (repository.Row, error) {
	if m.Admin.DisableAdd {
		return nil, errors.New("service: adding is disabled for this model")
	}
	data, err := s.bind(m, values, form.ModeAdd)
	if err != nil {
		return nil, err
	}
	row, err := s.repo.Insert(ctx, m.Table, data)
	if err != nil {
		return nil, err
	}
	s.record(ctx, admin, ActionAdd, m, row, "")
	return row, nil
}

// Update validates the submitted form and writes the row.
func (s *ModelService) Update(ctx context.Context, m *site.Model, admin *auth.Admin, key repository.Key, values url.Values) (repository.Row, error) {
	if m.Admin.DisableChange {
		return nil, errors.New("service: changing is disabled for this model")
	}
	data, err := s.bind(m, values, form.ModeChange)
	if err != nil {
		return nil, err
	}

	// Only write what actually changed: the audit message stays meaningful
	// and an untouched form never clobbers a concurrent update.
	current, err := s.repo.Get(ctx, m.Table, key)
	if err != nil {
		return nil, err
	}
	changed := make([]string, 0, len(data))
	for _, c := range m.Table.Columns {
		v, ok := data[c.Name]
		if !ok {
			continue
		}
		if m.IsPassword(c.Name) || !valuesEqual(c, current[c.Name], v) {
			changed = append(changed, c.Name)
		} else {
			delete(data, c.Name)
		}
	}
	if len(changed) == 0 {
		s.record(ctx, admin, ActionChange, m, current, "No fields changed.")
		return current, nil
	}

	// Keep the bookkeeping column honest even though it is readonly on the form.
	if _, edited := data["updated_at"]; !edited && m.Table.HasColumn("updated_at") {
		data["updated_at"] = time.Now().UTC()
	}

	row, err := s.repo.Update(ctx, m.Table, key, data)
	if err != nil {
		return nil, err
	}
	s.record(ctx, admin, ActionChange, m, row, "Changed "+strings.Join(changed, ", ")+".")
	return row, nil
}

// valuesEqual compares a stored value with a freshly coerced one, tolerant of
// the representation differences between the two (numeric strings, JSON
// whitespace, timestamp locations).
func valuesEqual(c schema.Column, stored, posted any) bool {
	if stored == nil || posted == nil {
		return stored == nil && posted == nil
	}
	switch c.Kind {
	case schema.KindTimestamp, schema.KindDate:
		// The datetime-local widget carries seconds at most, so a stored
		// microsecond fraction must not count as a change.
		a, aok := stored.(time.Time)
		b, bok := posted.(time.Time)
		return aok && bok && a.Truncate(time.Second).Equal(b.Truncate(time.Second))
	case schema.KindJSON:
		return compactJSON(repository.Stringify(stored)) == compactJSON(repository.Stringify(posted))
	case schema.KindDecimal:
		a, aerr := strconv.ParseFloat(repository.Stringify(stored), 64)
		b, berr := strconv.ParseFloat(repository.Stringify(posted), 64)
		return aerr == nil && berr == nil && a == b
	default:
		return repository.Stringify(stored) == repository.Stringify(posted)
	}
}

func compactJSON(s string) string {
	var buf bytes.Buffer
	if err := json.Compact(&buf, []byte(s)); err != nil {
		return s
	}
	return buf.String()
}

// Delete removes rows and logs each one.
func (s *ModelService) Delete(ctx context.Context, m *site.Model, admin *auth.Admin, keys []repository.Key) (int64, error) {
	if m.Admin.DisableDelete {
		return 0, errors.New("service: deleting is disabled for this model")
	}
	rows, err := s.repo.GetMany(ctx, m.Table, keys)
	if err != nil {
		return 0, err
	}
	n, err := s.repo.Delete(ctx, m.Table, keys)
	if err != nil {
		return 0, err
	}
	for _, r := range rows {
		s.record(ctx, admin, ActionDelete, m, r, "")
	}
	return n, nil
}

// bind runs every editable column through form.Coerce and hashes password
// fields. It returns a ValidationError when any field is invalid.
func (s *ModelService) bind(m *site.Model, values url.Values, mode form.Mode) (map[string]any, error) {
	data := map[string]any{}
	var verr ValidationError

	for _, c := range m.FormColumns() {
		if m.IsReadonly(c.Name) {
			continue
		}
		raw, present := values[c.Name]
		var first string
		if present && len(raw) > 0 {
			first = raw[0]
		}

		if m.IsPassword(c.Name) {
			if strings.TrimSpace(first) == "" {
				if mode == form.ModeAdd && !c.Nullable && !c.HasDefault {
					verr.Fields = append(verr.Fields, form.FieldError{Column: c.Name, Message: "This field is required."})
				}
				continue // on change, blank keeps the existing hash
			}
			hash, err := common.HashPassword(first)
			if err != nil {
				return nil, err
			}
			data[c.Name] = hash
			continue
		}

		v, err := form.Coerce(c, first, present, mode)
		switch {
		case errors.Is(err, form.ErrSkip):
			continue
		case err != nil:
			var fe form.FieldError
			if errors.As(err, &fe) {
				verr.Fields = append(verr.Fields, fe)
				continue
			}
			return nil, err
		}
		data[c.Name] = v
	}

	if len(verr.Fields) > 0 {
		return nil, &verr
	}
	return data, nil
}

// record writes an audit entry; failures are logged, never surfaced, because
// the data change itself has already succeeded.
func (s *ModelService) record(ctx context.Context, admin *auth.Admin, action Action, m *site.Model, row repository.Row, msg string) {
	// The encoded form is stored so the index page can link straight back to
	// the object, composite keys included.
	key := repository.KeyOf(m.Table, row).Encode()
	if err := s.log.Record(ctx, admin, action, m.App.Label, m.Name(), key, s.Repr(m, row), msg); err != nil {
		common.Logger.Error("failed to write admin log",
			slog.Any("error", err),
			slog.String("model", m.Name()),
			slog.String("component", "admin.service"),
			slog.String("method", "record"))
	}
}
