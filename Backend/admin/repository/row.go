package repository

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/lib/pq"
)

// Row is one database row keyed by column name. Values are normalised Go
// types: string, int64, float64, bool, time.Time, []string (text arrays) or
// nil for NULL. Anything the driver hands back as []byte (uuid, numeric,
// jsonb, bpchar …) is converted to string so templates never see raw bytes.
type Row map[string]any

// scanRow reads the current rows cursor into a Row using kind-aware
// destinations; text arrays need pq.StringArray, everything else scans into
// an interface and is normalised afterwards.
func scanRow(rows *sql.Rows, cols []schema.Column) (Row, error) {
	dests := make([]any, len(cols))
	for i, c := range cols {
		if c.Kind == schema.KindTextArray {
			dests[i] = new(pq.StringArray)
		} else {
			dests[i] = new(any)
		}
	}
	if err := rows.Scan(dests...); err != nil {
		return nil, err
	}

	row := make(Row, len(cols))
	for i, c := range cols {
		switch d := dests[i].(type) {
		case *pq.StringArray:
			if *d == nil {
				row[c.Name] = nil
			} else {
				row[c.Name] = []string(*d)
			}
		case *any:
			row[c.Name] = normalise(*d)
		}
	}
	return row, nil
}

func normalise(v any) any {
	switch x := v.(type) {
	case []byte:
		return string(x)
	default:
		return v
	}
}

// Stringify renders any normalised value as text, the way the changelist and
// URLs need it. NULL becomes "".
func Stringify(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case bool:
		return strconv.FormatBool(x)
	case int64:
		return strconv.FormatInt(x, 10)
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case time.Time:
		return x.Format(time.RFC3339)
	case []string:
		return fmt.Sprintf("%v", x)
	default:
		return fmt.Sprintf("%v", x)
	}
}
