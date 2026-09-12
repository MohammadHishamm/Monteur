package form

import (
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
)

func col(kind schema.Kind, nullable, hasDefault bool) schema.Column {
	return schema.Column{Name: "c", Kind: kind, Nullable: nullable, HasDefault: hasDefault}
}

func TestCoerce(t *testing.T) {
	uuid := "7da8cf95-a633-4891-8c71-33f47bb5cf98"
	cases := []struct {
		name     string
		col      schema.Column
		raw      string
		present  bool
		mode     Mode
		want     any
		wantErr  error
		fieldErr bool
	}{
		{"checkbox ticked", col(schema.KindBool, false, false), "on", true, ModeChange, true, nil, false},
		{"checkbox absent", col(schema.KindBool, false, false), "", false, ModeChange, false, nil, false},
		{"nullable blank", col(schema.KindInt, true, false), "", true, ModeChange, nil, nil, false},
		{"text blank not null no default", col(schema.KindText, false, false), "", true, ModeChange, nil, nil, true},
		{"text blank with default (change)", col(schema.KindText, false, true), "", true, ModeChange, "", nil, false},
		{"text blank with default (add)", col(schema.KindText, false, true), "", true, ModeAdd, nil, ErrSkip, false},
		{"add blank uses default", col(schema.KindInt, false, true), "", true, ModeAdd, nil, ErrSkip, false},
		{"change blank required", col(schema.KindInt, false, true), "", true, ModeChange, nil, nil, true},
		{"int", col(schema.KindInt, false, false), " 42 ", true, ModeChange, int64(42), nil, false},
		{"bad int", col(schema.KindInt, false, false), "x", true, ModeChange, nil, nil, true},
		{"decimal keeps string", col(schema.KindDecimal, false, false), "45.50", true, ModeChange, "45.50", nil, false},
		{"uuid", col(schema.KindUUID, false, false), uuid, true, ModeChange, uuid, nil, false},
		{"bad uuid", col(schema.KindUUID, false, false), "nope", true, ModeChange, nil, nil, true},
		{"timestamp", col(schema.KindTimestamp, false, false), "2026-09-06T14:12:38", true, ModeChange,
			time.Date(2026, 9, 6, 14, 12, 38, 0, time.UTC), nil, false},
		{"json", col(schema.KindJSON, false, false), `{"a":1}`, true, ModeChange, `{"a":1}`, nil, false},
		{"bad json", col(schema.KindJSON, false, false), `{a}`, true, ModeChange, nil, nil, true},
		{"array lines", col(schema.KindTextArray, false, false), "Go\r\n\nPostgres\n", true, ModeChange, []string{"Go", "Postgres"}, nil, false},
		{"array blank with default", col(schema.KindTextArray, false, true), "", true, ModeChange, []string{}, nil, false},
		{"array blank without default", col(schema.KindTextArray, false, false), "", true, ModeChange, nil, nil, true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := Coerce(c.col, c.raw, c.present, c.mode)
			var fe FieldError
			if c.fieldErr {
				if !errors.As(err, &fe) {
					t.Fatalf("want FieldError, got %v", err)
				}
				return
			}
			if !errors.Is(err, c.wantErr) {
				t.Fatalf("err = %v, want %v", err, c.wantErr)
			}
			if err == nil && !reflect.DeepEqual(got, c.want) {
				t.Fatalf("got %#v, want %#v", got, c.want)
			}
		})
	}
}

func TestCoerceChoices(t *testing.T) {
	c := col(schema.KindText, false, false)
	c.Choices = []string{"open", "closed"}

	if v, err := Coerce(c, "open", true, ModeChange); err != nil || v != "open" {
		t.Fatalf("valid choice: %v %v", v, err)
	}
	if _, err := Coerce(c, "other", true, ModeChange); err == nil {
		t.Fatal("invalid choice accepted")
	}
	if _, err := Coerce(c, "", true, ModeChange); err == nil {
		t.Fatal("blank choice on NOT NULL column accepted")
	}
}

func TestWidgetFor(t *testing.T) {
	if WidgetFor(schema.Column{Kind: schema.KindText}, true) != WidgetPassword {
		t.Fatal("password")
	}
	if WidgetFor(schema.Column{Kind: schema.KindText, Choices: []string{"a"}}, false) != WidgetSelect {
		t.Fatal("select")
	}
	if WidgetFor(schema.Column{Kind: schema.KindText, IsLongText: true}, false) != WidgetTextarea {
		t.Fatal("textarea")
	}
	if WidgetFor(schema.Column{Kind: schema.KindTimestamp}, false) != WidgetDateTime {
		t.Fatal("datetime")
	}
}

func TestInputValueAndDisplay(t *testing.T) {
	ts := schema.Column{Kind: schema.KindTimestamp}
	at := time.Date(2026, 9, 6, 14, 12, 38, 492560000, time.UTC)
	if got := InputValue(ts, at); got != "2026-09-06T14:12:38" {
		t.Fatalf("InputValue = %q", got)
	}
	if got := Display(ts, at); got != "Sep 6, 2026, 14:12" {
		t.Fatalf("Display = %q", got)
	}
	if got := Display(schema.Column{Kind: schema.KindBool}, nil); got != "-" {
		t.Fatalf("nil display = %q", got)
	}
	if got := InputValue(schema.Column{Kind: schema.KindTextArray}, []string{"a", "b"}); got != "a\nb" {
		t.Fatalf("array input = %q", got)
	}
}
