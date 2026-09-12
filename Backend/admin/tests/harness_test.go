// Package tests holds the admin portal's integration suite. It boots the
// real portal (admin.Build) against the real PostgreSQL from docker/.env and
// drives it over HTTP exactly as a browser would, so every layer — routing,
// CSRF, sessions, form coercion, SQL generation, templates — is exercised.
//
// Isolation: every row the suite creates carries the "admintest-" marker,
// is deleted at the end, and a before/after checksum of every table proves
// nothing else in the database changed.
//
// Run:  go test ./admin/tests/ -v
// The suite skips itself when the database is unreachable.
package tests

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin"
	"github.com/OmarHosny18/APP-frontend/admin/site"
	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
)

// marker prefixes every value the suite writes so leftovers are recognisable
// and the catch-all cleanup can never touch real data.
const marker = "admintest-"

const (
	testAdminEmail    = marker + "runner@monteur.test"
	testAdminPassword = "runner-pass-1234"
	basePath          = "/admin"
)

// harness is one booted portal plus a signed-in HTTP client.
type harness struct {
	t      *testing.T
	ctx    context.Context
	db     *sql.DB
	site   *site.Site
	server *httptest.Server
	client *http.Client
	csrf   string
}

// response is a fully read HTTP response.
type response struct {
	Code     int
	Body     string
	Location string
}

func (r response) contains(s string) bool { return strings.Contains(r.Body, s) }

// newHarness connects, boots the portal with a dedicated bootstrap admin and
// signs in. It registers cleanup that removes everything the suite created.
func newHarness(t *testing.T) *harness {
	t.Helper()
	ctx := context.Background()

	common.InitLogger(false)
	_ = godotenv.Load("../../docker/.env")
	addr := os.Getenv("DB_ADDR")
	if addr == "" {
		t.Skip("DB_ADDR not set; integration suite needs PostgreSQL")
	}
	// The suite writes to and deletes from the database it is pointed at.
	// Every row it touches carries the marker, but a wrong DB_ADDR must not
	// be able to reach a shared or production server by accident.
	if !isLocalDatabase(addr) && os.Getenv("ADMIN_TESTS_ALLOW_REMOTE_DB") != "1" {
		t.Skipf("DB_ADDR does not point at localhost; set ADMIN_TESTS_ALLOW_REMOTE_DB=1 to run against it anyway")
	}
	db, err := config.NewDatabase(ctx, addr, "5m", "30m", 20, 5)
	if err != nil {
		t.Skipf("database unreachable (%v); integration suite needs PostgreSQL", err)
	}
	t.Cleanup(func() { db.Close() })

	if !tableExists(t, db, "admin_log") {
		t.Skip("admin_log table missing — run `goose up` before the suite")
	}

	cfg := admin.LoadConfig(false, "test-session-key")
	cfg.BasePath = basePath
	cfg.BootstrapEmail = testAdminEmail
	cfg.BootstrapPassword = testAdminPassword
	cfg.BootstrapName = "Suite Runner"

	// Remove leftovers from an earlier aborted run before booting, so the
	// bootstrap account is created fresh with the expected password.
	purgeTestData(t, db)

	portal, err := admin.Build(ctx, cfg, db)
	if err != nil {
		t.Fatalf("admin.Build: %v", err)
	}

	server := httptest.NewServer(portal.Handler)
	t.Cleanup(server.Close)

	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar: jar,
		// Redirects are assertions in this suite, never followed silently.
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		Timeout:       30 * time.Second,
	}

	h := &harness{t: t, ctx: ctx, db: db, site: portal.Site, server: server, client: client}
	t.Cleanup(func() { purgeTestData(t, db) })
	return h
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

func (h *harness) url(path string) string { return h.server.URL + path }

func (h *harness) get(path string) response {
	h.t.Helper()
	resp, err := h.client.Get(h.url(path))
	if err != nil {
		h.t.Fatalf("GET %s: %v", path, err)
	}
	return read(h.t, resp)
}

// post submits an application/x-www-form-urlencoded form with the session's
// CSRF token attached.
func (h *harness) post(path string, form url.Values) response {
	h.t.Helper()
	return h.postRaw(path, form, true)
}

func (h *harness) postRaw(path string, form url.Values, withCSRF bool) response {
	h.t.Helper()
	if form == nil {
		form = url.Values{}
	}
	if withCSRF && h.csrf != "" {
		form.Set("csrfmiddlewaretoken", h.csrf)
	}
	resp, err := h.client.PostForm(h.url(path), form)
	if err != nil {
		h.t.Fatalf("POST %s: %v", path, err)
	}
	return read(h.t, resp)
}

func read(t *testing.T, resp *http.Response) response {
	t.Helper()
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return response{Code: resp.StatusCode, Body: string(body), Location: resp.Header.Get("Location")}
}

var reCSRF = regexp.MustCompile(`name="csrfmiddlewaretoken" value="([0-9a-f]+)"`)

func extractCSRF(body string) string {
	m := reCSRF.FindStringSubmatch(body)
	if m == nil {
		return ""
	}
	return m[1]
}

// login signs the client in and captures the post-login CSRF token.
func (h *harness) login(email, password string) response {
	h.t.Helper()
	page := h.get(basePath + "/login/")
	form := url.Values{
		"csrfmiddlewaretoken": {extractCSRF(page.Body)},
		"email":               {email},
		"password":            {password},
	}
	resp := h.postRaw(basePath+"/login/", form, false)
	if resp.Code == http.StatusFound {
		// The token rotates on login; pick up the new one from the index —
		// or from wherever the index sends us (two-factor verify/setup).
		page := h.get(basePath + "/")
		if page.Code == http.StatusFound {
			page = h.get(page.Location)
		}
		h.csrf = extractCSRF(page.Body)
	}
	return resp
}

func (h *harness) loginAsRunner() {
	h.t.Helper()
	if resp := h.login(testAdminEmail, testAdminPassword); resp.Code != http.StatusFound {
		h.t.Fatalf("login failed: %d", resp.Code)
	}
}

func (h *harness) logout() {
	h.t.Helper()
	h.post(basePath+"/logout/", nil)
	h.csrf = ""
}

// run is t.Run with the harness pointed at the subtest, so helper failures
// (h.count, h.exec, …) are reported on the right test instead of the parent.
func (h *harness) run(t *testing.T, name string, fn func(t *testing.T)) bool {
	return t.Run(name, func(t *testing.T) {
		prev := h.t
		h.t = t
		defer func() { h.t = prev }()
		fn(t)
	})
}

// timed runs fn and returns how long it took.
func timed(fn func()) time.Duration {
	start := time.Now()
	fn()
	return time.Since(start)
}

// ─── Models ──────────────────────────────────────────────────────────────────

func (h *harness) model(table string) *site.Model {
	h.t.Helper()
	m, ok := h.site.Lookup("app", table)
	if !ok {
		h.t.Fatalf("model %s not registered", table)
	}
	return m
}

func (h *harness) models() []*site.Model {
	var out []*site.Model
	for _, a := range h.site.Apps() {
		out = append(out, a.Models()...)
	}
	return out
}

// ─── Database helpers ────────────────────────────────────────────────────────

func tableExists(t *testing.T, db *sql.DB, name string) bool {
	t.Helper()
	var ok bool
	err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`, name).Scan(&ok)
	if err != nil {
		t.Fatal(err)
	}
	return ok
}

func (h *harness) queryString(q string, args ...any) string {
	h.t.Helper()
	var s sql.NullString
	if err := h.db.QueryRowContext(h.ctx, q, args...).Scan(&s); err != nil {
		h.t.Fatalf("query %q: %v", q, err)
	}
	return s.String
}

func (h *harness) count(table, where string, args ...any) int {
	h.t.Helper()
	var n int
	q := "SELECT COUNT(*) FROM " + pq.QuoteIdentifier(table)
	if where != "" {
		q += " WHERE " + where
	}
	if err := h.db.QueryRowContext(h.ctx, q, args...).Scan(&n); err != nil {
		h.t.Fatalf("count %s: %v", table, err)
	}
	return n
}

func (h *harness) exec(q string, args ...any) {
	h.t.Helper()
	if _, err := h.db.ExecContext(h.ctx, q, args...); err != nil {
		h.t.Fatalf("exec %q: %v", q, err)
	}
}

// purgeTestData removes every row the suite could have created. Users
// cascade to jobs, proposals, projects, conversations, messages, … so the
// user delete alone clears most of the graph; the rest is explicit.
func purgeTestData(t *testing.T, db *sql.DB) {
	t.Helper()
	stmts := []string{
		`DELETE FROM notifications WHERE title LIKE 'admintest-%' OR user_id IN (SELECT id FROM users WHERE email LIKE 'admintest-%')`,
		`DELETE FROM users WHERE email LIKE 'admintest-%'`,
		`DELETE FROM admin_log WHERE admin_email LIKE 'admintest-%'`,
		`DELETE FROM admin_login_attempts WHERE subject LIKE 'email:admintest-%' OR subject LIKE 'ip:%'`,
		`DELETE FROM admins WHERE email LIKE 'admintest-%'`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("purge: %s: %v", s, err)
		}
	}
}

// snapshot is a per-table row count and content checksum, used to prove the
// suite leaves the database exactly as it found it.
type snapshot map[string]tableState

type tableState struct {
	Count    int
	Checksum string
}

func (h *harness) snapshot() snapshot {
	h.t.Helper()
	rows, err := h.db.QueryContext(h.ctx,
		`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`)
	if err != nil {
		h.t.Fatal(err)
	}
	defer rows.Close()

	out := snapshot{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			h.t.Fatal(err)
		}
		if name == "admin_log" || name == "goose_db_version" {
			continue // the audit log legitimately grows during the run
		}
		// Rows carrying the suite marker are excluded: the runner admin's
		// last_login_at legitimately changes when the suite signs in.
		q := fmt.Sprintf(`SELECT COUNT(*), COALESCE(md5(string_agg(t::text, '|' ORDER BY t::text)), '')
			FROM %s t WHERE t::text NOT LIKE '%%admintest-%%'`, pq.QuoteIdentifier(name))
		var st tableState
		if err := h.db.QueryRowContext(h.ctx, q).Scan(&st.Count, &st.Checksum); err != nil {
			h.t.Fatalf("snapshot %s: %v", name, err)
		}
		out[name] = st
	}
	if err := rows.Err(); err != nil {
		h.t.Fatalf("snapshot: %v", err)
	}
	return out
}

// isLocalDatabase reports whether a postgres:// URL points at this machine.
func isLocalDatabase(addr string) bool {
	u, err := url.Parse(addr)
	if err != nil {
		return false
	}
	switch u.Hostname() {
	case "localhost", "127.0.0.1", "::1":
		return true
	}
	return false
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func uniqueEmail(tag string) string {
	return fmt.Sprintf("%s%s-%s@monteur.test", marker, tag, randomHex(4))
}
