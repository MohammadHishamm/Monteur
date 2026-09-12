package schema

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
)

// Introspector reads table metadata from the PostgreSQL catalog.
type Introspector struct {
	db     *sql.DB
	schema string
}

// NewIntrospector returns an Introspector bound to the "public" schema.
func NewIntrospector(db *sql.DB) *Introspector {
	return &Introspector{db: db, schema: "public"}
}

// Table introspects a single table. It returns an error when the table does
// not exist so that a typo in the registry fails fast at startup rather than
// at first request.
func (in *Introspector) Table(ctx context.Context, name string) (*Table, error) {
	cols, err := in.columns(ctx, name)
	if err != nil {
		return nil, err
	}
	if len(cols) == 0 {
		return nil, fmt.Errorf("schema: table %q not found in schema %q", name, in.schema)
	}

	t := &Table{Name: name, Columns: cols}

	if t.PrimaryKey, err = in.primaryKey(ctx, name); err != nil {
		return nil, err
	}
	for _, pk := range t.PrimaryKey {
		if c := t.Column(pk); c != nil {
			c.IsPrimary = true
		}
	}

	fks, err := in.foreignKeys(ctx, name)
	if err != nil {
		return nil, err
	}
	for col, fk := range fks {
		if c := t.Column(col); c != nil {
			fk := fk
			c.FK = &fk
		}
	}

	choices, err := in.checkChoices(ctx, name)
	if err != nil {
		return nil, err
	}
	for col, vals := range choices {
		if c := t.Column(col); c != nil {
			c.Choices = vals
		}
	}

	return t, nil
}

func (in *Introspector) columns(ctx context.Context, table string) ([]Column, error) {
	const q = `
		SELECT column_name, udt_name, is_nullable, column_default,
		       COALESCE(character_maximum_length, 0)
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
		ORDER BY ordinal_position`

	rows, err := in.db.QueryContext(ctx, q, in.schema, table)
	if err != nil {
		return nil, fmt.Errorf("schema: columns of %s: %w", table, err)
	}
	defer rows.Close()

	var cols []Column
	for rows.Next() {
		var (
			c        Column
			nullable string
			def      sql.NullString
		)
		if err := rows.Scan(&c.Name, &c.UDT, &nullable, &def, &c.MaxLength); err != nil {
			return nil, err
		}
		c.Nullable = nullable == "YES"
		c.HasDefault = def.Valid
		c.Default = def.String
		c.Kind = kindOf(c.UDT)
		c.IsLongText = c.UDT == "text"
		cols = append(cols, c)
	}
	return cols, rows.Err()
}

func (in *Introspector) primaryKey(ctx context.Context, table string) ([]string, error) {
	const q = `
		SELECT kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
		  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'PRIMARY KEY'
		  AND tc.table_schema = $1 AND tc.table_name = $2
		ORDER BY kcu.ordinal_position`

	rows, err := in.db.QueryContext(ctx, q, in.schema, table)
	if err != nil {
		return nil, fmt.Errorf("schema: primary key of %s: %w", table, err)
	}
	defer rows.Close()

	var pk []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		pk = append(pk, name)
	}
	return pk, rows.Err()
}

func (in *Introspector) foreignKeys(ctx context.Context, table string) (map[string]ForeignKey, error) {
	// pg_constraint is used instead of information_schema.constraint_column_usage
	// because the latter silently mangles multi-column keys and is much slower.
	const q = `
		SELECT a.attname, c.confrelid::regclass::text, af.attname
		FROM pg_constraint c
		JOIN pg_attribute a  ON a.attrelid  = c.conrelid  AND a.attnum  = ANY (c.conkey)
		JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY (c.confkey)
		WHERE c.contype = 'f'
		  AND c.conrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass
		  AND array_length(c.conkey, 1) = 1`

	rows, err := in.db.QueryContext(ctx, q, in.schema, table)
	if err != nil {
		return nil, fmt.Errorf("schema: foreign keys of %s: %w", table, err)
	}
	defer rows.Close()

	out := map[string]ForeignKey{}
	for rows.Next() {
		var col, refTable, refCol string
		if err := rows.Scan(&col, &refTable, &refCol); err != nil {
			return nil, err
		}
		out[col] = ForeignKey{Table: strings.TrimPrefix(refTable, in.schema+"."), Column: refCol}
	}
	return out, rows.Err()
}

var (
	// Matches the column in `((status)::text = ANY (...))`.
	reCheckColumn = regexp.MustCompile(`\(?(\w+)\)?(?:::\w+)?\s*=\s*ANY\s*\($`)
	// Matches each quoted literal inside `ARRAY['a'::character varying, 'b'...]`.
	reCheckLiteral = regexp.MustCompile(`'((?:[^']|'')*)'`)
)

// checkChoices derives Django-style "choices" from single-column CHECK
// constraints of the form `col IN ('a', 'b', ...)`, which PostgreSQL stores as
// `(col)::text = ANY (ARRAY['a', 'b'])`. Anything else is ignored.
func (in *Introspector) checkChoices(ctx context.Context, table string) (map[string][]string, error) {
	const q = `
		SELECT pg_get_constraintdef(oid)
		FROM pg_constraint
		WHERE contype = 'c'
		  AND conrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass`

	rows, err := in.db.QueryContext(ctx, q, in.schema, table)
	if err != nil {
		return nil, fmt.Errorf("schema: check constraints of %s: %w", table, err)
	}
	defer rows.Close()

	out := map[string][]string{}
	for rows.Next() {
		var def string
		if err := rows.Scan(&def); err != nil {
			return nil, err
		}
		if col, vals, ok := parseChoiceConstraint(def); ok {
			out[col] = vals
		}
	}
	return out, rows.Err()
}

// parseChoiceConstraint extracts (column, literals) from a pg CHECK definition.
// Example input:
//
//	CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))
func parseChoiceConstraint(def string) (string, []string, bool) {
	start := strings.Index(def, "ARRAY[")
	if start < 0 {
		return "", nil, false
	}
	end := strings.Index(def[start:], "]")
	if end < 0 {
		return "", nil, false
	}

	// Everything before ARRAY[ ends with `= ANY ((` — strip the trailing
	// parens so the column regexp can anchor on `ANY ($`.
	head := strings.TrimRight(def[:start], "( ")
	m := reCheckColumn.FindStringSubmatch(head + "(")
	if m == nil {
		return "", nil, false
	}

	var vals []string
	for _, lit := range reCheckLiteral.FindAllStringSubmatch(def[start:start+end], -1) {
		vals = append(vals, strings.ReplaceAll(lit[1], "''", "'"))
	}
	if len(vals) == 0 {
		return "", nil, false
	}
	return m[1], vals, true
}

// kindOf maps a pg udt_name to a Kind.
func kindOf(udt string) Kind {
	switch udt {
	case "uuid":
		return KindUUID
	case "bool":
		return KindBool
	case "int2", "int4", "int8":
		return KindInt
	case "numeric", "float4", "float8", "money":
		return KindDecimal
	case "timestamp", "timestamptz":
		return KindTimestamp
	case "date":
		return KindDate
	case "json", "jsonb":
		return KindJSON
	case "_text", "_varchar":
		return KindTextArray
	case "text", "varchar", "bpchar", "char", "citext", "inet", "cidr":
		return KindText
	default:
		return KindUnknown
	}
}
