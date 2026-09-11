package tests

import (
	"html"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"testing"

	"github.com/OmarHosny18/APP-frontend/admin/site"
)

// testCRUD adds one row to every editable table through the portal, checks
// it is immediately listed, round-trips the change form unchanged, edits one
// column, and verifies the audit log — in dependency order, so later tables
// can reference earlier rows. Deletion happens in testDeleteFixtures.
func testCRUD(t *testing.T, h *harness, fx *fixtures) {
	h.run(t, "every registered table is covered", func(t *testing.T) {
		covered := map[string]bool{}
		for _, name := range creationOrder {
			covered[name] = true
		}
		for _, m := range h.models() {
			if !covered[m.Name()] && !readOnlyTables[m.Name()] {
				t.Errorf("%s is registered but not in creationOrder — add it so it gets tested", m.Name())
			}
		}
	})

	for _, table := range creationOrder {
		m := h.model(table)
		h.run(t, table, func(t *testing.T) {
			switch {
			case table == "users":
				fx.client = addRow(t, h, fx, m, map[string]string{"user_type": "client"})
				fx.freelancer = addRow(t, h, fx, m, map[string]string{"user_type": "freelancer"})
				fx.add(table, fx.client)
				fx.add(table, fx.freelancer)
				changeRow(t, h, m, fx.client)
			case m.Admin.DisableAdd:
				key := insertDirect(t, h, fx, m)
				fx.add(table, key)
				assertAddForbidden(t, h, m)
				changeRow(t, h, m, key)
			default:
				key := addRow(t, h, fx, m, nil)
				fx.add(table, key)
				changeRow(t, h, m, key)
			}
		})
	}

	h.run(t, "bulk delete action with confirmation", func(t *testing.T) {
		m := h.model("notifications")
		keys := []string{
			addRow(t, h, fx, m, map[string]string{"title": marker + "bulk 1"}),
			addRow(t, h, fx, m, map[string]string{"title": marker + "bulk 2"}),
		}
		before := h.count("notifications", "")

		form := url.Values{"action": {"delete_selected"}, "_selected_action": keys}
		confirm := h.post(m.URL(), form)
		if confirm.Code != http.StatusOK || !confirm.contains("Are you sure") || !confirm.contains("notifications: 2") {
			t.Fatalf("confirmation page: %d", confirm.Code)
		}
		if h.count("notifications", "") != before {
			t.Fatal("confirmation page must not delete anything")
		}

		form.Set("post", "yes")
		done := h.post(m.URL(), form)
		if done.Code != http.StatusFound || done.Location != m.URL() {
			t.Fatalf("delete: %d %q", done.Code, done.Location)
		}
		if h.count("notifications", "") != before-2 {
			t.Fatal("bulk delete did not remove both rows")
		}
		if !h.get(m.URL()).contains("Successfully deleted 2 notifications.") {
			t.Error("missing success flash")
		}
	})

	h.run(t, "bulk action with nothing selected is a no-op", func(t *testing.T) {
		m := h.model("notifications")
		before := h.count("notifications", "")
		resp := h.post(m.URL(), url.Values{"action": {"delete_selected"}})
		if resp.Code != http.StatusFound || h.count("notifications", "") != before {
			t.Fatalf("got %d", resp.Code)
		}
	})

	h.run(t, "read-only table refuses writes", func(t *testing.T) {
		m := h.model("admin_log")
		list := h.get(m.URL())
		if list.Code != http.StatusOK || list.contains(`class="addlink"`) || list.contains("delete_selected") {
			t.Fatalf("read-only changelist should hide add/delete: %d", list.Code)
		}
		if h.get(m.AddURL()).Code != http.StatusForbidden {
			t.Error("add form should be forbidden")
		}
		if h.post(m.AddURL(), url.Values{"model": {"x"}}).Code != http.StatusForbidden {
			t.Error("add POST should be forbidden")
		}
		id := h.queryString(`SELECT id::text FROM admin_log ORDER BY id DESC LIMIT 1`)
		if h.post(m.ObjectURL(id), url.Values{"model": {"x"}}).Code != http.StatusForbidden {
			t.Error("change POST should be forbidden")
		}
		if h.post(m.DeleteURL(id), nil).Code != http.StatusForbidden {
			t.Error("delete POST should be forbidden")
		}
	})
}

// addRow submits the generated Add form (with overrides) using "Save and
// continue editing", asserts the redirect and immediate listing, and
// returns the new row's encoded key.
func addRow(t *testing.T, h *harness, fx *fixtures, m *site.Model, extra map[string]string) string {
	t.Helper()
	form := fx.addForm(m)
	for k, v := range extra {
		form.Set(k, v)
	}
	form.Set("_continue", "1")

	before := h.count(m.Name(), "")
	resp := h.post(m.AddURL(), form)
	if resp.Code != http.StatusFound {
		t.Fatalf("add %s: got %d\n%s", m.Name(), resp.Code, formErrors(resp.Body))
	}
	key := keyFromLocation(m, resp.Location)
	if key == "" {
		t.Fatalf("add %s: unexpected redirect %q", m.Name(), resp.Location)
	}
	if h.count(m.Name(), "") != before+1 {
		t.Fatalf("add %s: row count did not grow", m.Name())
	}

	// Instant refresh: the changelist must show the row on the very next request.
	list := h.get(m.URL())
	if list.Code != http.StatusOK || !list.contains(`value="`+key+`"`) {
		t.Fatalf("add %s: new row %s not on changelist", m.Name(), key)
	}
	if !list.contains("was added successfully") {
		t.Errorf("add %s: missing success flash", m.Name())
	}
	assertLastLog(t, h, m, 1, "")
	return key
}

// changeRow opens the change form, resubmits it untouched (expecting "No
// fields changed."), then edits one text column and verifies the database
// and the audit message.
func changeRow(t *testing.T, h *harness, m *site.Model, key string) {
	t.Helper()
	page := h.get(m.ObjectURL(key))
	if page.Code != http.StatusOK || !page.contains(`id="`+m.Name()+`_form"`) {
		t.Fatalf("change form %s/%s: %d", m.Name(), key, page.Code)
	}

	form := scrapeForm(page.Body)
	form.Set("_continue", "1")
	if !m.Admin.DisableChange {
		resp := h.post(m.ObjectURL(key), form)
		if resp.Code != http.StatusFound {
			t.Fatalf("unchanged resubmit %s: %d\n%s", m.Name(), resp.Code, formErrors(resp.Body))
		}
		assertLastLog(t, h, m, 2, "No fields changed.")
	}

	col := changeableColumn(m)
	if col == nil {
		t.Logf("%s: no plain text column to edit; change round-trip only", m.Name())
		return
	}
	want := marker + "changed " + randomHex(2)
	form.Set(col.Name, want)
	resp := h.post(m.ObjectURL(key), form)
	if resp.Code != http.StatusFound {
		t.Fatalf("change %s.%s: %d\n%s", m.Name(), col.Name, resp.Code, formErrors(resp.Body))
	}

	where, args := keyWhere(m, key)
	got := h.queryString(`SELECT `+col.Name+`::text FROM `+m.Name()+` WHERE `+where, args...)
	if got != want {
		t.Fatalf("change %s.%s: db has %q, want %q", m.Name(), col.Name, got, want)
	}
	assertLastLog(t, h, m, 2, "Changed "+col.Name+".")

	if !h.get(m.ObjectURL(key)).contains(html.EscapeString(want)) {
		t.Errorf("change %s: form does not show the new value", m.Name())
	}
}

// testDeleteFixtures removes every fixture through the portal's single-row
// delete flow, children first, and verifies each one is gone.
func testDeleteFixtures(t *testing.T, h *harness, fx *fixtures) {
	for i := len(creationOrder) - 1; i >= 0; i-- {
		table := creationOrder[i]
		m := h.model(table)
		for _, key := range fx.ids[table] {
			where, args := keyWhere(m, key)
			if h.count(table, where, args...) == 0 {
				continue // already removed by a cascade from a parent
			}
			confirm := h.get(m.DeleteURL(key))
			if confirm.Code != http.StatusOK || !confirm.contains("Are you sure") {
				t.Fatalf("delete page %s/%s: %d", table, key, confirm.Code)
			}
			resp := h.post(m.DeleteURL(key), nil)
			if resp.Code != http.StatusFound || resp.Location != m.URL() {
				t.Fatalf("delete %s/%s: %d %q", table, key, resp.Code, resp.Location)
			}
			if h.count(table, where, args...) != 0 {
				t.Fatalf("delete %s/%s: row still present", table, key)
			}
			if h.get(m.ObjectURL(key)).Code != http.StatusNotFound {
				t.Errorf("delete %s/%s: change page should now 404", table, key)
			}
			assertLastLog(t, h, m, 3, "")
		}
	}
	if n := h.count("users", "email LIKE 'admintest-%'"); n != 0 {
		t.Fatalf("%d suite users survived deletion", n)
	}
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func keyFromLocation(m *site.Model, loc string) string {
	if !strings.HasPrefix(loc, m.URL()) || !strings.HasSuffix(loc, "/change/") {
		return ""
	}
	return strings.TrimSuffix(strings.TrimPrefix(loc, m.URL()), "/change/")
}

// keyWhere builds a WHERE clause for an encoded key (composite keys are
// comma-separated, percent-encoded parts).
func keyWhere(m *site.Model, key string) (string, []any) {
	parts := strings.Split(key, ",")
	var preds []string
	var args []any
	for i, pk := range m.Table.PrimaryKey {
		v, err := url.PathUnescape(parts[i])
		if err != nil {
			v = parts[i]
		}
		args = append(args, v)
		preds = append(preds, pk+"::text = $"+string(rune('1'+i)))
	}
	return strings.Join(preds, " AND "), args
}

func assertAddForbidden(t *testing.T, h *harness, m *site.Model) {
	t.Helper()
	if h.get(m.AddURL()).Code != http.StatusForbidden {
		t.Errorf("%s: add form should be forbidden", m.Name())
	}
}

// insertDirect creates a row for tables the portal cannot add (their form
// hides a required column), so change/delete can still be exercised.
func insertDirect(t *testing.T, h *harness, fx *fixtures, m *site.Model) string {
	t.Helper()
	switch m.Name() {
	case "refresh_tokens":
		return h.queryString(`
			INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
			VALUES ($1, $2, NOW() + INTERVAL '1 day', '127.0.0.1', $3) RETURNING id::text`,
			fx.client, marker+randomHex(16), marker+"agent")
	default:
		t.Fatalf("insertDirect: no recipe for %s", m.Name())
		return ""
	}
}

// assertLastLog checks the newest audit entry for the model.
func assertLastLog(t *testing.T, h *harness, m *site.Model, action int, message string) {
	t.Helper()
	got := h.queryString(`
		SELECT action_flag::text || '|' || change_message FROM admin_log
		WHERE model = $1 AND admin_email = $2 ORDER BY id DESC LIMIT 1`, m.Name(), testAdminEmail)
	want := string(rune('0'+action)) + "|" + message
	if got != want {
		t.Errorf("%s: last admin_log entry = %q, want %q", m.Name(), got, want)
	}
}

var (
	reInput    = regexp.MustCompile(`<input([^>]*)>`)
	reTextarea = regexp.MustCompile(`(?s)<textarea name="([^"]+)"[^>]*>(.*?)</textarea>`)
	reSelect   = regexp.MustCompile(`(?s)<select name="([^"]+)"[^>]*>(.*?)</select>`)
	reSelected = regexp.MustCompile(`<option value="([^"]*)" selected`)
	reAttr     = regexp.MustCompile(`\s(\w+)="([^"]*)"`)
)

// scrapeForm collects the change form's fields the way a browser would
// serialise them: text-ish inputs by value, ticked checkboxes, textareas and
// selected options. Submit buttons are left out.
func scrapeForm(body string) url.Values {
	form := url.Values{}
	for _, m := range reInput.FindAllStringSubmatch(body, -1) {
		attrs := map[string]string{}
		for _, a := range reAttr.FindAllStringSubmatch(m[1], -1) {
			attrs[a[1]] = a[2]
		}
		name := attrs["name"]
		switch attrs["type"] {
		case "submit", "", "search":
			continue
		case "checkbox":
			if strings.Contains(m[1], " checked") {
				form.Set(name, "on")
			}
		default:
			form.Set(name, html.UnescapeString(attrs["value"]))
		}
	}
	for _, m := range reTextarea.FindAllStringSubmatch(body, -1) {
		form.Set(m[1], html.UnescapeString(m[2]))
	}
	for _, m := range reSelect.FindAllStringSubmatch(body, -1) {
		if sel := reSelected.FindStringSubmatch(m[2]); sel != nil {
			form.Set(m[1], sel[1])
		} else {
			form.Set(m[1], "")
		}
	}
	return form
}

var reFieldError = regexp.MustCompile(`field-(\w+) errors.*?<li>([^<]*)</li>|errornote">([^<]*)`)

// formErrors extracts validation messages from a rendered form for
// readable failure output.
func formErrors(body string) string {
	body = strings.ReplaceAll(body, "\n", " ")
	var out []string
	for _, m := range reFieldError.FindAllStringSubmatch(body, -1) {
		if m[3] != "" {
			out = append(out, m[3])
		} else {
			out = append(out, m[1]+": "+m[2])
		}
	}
	return strings.Join(out, "\n")
}
