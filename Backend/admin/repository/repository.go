// Package repository is the data-access layer of the admin portal. It
// generates parameterised SQL from an introspected schema.Table, so one
// implementation serves every registered table.
//
// Identifiers are always quoted with pq.QuoteIdentifier and values are always
// bound as parameters; column names reaching this package have already been
// validated against the schema by the service layer.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/lib/pq"
)

// ErrNotFound is returned when a key matches no row.
var ErrNotFound = errors.New("repository: row not found")

// Op is a filter comparison operator.
type Op string

const (
	OpEq        Op = "="
	OpGte       Op = ">="
	OpLt        Op = "<"
	OpIsNull    Op = "IS NULL"
	OpIsNotNull Op = "IS NOT NULL"
)

// Filter is one WHERE predicate. Value is ignored for the null operators.
type Filter struct {
	Column string
	Op     Op
	Value  any
}

// ListQuery describes a changelist page.
type ListQuery struct {
	// Search terms are matched with ILIKE against SearchColumns (cast to
	// text). All terms must match; each term may match any column.
	Search        string
	SearchColumns []string
	Filters       []Filter
	// OrderBy entries are column names, "-" prefix for DESC.
	OrderBy []string
	Limit   int
	Offset  int
}

// Repository executes SQL against one database.
type Repository struct {
	db   querier // *sql.DB, or *sql.Tx inside InTx
	root *sql.DB // always the pool, used to begin transactions
}

// querier is what *sql.DB and *sql.Tx have in common.
type querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// New wraps a database handle.
func New(db *sql.DB) *Repository { return &Repository{db: db, root: db} }

// InTx runs fn with a Repository bound to one transaction, committing when
// fn returns nil and rolling back otherwise.
func (r *Repository) InTx(ctx context.Context, fn func(tx *Repository) error) error {
	tx, err := r.root.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("repository: begin: %w", err)
	}
	if err := fn(&Repository{db: tx, root: r.root}); err != nil {
		_ = tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("repository: commit: %w", err)
	}
	return nil
}

// List returns one page of rows.
func (r *Repository) List(ctx context.Context, t *schema.Table, q ListQuery) ([]Row, error) {
	where, args := buildWhere(q)

	var sb strings.Builder
	sb.WriteString("SELECT " + selectList(t) + " FROM " + ident(t.Name))
	sb.WriteString(where)
	sb.WriteString(buildOrder(t, q.OrderBy))
	if q.Limit > 0 {
		args = append(args, q.Limit)
		fmt.Fprintf(&sb, " LIMIT $%d", len(args))
	}
	if q.Offset > 0 {
		args = append(args, q.Offset)
		fmt.Fprintf(&sb, " OFFSET $%d", len(args))
	}

	rows, err := r.db.QueryContext(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("repository: list %s: %w", t.Name, err)
	}
	defer rows.Close()
	return collect(rows, t.Columns)
}

// Count returns the number of rows matching the query's search and filters.
func (r *Repository) Count(ctx context.Context, t *schema.Table, q ListQuery) (int, error) {
	where, args := buildWhere(q)
	var n int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM "+ident(t.Name)+where, args...).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("repository: count %s: %w", t.Name, err)
	}
	return n, nil
}

// Get returns a single row by key.
func (r *Repository) Get(ctx context.Context, t *schema.Table, key Key) (Row, error) {
	return r.get(ctx, t, key, "")
}

// GetForUpdate is Get with a row lock held until the enclosing InTx ends.
func (r *Repository) GetForUpdate(ctx context.Context, t *schema.Table, key Key) (Row, error) {
	return r.get(ctx, t, key, " FOR UPDATE")
}

func (r *Repository) get(ctx context.Context, t *schema.Table, key Key, suffix string) (Row, error) {
	where, args := keyPredicate(t, key, 0)
	rows, err := r.db.QueryContext(ctx, "SELECT "+selectList(t)+" FROM "+ident(t.Name)+" WHERE "+where+suffix, args...)
	if err != nil {
		return nil, fmt.Errorf("repository: get %s: %w", t.Name, err)
	}
	defer rows.Close()
	out, err := collect(rows, t.Columns)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, ErrNotFound
	}
	return out[0], nil
}

// GetMany returns the rows for the given keys (in no particular order).
func (r *Repository) GetMany(ctx context.Context, t *schema.Table, keys []Key) ([]Row, error) {
	if len(keys) == 0 {
		return nil, nil
	}
	where, args := keysPredicate(t, keys)
	rows, err := r.db.QueryContext(ctx, "SELECT "+selectList(t)+" FROM "+ident(t.Name)+" WHERE "+where, args...)
	if err != nil {
		return nil, fmt.Errorf("repository: get many %s: %w", t.Name, err)
	}
	defer rows.Close()
	return collect(rows, t.Columns)
}

// Insert creates a row from the given column values and returns the stored
// row (so database defaults such as generated UUIDs are visible). Columns
// absent from values are left to their defaults.
func (r *Repository) Insert(ctx context.Context, t *schema.Table, values map[string]any) (Row, error) {
	cols := make([]string, 0, len(values))
	args := make([]any, 0, len(values))
	placeholders := make([]string, 0, len(values))
	for _, c := range t.Columns { // iterate schema order for deterministic SQL
		v, ok := values[c.Name]
		if !ok {
			continue
		}
		cols = append(cols, ident(c.Name))
		args = append(args, bind(v))
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
	}

	var q string
	if len(cols) == 0 {
		q = "INSERT INTO " + ident(t.Name) + " DEFAULT VALUES RETURNING " + selectList(t)
	} else {
		q = "INSERT INTO " + ident(t.Name) + " (" + strings.Join(cols, ", ") + ") VALUES (" +
			strings.Join(placeholders, ", ") + ") RETURNING " + selectList(t)
	}

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("repository: insert %s: %w", t.Name, err)
	}
	defer rows.Close()
	out, err := collect(rows, t.Columns)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, errors.New("repository: insert returned no row")
	}
	return out[0], nil
}

// Update writes the given column values to the row identified by key and
// returns the stored row.
func (r *Repository) Update(ctx context.Context, t *schema.Table, key Key, values map[string]any) (Row, error) {
	sets := make([]string, 0, len(values))
	args := make([]any, 0, len(values)+len(key))
	for _, c := range t.Columns {
		v, ok := values[c.Name]
		if !ok {
			continue
		}
		args = append(args, bind(v))
		sets = append(sets, fmt.Sprintf("%s = $%d", ident(c.Name), len(args)))
	}
	if len(sets) == 0 {
		return r.Get(ctx, t, key)
	}

	where, whereArgs := keyPredicate(t, key, len(args))
	args = append(args, whereArgs...)
	q := "UPDATE " + ident(t.Name) + " SET " + strings.Join(sets, ", ") + " WHERE " + where + " RETURNING " + selectList(t)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("repository: update %s: %w", t.Name, err)
	}
	defer rows.Close()
	out, err := collect(rows, t.Columns)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, ErrNotFound
	}
	return out[0], nil
}

// Delete removes the rows identified by keys and reports how many went.
func (r *Repository) Delete(ctx context.Context, t *schema.Table, keys []Key) (int64, error) {
	if len(keys) == 0 {
		return 0, nil
	}
	where, args := keysPredicate(t, keys)
	res, err := r.db.ExecContext(ctx, "DELETE FROM "+ident(t.Name)+" WHERE "+where, args...)
	if err != nil {
		return 0, fmt.Errorf("repository: delete %s: %w", t.Name, err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// Distinct returns up to limit distinct non-null values of a column, sorted,
// for building filter sidebars.
func (r *Repository) Distinct(ctx context.Context, t *schema.Table, column string, limit int) ([]any, error) {
	q := fmt.Sprintf("SELECT DISTINCT %s FROM %s WHERE %s IS NOT NULL ORDER BY 1 LIMIT $1",
		ident(column), ident(t.Name), ident(column))
	rows, err := r.db.QueryContext(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("repository: distinct %s.%s: %w", t.Name, column, err)
	}
	defer rows.Close()

	var out []any
	for rows.Next() {
		var v any
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out = append(out, normalise(v))
	}
	return out, rows.Err()
}

// LookupRepr resolves foreign-key values to a display label in one query:
// SELECT keyCol, reprCol FROM table WHERE keyCol = ANY($1).
func (r *Repository) LookupRepr(ctx context.Context, table, keyCol, reprCol string, ids []string) (map[string]string, error) {
	if len(ids) == 0 {
		return map[string]string{}, nil
	}
	q := fmt.Sprintf("SELECT %s::text, %s::text FROM %s WHERE %s = ANY($1)",
		ident(keyCol), ident(reprCol), ident(table), ident(keyCol))
	rows, err := r.db.QueryContext(ctx, q, pq.Array(ids))
	if err != nil {
		return nil, fmt.Errorf("repository: lookup %s: %w", table, err)
	}
	defer rows.Close()

	out := make(map[string]string, len(ids))
	for rows.Next() {
		var k string
		var v sql.NullString
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v.String
	}
	return out, rows.Err()
}

// ─── SQL builders ────────────────────────────────────────────────────────────

func ident(name string) string { return pq.QuoteIdentifier(name) }

func selectList(t *schema.Table) string {
	parts := make([]string, len(t.Columns))
	for i, c := range t.Columns {
		parts[i] = ident(c.Name)
	}
	return strings.Join(parts, ", ")
}

func collect(rows *sql.Rows, cols []schema.Column) ([]Row, error) {
	var out []Row
	for rows.Next() {
		row, err := scanRow(rows, cols)
		if err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// bind converts normalised Go values into driver-friendly ones.
func bind(v any) any {
	if s, ok := v.([]string); ok {
		return pq.Array(s)
	}
	return v
}

func buildWhere(q ListQuery) (string, []any) {
	var preds []string
	var args []any

	for _, term := range strings.Fields(q.Search) {
		if len(q.SearchColumns) == 0 {
			break
		}
		args = append(args, "%"+escapeLike(term)+"%")
		n := len(args)
		ors := make([]string, len(q.SearchColumns))
		for i, c := range q.SearchColumns {
			ors[i] = fmt.Sprintf("%s::text ILIKE $%d", ident(c), n)
		}
		preds = append(preds, "("+strings.Join(ors, " OR ")+")")
	}

	for _, f := range q.Filters {
		switch f.Op {
		case OpIsNull, OpIsNotNull:
			preds = append(preds, fmt.Sprintf("%s %s", ident(f.Column), f.Op))
		default:
			args = append(args, bind(f.Value))
			preds = append(preds, fmt.Sprintf("%s %s $%d", ident(f.Column), f.Op, len(args)))
		}
	}

	if len(preds) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(preds, " AND "), args
}

func buildOrder(t *schema.Table, orderBy []string) string {
	parts := make([]string, 0, len(orderBy)+len(t.PrimaryKey))
	seen := map[string]bool{}
	for _, o := range orderBy {
		col, dir := strings.TrimPrefix(o, "-"), "ASC"
		if strings.HasPrefix(o, "-") {
			dir = "DESC"
		}
		parts = append(parts, ident(col)+" "+dir)
		seen[col] = true
	}
	// PK tiebreaker keeps pagination stable when the sort key has duplicates.
	for _, pk := range t.PrimaryKey {
		if !seen[pk] {
			parts = append(parts, ident(pk)+" ASC")
		}
	}
	return " ORDER BY " + strings.Join(parts, ", ")
}

// keyPredicate builds `pk1 = $n AND pk2 = $n+1` starting after offset args.
func keyPredicate(t *schema.Table, key Key, offset int) (string, []any) {
	parts := make([]string, len(t.PrimaryKey))
	args := make([]any, len(t.PrimaryKey))
	for i, pk := range t.PrimaryKey {
		args[i] = key[i]
		parts[i] = fmt.Sprintf("%s = $%d", ident(pk), offset+i+1)
	}
	return strings.Join(parts, " AND "), args
}

// keysPredicate builds an OR of keyPredicates, or a single `pk = ANY($1)`
// for the common single-column case.
func keysPredicate(t *schema.Table, keys []Key) (string, []any) {
	if len(t.PrimaryKey) == 1 {
		ids := make([]string, len(keys))
		for i, k := range keys {
			ids[i] = k[0]
		}
		return ident(t.PrimaryKey[0]) + " = ANY($1)", []any{pq.Array(ids)}
	}
	var parts []string
	var args []any
	for _, k := range keys {
		p, a := keyPredicate(t, k, len(args))
		parts = append(parts, "("+p+")")
		args = append(args, a...)
	}
	return strings.Join(parts, " OR "), args
}

func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}
