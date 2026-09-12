package schema

import (
	"reflect"
	"testing"
)

func TestParseChoiceConstraint(t *testing.T) {
	cases := []struct {
		def  string
		col  string
		vals []string
		ok   bool
	}{
		{
			def:  `CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))`,
			col:  "status",
			vals: []string{"open", "closed"},
			ok:   true,
		},
		{
			def:  `CHECK (((aspect IS NULL) OR ((aspect)::text = ANY ((ARRAY['9:16'::character varying, '1:1.91'::character varying])::text[]))))`,
			col:  "aspect",
			vals: []string{"9:16", "1:1.91"},
			ok:   true,
		},
		{def: `CHECK ((progress >= 0) AND (progress <= 100))`, ok: false},
		{def: `CHECK ((((sender_user_id IS NOT NULL) AND (sender_admin_id IS NULL)) OR ((sender_user_id IS NULL) AND (sender_admin_id IS NOT NULL))))`, ok: false},
	}

	for _, c := range cases {
		col, vals, ok := parseChoiceConstraint(c.def)
		if ok != c.ok {
			t.Fatalf("%s: ok=%v want %v", c.def, ok, c.ok)
		}
		if !ok {
			continue
		}
		if col != c.col || !reflect.DeepEqual(vals, c.vals) {
			t.Fatalf("%s: got (%q, %v) want (%q, %v)", c.def, col, vals, c.col, c.vals)
		}
	}
}

func TestKindOf(t *testing.T) {
	if kindOf("_text") != KindTextArray || kindOf("int8") != KindInt || kindOf("timestamptz") != KindTimestamp {
		t.Fatal("unexpected kind mapping")
	}
}
