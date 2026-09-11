package tests

import (
	"net/url"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/google/uuid"
)

// creationOrder lists every editable table in foreign-key dependency order,
// so a parent row always exists before a child form references it. The
// suite fails if a registered table is missing here, which keeps the list
// honest when someone registers a new table.
var creationOrder = []string{
	"admins",
	"users",
	"user_balances",
	"user_verifications",
	"jobs",
	"proposals",
	"projects",
	"reviews",
	"conversations",
	"conversation_participants",
	"messages",
	"flagged_messages",
	"notifications",
	"freelancer_showcases",
	"freelancer_profile_views",
	"saved_freelancers",
	"refresh_tokens",
}

// readOnlyTables are registered for viewing only and get no CRUD run.
var readOnlyTables = map[string]bool{"admin_log": true}

// overrides pin values the generic generator cannot infer from the schema,
// typically to satisfy multi-column CHECK constraints. "@client" and
// "@freelancer" resolve to the suite's users; "" leaves the field blank.
var overrides = map[string]map[string]string{
	// chk_message_sender: exactly one of sender_user_id / sender_admin_id.
	"messages": {"sender_user_id": "@client", "sender_admin_id": ""},
}

// skipColumns are never filled: writing them would change how the running
// API treats requests from this machine (IP bans), which the suite must not do.
var skipColumns = map[string]bool{
	"banned_ip_address": true,
	"ip_banned_at":      true,
	"ban_reason":        true,
}

// fixtures remembers the rows the suite created, keyed by table, so foreign
// keys of later tables can point at them.
type fixtures struct {
	// ids[table] is the ordered list of encoded primary keys created.
	ids map[string][]string
	// users holds one client and one freelancer for the many user FKs.
	client, freelancer string
}

func newFixtures() *fixtures { return &fixtures{ids: map[string][]string{}} }

func (f *fixtures) add(table, key string) { f.ids[table] = append(f.ids[table], key) }

func (f *fixtures) first(table string) string {
	if v := f.ids[table]; len(v) > 0 {
		return v[0]
	}
	return ""
}

// resolveFK picks a fixture row for a foreign-key column. Users are the
// special case: columns that smell like a freelancer get the freelancer.
func (f *fixtures) resolveFK(col schema.Column) string {
	if col.FK.Table == "users" {
		if strings.Contains(col.Name, "freelancer") || strings.Contains(col.Name, "reviewee") {
			return f.freelancer
		}
		return f.client
	}
	return f.first(col.FK.Table)
}

// addForm generates a valid, fully populated Add form for a model.
func (f *fixtures) addForm(m *site.Model) url.Values {
	form := url.Values{}
	ov := overrides[m.Name()]

	for _, c := range m.FormColumns() {
		if m.IsReadonly(c.Name) {
			continue
		}
		if skipColumns[c.Name] {
			continue
		}
		if v, pinned := ov[c.Name]; pinned {
			switch v {
			case "":
			case "@client":
				form.Set(c.Name, f.client)
			case "@freelancer":
				form.Set(c.Name, f.freelancer)
			default:
				form.Set(c.Name, v)
			}
			continue
		}
		if m.IsPassword(c.Name) {
			form.Set(c.Name, "Sup3r-secret!")
			continue
		}
		if c.FK != nil {
			// Required FKs always get a value; optional ones stay NULL so
			// self-references and "either/or" constraints are not tripped.
			if !c.Nullable {
				form.Set(c.Name, f.resolveFK(c))
			}
			continue
		}
		if v, ok := valueFor(c); ok {
			form.Set(c.Name, v)
		}
	}
	return form
}

// valueFor produces a plausible value for a non-FK column from its schema.
func valueFor(c schema.Column) (string, bool) {
	if len(c.Choices) > 0 {
		return c.Choices[0], true
	}
	switch c.Kind {
	case schema.KindBool:
		// Only tick flags that describe a healthy row; leaving e.g.
		// is_banned unticked keeps the fixture "normal".
		return "on", c.Name == "is_active" || c.Name == "is_email_verified"
	case schema.KindInt:
		return "1", true // satisfies every range CHECK in the schema (>= 0, <= 100, 1..5)
	case schema.KindDecimal:
		return "1.50", true // fits even NUMERIC(3,2) (users.rating)
	case schema.KindTimestamp:
		return "2026-09-12T10:00:00", true
	case schema.KindDate:
		return "2026-09-12", true
	case schema.KindJSON:
		if strings.Contains(c.Default, "[]") {
			return `["admintest"]`, true
		}
		return `{"admintest": true}`, true
	case schema.KindTextArray:
		return "admintest-alpha\nadmintest-beta", true
	case schema.KindUUID:
		return uuid.NewString(), true
	case schema.KindText:
		return textFor(c), true
	default:
		return "", false
	}
}

func textFor(c schema.Column) string {
	name := c.Name
	var v string
	switch {
	case name == "email":
		v = uniqueEmail("row")
	case strings.Contains(name, "url"):
		v = "https://example.test/" + marker + randomHex(3)
	case strings.Contains(name, "ip_address"):
		v = "127.0.0.1"
	case name == "phone":
		v = "+20100" + randomHex(3)[:5]
	case name == "currency":
		v = "USD"
	case name == "country":
		v = "EG"
	case name == "user_agent" || name == "referrer":
		v = marker + "agent"
	default:
		v = marker + strings.ReplaceAll(name, "_", " ")
	}
	if c.MaxLength > 0 && len(v) > c.MaxLength {
		v = v[:c.MaxLength]
	}
	return v
}

// changeableColumn picks a plain text column the change test can safely
// rewrite: editable, not a key, not a choice, not unique-ish.
func changeableColumn(m *site.Model) *schema.Column {
	for _, c := range m.FormColumns() {
		if c.Kind != schema.KindText || len(c.Choices) > 0 || c.FK != nil || c.IsPrimary ||
			m.IsReadonly(c.Name) || m.IsPassword(c.Name) || skipColumns[c.Name] ||
			c.Name == "email" || (c.MaxLength > 0 && c.MaxLength < 32) {
			continue
		}
		cc := c
		return &cc
	}
	return nil
}
