// Package form converts between HTML form values and typed column values, and
// decides which widget renders a column. It is the equivalent of Django's
// ModelForm + widgets, driven by the introspected schema instead of model
// field declarations.
package form

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/google/uuid"
)

// Widget is the HTML control used to edit a column.
type Widget string

const (
	WidgetText     Widget = "text"
	WidgetTextarea Widget = "textarea"
	WidgetNumber   Widget = "number"
	WidgetCheckbox Widget = "checkbox"
	WidgetSelect   Widget = "select"
	WidgetDateTime Widget = "datetime"
	WidgetDate     Widget = "date"
	WidgetPassword Widget = "password"
	WidgetJSON     Widget = "json"
	WidgetArray    Widget = "array"
	WidgetSecret   Widget = "secret"
)

// ClearSuffix is appended to a secret field's name for its "Clear" checkbox.
const ClearSuffix = "__clear"

// WidgetFor picks the control for a column.
func WidgetFor(c schema.Column, isPassword bool) Widget {
	switch {
	case isPassword:
		return WidgetPassword
	case len(c.Choices) > 0:
		return WidgetSelect
	case c.Kind == schema.KindBool:
		return WidgetCheckbox
	case c.Kind == schema.KindInt, c.Kind == schema.KindDecimal:
		return WidgetNumber
	case c.Kind == schema.KindTimestamp:
		return WidgetDateTime
	case c.Kind == schema.KindDate:
		return WidgetDate
	case c.Kind == schema.KindJSON:
		return WidgetJSON
	case c.Kind == schema.KindTextArray:
		return WidgetArray
	case c.IsLongText:
		return WidgetTextarea
	default:
		return WidgetText
	}
}

// Mode distinguishes the add form (missing values may fall back to database
// defaults) from the change form (every non-nullable value must be given).
type Mode int

const (
	ModeAdd Mode = iota
	ModeChange
)

// ErrSkip signals that the column should not be written at all — either the
// database default should apply or the stored value should be kept.
var ErrSkip = errors.New("form: skip column")

// FieldError is a validation failure attached to one column.
type FieldError struct {
	Column  string
	Message string
}

func (e FieldError) Error() string { return e.Column + ": " + e.Message }

// Coerce turns the raw submitted string for a column into the typed value
// the repository should write. present reports whether the field was in the
// form at all (checkboxes are absent when unticked).
func Coerce(c schema.Column, raw string, present bool, mode Mode) (any, error) {
	if c.Kind == schema.KindBool {
		// A checkbox is only submitted when ticked.
		return present && (raw == "on" || raw == "true" || raw == "1"), nil
	}

	// Long text keeps its whitespace verbatim; everything else is trimmed so
	// a stray space never fails UUID or number parsing.
	if !c.IsLongText {
		raw = strings.TrimSpace(raw)
	}

	if raw == "" {
		switch {
		case c.Nullable:
			return nil, nil
		case mode == ModeAdd && c.HasDefault:
			return nil, ErrSkip // let the database default apply
		case c.Kind == schema.KindText && c.HasDefault && len(c.Choices) == 0:
			return "", nil // e.g. summary TEXT NOT NULL DEFAULT '' — blank is a real value
		case c.Kind == schema.KindTextArray && c.HasDefault:
			return []string{}, nil
		default:
			// NOT NULL without a default (or a choice column, where "" is
			// never a valid choice) — Django's blank=False.
			return nil, FieldError{c.Name, "This field is required."}
		}
	}

	if len(c.Choices) > 0 && !containsString(c.Choices, raw) {
		return nil, FieldError{c.Name, fmt.Sprintf("Select a valid choice. %q is not one of the available choices.", raw)}
	}

	switch c.Kind {
	case schema.KindText:
		if c.MaxLength > 0 && len([]rune(raw)) > c.MaxLength {
			return nil, FieldError{c.Name, fmt.Sprintf("Ensure this value has at most %d characters.", c.MaxLength)}
		}
		return raw, nil
	case schema.KindUUID:
		if _, err := uuid.Parse(raw); err != nil {
			return nil, FieldError{c.Name, "Enter a valid UUID."}
		}
		return raw, nil
	case schema.KindInt:
		n, err := strconv.ParseInt(raw, 10, 64)
		if err != nil {
			return nil, FieldError{c.Name, "Enter a whole number."}
		}
		return n, nil
	case schema.KindDecimal:
		// Validate but keep the string so numeric precision survives.
		if _, err := strconv.ParseFloat(raw, 64); err != nil {
			return nil, FieldError{c.Name, "Enter a number."}
		}
		return raw, nil
	case schema.KindTimestamp:
		t, err := parseTime(raw)
		if err != nil {
			return nil, FieldError{c.Name, "Enter a valid date/time (YYYY-MM-DD HH:MM[:SS])."}
		}
		return t, nil
	case schema.KindDate:
		t, err := time.Parse("2006-01-02", raw)
		if err != nil {
			return nil, FieldError{c.Name, "Enter a valid date (YYYY-MM-DD)."}
		}
		return t, nil
	case schema.KindJSON:
		if !json.Valid([]byte(raw)) {
			return nil, FieldError{c.Name, "Enter valid JSON."}
		}
		return raw, nil
	case schema.KindTextArray:
		return splitLines(raw), nil
	default:
		return raw, nil
	}
}

var timeLayouts = []string{
	"2006-01-02T15:04:05",
	"2006-01-02T15:04",
	"2006-01-02 15:04:05",
	"2006-01-02 15:04",
	time.RFC3339,
	"2006-01-02",
}

func parseTime(s string) (time.Time, error) {
	for _, l := range timeLayouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, errors.New("unrecognised time")
}

func splitLines(s string) []string {
	var out []string
	for _, line := range strings.Split(strings.ReplaceAll(s, "\r\n", "\n"), "\n") {
		if line = strings.TrimSpace(line); line != "" {
			out = append(out, line)
		}
	}
	if out == nil {
		out = []string{}
	}
	return out
}

func containsString(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

// InputValue renders a stored value in the format the column's widget
// expects in its value attribute.
func InputValue(c schema.Column, v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case time.Time:
		if c.Kind == schema.KindDate {
			return x.Format("2006-01-02")
		}
		return x.UTC().Format("2006-01-02T15:04:05")
	case []string:
		return strings.Join(x, "\n")
	case string:
		if c.Kind == schema.KindJSON {
			var buf bytes.Buffer
			if err := json.Indent(&buf, []byte(x), "", "  "); err == nil {
				return buf.String()
			}
		}
		return x
	default:
		return fmt.Sprintf("%v", v)
	}
}

// Display renders a stored value for the changelist and readonly fields.
func Display(c schema.Column, v any) string {
	switch x := v.(type) {
	case nil:
		return "-"
	case bool:
		if x {
			return "True"
		}
		return "False"
	case time.Time:
		if c.Kind == schema.KindDate {
			return x.Format("Jan 2, 2006")
		}
		return x.UTC().Format("Jan 2, 2006, 15:04")
	case []string:
		return strings.Join(x, ", ")
	case string:
		return truncate(x, 120)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}
