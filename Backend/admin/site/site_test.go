package site

import (
	"reflect"
	"testing"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
)

func table() *schema.Table {
	return &schema.Table{
		Name:       "freelancer_showcases",
		PrimaryKey: []string{"id"},
		Columns: []schema.Column{
			{Name: "id", Kind: schema.KindUUID, IsPrimary: true, HasDefault: true},
			{Name: "title", Kind: schema.KindText},
			{Name: "password_hash", Kind: schema.KindText},
			{Name: "created_at", Kind: schema.KindTimestamp, HasDefault: true},
			{Name: "updated_at", Kind: schema.KindTimestamp, HasDefault: true},
		},
	}
}

func TestRegisterAppliesDefaults(t *testing.T) {
	s := New("/admin/")
	m, err := s.Register("app", table(), ModelAdmin{})
	if err != nil {
		t.Fatal(err)
	}

	if m.Admin.VerboseName != "freelancer showcase" || m.Admin.VerboseNamePlural != "freelancer showcases" {
		t.Fatalf("verbose names: %q %q", m.Admin.VerboseName, m.Admin.VerboseNamePlural)
	}
	if !reflect.DeepEqual(m.Admin.Ordering, []string{"-created_at"}) {
		t.Fatalf("ordering: %v", m.Admin.Ordering)
	}
	if !reflect.DeepEqual(m.Admin.ReadonlyFields, []string{"id", "created_at", "updated_at"}) {
		t.Fatalf("readonly: %v", m.Admin.ReadonlyFields)
	}
	if !reflect.DeepEqual(m.Admin.PasswordFields, []string{"password_hash"}) {
		t.Fatalf("password: %v", m.Admin.PasswordFields)
	}
	if m.Admin.ReprField != "title" || m.Admin.ListPerPage != 100 {
		t.Fatalf("repr/per page: %s %d", m.Admin.ReprField, m.Admin.ListPerPage)
	}
	if m.URL() != "/admin/app/freelancer_showcases/" || m.ObjectURL("k") != "/admin/app/freelancer_showcases/k/change/" {
		t.Fatalf("urls: %s %s", m.URL(), m.ObjectURL("k"))
	}
	if got, ok := s.Lookup("app", "freelancer_showcases"); !ok || got != m {
		t.Fatal("lookup failed")
	}
}

func TestRegisterRejectsUnknownColumns(t *testing.T) {
	s := New("/admin")
	if _, err := s.Register("app", table(), ModelAdmin{ListDisplay: []string{"nope"}}); err == nil {
		t.Fatal("unknown ListDisplay column accepted")
	}
	if _, err := s.Register("app", table(), ModelAdmin{Ordering: []string{"-nope"}}); err == nil {
		t.Fatal("unknown Ordering column accepted")
	}
	if _, err := s.Register("app", &schema.Table{Name: "nopk"}, ModelAdmin{}); err == nil {
		t.Fatal("table without PK accepted")
	}
}

func TestRegisterRejectsDuplicates(t *testing.T) {
	s := New("/admin")
	if _, err := s.Register("app", table(), ModelAdmin{}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Register("app", table(), ModelAdmin{}); err == nil {
		t.Fatal("duplicate accepted")
	}
}

func TestSingular(t *testing.T) {
	cases := map[string]string{
		"users": "user", "freelancer_showcases": "freelancer_showcase", "admin_log_entries": "admin_log_entry",
		"addresses": "address", "boxes": "box", "matches": "match", "messages": "message", "admin_log": "admin_log",
	}
	for in, want := range cases {
		if got := singular(in); got != want {
			t.Errorf("singular(%q) = %q, want %q", in, got, want)
		}
	}
}
