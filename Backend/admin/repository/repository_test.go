package repository

import (
	"reflect"
	"testing"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
)

func usersTable() *schema.Table {
	return &schema.Table{
		Name:       "users",
		PrimaryKey: []string{"id"},
		Columns: []schema.Column{
			{Name: "id", Kind: schema.KindUUID, IsPrimary: true},
			{Name: "email", Kind: schema.KindText},
			{Name: "is_active", Kind: schema.KindBool},
			{Name: "created_at", Kind: schema.KindTimestamp},
		},
	}
}

func TestBuildWhere(t *testing.T) {
	where, args := buildWhere(ListQuery{
		Search:        "ali  admin",
		SearchColumns: []string{"email", "full_name"},
		Filters: []Filter{
			{Column: "is_active", Op: OpEq, Value: true},
			{Column: "ban_reason", Op: OpIsNull},
		},
	})
	want := ` WHERE ("email"::text ILIKE $1 OR "full_name"::text ILIKE $1) AND ("email"::text ILIKE $2 OR "full_name"::text ILIKE $2) AND "is_active" = $3 AND "ban_reason" IS NULL`
	if where != want {
		t.Fatalf("where = %s", where)
	}
	if !reflect.DeepEqual(args, []any{"%ali%", "%admin%", true}) {
		t.Fatalf("args = %v", args)
	}
}

func TestBuildWhereEscapesLike(t *testing.T) {
	_, args := buildWhere(ListQuery{Search: "50%_off", SearchColumns: []string{"title"}})
	if args[0] != `%50\%\_off%` {
		t.Fatalf("args = %v", args)
	}
}

func TestBuildOrderAddsPKTiebreaker(t *testing.T) {
	got := buildOrder(usersTable(), []string{"-created_at"})
	if got != ` ORDER BY "created_at" DESC, "id" ASC` {
		t.Fatalf("order = %s", got)
	}
	got = buildOrder(usersTable(), []string{"id"})
	if got != ` ORDER BY "id" ASC` {
		t.Fatalf("order = %s", got)
	}
}

func TestKeysPredicate(t *testing.T) {
	where, args := keysPredicate(usersTable(), []Key{{"a"}, {"b"}})
	if where != `"id" = ANY($1)` || len(args) != 1 {
		t.Fatalf("single pk: %s %v", where, args)
	}

	composite := &schema.Table{Name: "saved_freelancers", PrimaryKey: []string{"user_id", "freelancer_id"}}
	where, args = keysPredicate(composite, []Key{{"u1", "f1"}, {"u2", "f2"}})
	if where != `("user_id" = $1 AND "freelancer_id" = $2) OR ("user_id" = $3 AND "freelancer_id" = $4)` {
		t.Fatalf("composite: %s", where)
	}
	if !reflect.DeepEqual(args, []any{"u1", "f1", "u2", "f2"}) {
		t.Fatalf("composite args: %v", args)
	}
}

func TestDecodeKeyValidatesType(t *testing.T) {
	if _, err := DecodeKey(usersTable(), "not-a-uuid"); err == nil {
		t.Fatal("malformed uuid key accepted")
	}
	if _, err := DecodeKey(usersTable(), "7da8cf95-a633-4891-8c71-33f47bb5cf98"); err != nil {
		t.Fatal(err)
	}
	ints := &schema.Table{PrimaryKey: []string{"id"}, Columns: []schema.Column{{Name: "id", Kind: schema.KindInt}}}
	if _, err := DecodeKey(ints, "12x"); err == nil {
		t.Fatal("malformed int key accepted")
	}
}

func TestKeyRoundTrip(t *testing.T) {
	composite := &schema.Table{PrimaryKey: []string{"a", "b"}}
	k := Key{"x,y/z", "w"}
	enc := k.Encode()
	if enc != "x%2Cy%2Fz,w" {
		t.Fatalf("encode = %s", enc)
	}
	dec, err := DecodeKey(composite, enc)
	if err != nil || !reflect.DeepEqual(dec, k) {
		t.Fatalf("decode = %v %v", dec, err)
	}
	if _, err := DecodeKey(composite, "only-one"); err == nil {
		t.Fatal("arity mismatch accepted")
	}
}

func TestStringify(t *testing.T) {
	if Stringify(nil) != "" || Stringify(int64(3)) != "3" || Stringify(true) != "true" {
		t.Fatal("stringify basics")
	}
}
