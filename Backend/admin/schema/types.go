// Package schema introspects the PostgreSQL catalog and exposes a typed,
// driver-agnostic description of the tables the admin portal manages.
//
// Nothing in this package knows about HTTP or HTML: it is the single source of
// truth that the repository (SQL generation), the form layer (widgets and
// coercion) and the handlers (display) all build on.
package schema

// Kind is the admin portal's own classification of a PostgreSQL column type.
// It collapses the many pg type names into the handful of behaviours the
// portal cares about (how to render, how to parse, how to search).
type Kind int

const (
	KindText Kind = iota
	KindUUID
	KindBool
	KindInt
	KindDecimal
	KindTimestamp
	KindDate
	KindJSON
	KindTextArray
	KindUnknown
)

func (k Kind) String() string {
	switch k {
	case KindText:
		return "text"
	case KindUUID:
		return "uuid"
	case KindBool:
		return "bool"
	case KindInt:
		return "int"
	case KindDecimal:
		return "decimal"
	case KindTimestamp:
		return "timestamp"
	case KindDate:
		return "date"
	case KindJSON:
		return "json"
	case KindTextArray:
		return "text[]"
	default:
		return "unknown"
	}
}

// IsNumeric reports whether values of this kind can be compared numerically.
func (k Kind) IsNumeric() bool { return k == KindInt || k == KindDecimal }

// IsTemporal reports whether values of this kind carry a date component.
func (k Kind) IsTemporal() bool { return k == KindTimestamp || k == KindDate }

// ForeignKey describes a single-column foreign key.
type ForeignKey struct {
	Table  string // referenced table
	Column string // referenced column
}

// Column is one column of a table as seen by the admin portal.
type Column struct {
	Name       string
	Kind       Kind
	UDT        string // raw pg udt_name, e.g. "varchar", "int8", "_text"
	Nullable   bool
	HasDefault bool
	Default    string // raw column_default expression, informational only
	IsPrimary  bool
	IsLongText bool     // `text` type as opposed to `varchar` — rendered as a textarea
	Choices    []string // derived from a `CHECK (col IN (...))` constraint, if any
	MaxLength  int      // character_maximum_length for varchar, 0 when unbounded
	FK         *ForeignKey
}

// Table is a fully introspected table.
type Table struct {
	Name    string
	Columns []Column
	// PrimaryKey lists the PK column names in constraint order. It is a slice
	// because the schema contains composite keys (e.g. saved_freelancers).
	PrimaryKey []string
}

// Column returns the column named name, or nil.
func (t *Table) Column(name string) *Column {
	for i := range t.Columns {
		if t.Columns[i].Name == name {
			return &t.Columns[i]
		}
	}
	return nil
}

// HasColumn reports whether the table has a column with the given name.
func (t *Table) HasColumn(name string) bool { return t.Column(name) != nil }

// ColumnNames returns every column name in ordinal order.
func (t *Table) ColumnNames() []string {
	out := make([]string, len(t.Columns))
	for i, c := range t.Columns {
		out[i] = c.Name
	}
	return out
}
