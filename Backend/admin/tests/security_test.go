package tests

import (
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/OmarHosny18/APP-frontend/admin"
	"github.com/OmarHosny18/APP-frontend/admin/auth"
)

const lockoutMessage = "Account locked: too many login attempts"

func (h *harness) clearLockouts() {
	h.t.Helper()
	h.exec(`DELETE FROM admin_login_attempts WHERE subject LIKE 'email:admintest-%' OR subject LIKE 'ip:%'`)
}

// testLockout proves repeated failures lock the account and the IP, that a
// correct password does not bypass the lock, and that the lock is per
// subject. It leaves the harness signed in as the runner.
func testLockout(t *testing.T, h *harness, _ *fixtures) {
	h.logout()
	h.clearLockouts()
	defer func() {
		h.clearLockouts()
		h.loginAsRunner()
	}()

	h.run(t, "five failures lock the account", func(t *testing.T) {
		var last response
		for i := 0; i < 5; i++ {
			last = h.login(testAdminEmail, "wrong-"+strings.Repeat("x", i))
		}
		if last.Code != http.StatusTooManyRequests || !last.contains(lockoutMessage) {
			t.Fatalf("5th failure: %d", last.Code)
		}
		if n := h.count("admin_login_attempts", "locked_until > NOW()"); n < 2 {
			t.Fatalf("expected ip and email subjects locked, got %d rows", n)
		}
	})

	h.run(t, "the correct password is refused while locked", func(t *testing.T) {
		resp := h.login(testAdminEmail, testAdminPassword)
		if resp.Code != http.StatusTooManyRequests || !resp.contains(lockoutMessage) {
			t.Fatalf("got %d", resp.Code)
		}
		if h.get(basePath+"/").Code != http.StatusFound {
			t.Fatal("a locked login must not create a session")
		}
	})

	h.run(t, "an expired lock lets the admin back in", func(t *testing.T) {
		h.exec(`UPDATE admin_login_attempts SET locked_until = NOW() - INTERVAL '1 second'`)
		if resp := h.login(testAdminEmail, testAdminPassword); resp.Code != http.StatusFound {
			t.Fatalf("got %d", resp.Code)
		}
		if h.count("admin_login_attempts", "subject = $1", "email:"+testAdminEmail) != 0 {
			t.Error("a successful login should reset the account's counter")
		}
		h.logout()
	})

	h.run(t, "failures inside the window accumulate, outside it they reset", func(t *testing.T) {
		h.clearLockouts()
		for i := 0; i < 4; i++ {
			h.login(testAdminEmail, "wrong")
		}
		// Age the window past its limit: the next failure must start a new count.
		h.exec(`UPDATE admin_login_attempts SET window_started_at = NOW() - INTERVAL '1 hour'`)
		if resp := h.login(testAdminEmail, "wrong"); resp.Code == http.StatusTooManyRequests {
			t.Fatal("a failure after the window expired must not lock")
		}
		if resp := h.login(testAdminEmail, testAdminPassword); resp.Code != http.StatusFound {
			t.Fatalf("login after expired window: %d", resp.Code)
		}
		h.logout()
	})
}

var (
	reSecret = regexp.MustCompile(`<code[^>]*>([A-Z2-7 ]+)</code>`)
	// html/template escapes "+" inside attributes as &#43;.
	reQR = regexp.MustCompile(`src="data:image/png;base64,(?:[A-Za-z0-9/=]|&#43;|\+)+"`)
)

// currentCode computes the authenticator code the way a phone would, for a
// step strictly after lastUsed so the replay guard does not reject it.
func currentCode(t *testing.T, secret string, lastUsed int64) (string, int64) {
	t.Helper()
	step := auth.TOTPStep(time.Now())
	if step <= lastUsed {
		step = lastUsed + 1 // still within the ±1 skew the server accepts
	}
	code, err := auth.TOTPCode(secret, step)
	if err != nil {
		t.Fatal(err)
	}
	return code, step
}

// testTwoFactor walks the full TOTP lifecycle: enrol, challenge on the next
// login, replay rejection, lockout on bad codes, reset by a colleague, and
// the mandatory mode. It leaves the harness signed in, not enrolled.
func testTwoFactor(t *testing.T, h *harness, _ *fixtures) {
	setup := basePath + "/two-factor/setup/"
	verify := basePath + "/two-factor/verify/"
	var secret string
	var lastStep int64

	h.run(t, "unenrolled admin is not challenged when 2FA is optional", func(t *testing.T) {
		if h.get(basePath+"/").Code != http.StatusOK {
			t.Fatal("index should be reachable")
		}
		if h.get(verify).Code != http.StatusFound {
			t.Fatal("verify page should bounce an unenrolled admin")
		}
	})

	h.run(t, "setup page shows a QR code and the key", func(t *testing.T) {
		page := h.get(setup)
		if page.Code != http.StatusOK || !reQR.MatchString(page.Body) {
			t.Fatalf("setup page: %d, qr=%v", page.Code, reQR.MatchString(page.Body))
		}
		m := reSecret.FindStringSubmatch(page.Body)
		if m == nil {
			t.Fatal("secret not shown for manual entry")
		}
		secret = strings.ReplaceAll(m[1], " ", "")
		if h.queryString(`SELECT COALESCE(totp_secret, '') FROM admins WHERE email = $1`, testAdminEmail) != "" {
			t.Fatal("opening the setup page must not touch the database")
		}
	})

	h.run(t, "a wrong code does not enrol", func(t *testing.T) {
		resp := h.post(setup, url.Values{"code": {"000000"}})
		if resp.Code != http.StatusBadRequest || !resp.contains("Invalid authentication code") {
			t.Fatalf("got %d", resp.Code)
		}
	})

	h.run(t, "a valid code enrols", func(t *testing.T) {
		code, step := currentCode(t, secret, 0)
		resp := h.post(setup, url.Values{"code": {code}, "next": {basePath + "/app/users/"}})
		if resp.Code != http.StatusFound || resp.Location != basePath+"/app/users/" {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
		lastStep = step
		if h.queryString(`SELECT totp_secret FROM admins WHERE email = $1`, testAdminEmail) != secret {
			t.Fatal("secret not stored")
		}
		if h.queryString(`SELECT totp_confirmed_at::text FROM admins WHERE email = $1`, testAdminEmail) == "" {
			t.Fatal("enrolment not confirmed")
		}
		if !h.get(basePath + "/").contains("Two-factor: on") {
			t.Error("header should show two-factor is on")
		}
	})

	h.run(t, "next login is challenged for a code", func(t *testing.T) {
		h.logout()
		h.loginAsRunner()
		resp := h.get(basePath + "/app/users/")
		if resp.Code != http.StatusFound || !strings.HasPrefix(resp.Location, verify+"?next=") {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
		if h.get(verify).Code != http.StatusOK {
			t.Fatal("verify page")
		}
		if h.get(setup).Code != http.StatusFound {
			t.Fatal("setup must not be reachable before verifying — that would allow a silent downgrade")
		}
	})

	h.run(t, "wrong and replayed codes are rejected", func(t *testing.T) {
		if resp := h.post(verify, url.Values{"code": {"123456"}}); resp.Code != http.StatusBadRequest {
			t.Fatalf("wrong code: %d", resp.Code)
		}
		replay, _ := auth.TOTPCode(secret, lastStep) // the code used to enrol
		if resp := h.post(verify, url.Values{"code": {replay}}); resp.Code != http.StatusBadRequest {
			t.Fatalf("replayed code: %d", resp.Code)
		}
		if h.get(basePath+"/").Code != http.StatusFound {
			t.Fatal("still must not be signed in")
		}
	})

	h.run(t, "a fresh code completes sign-in", func(t *testing.T) {
		code, step := currentCode(t, secret, lastStep)
		resp := h.post(verify, url.Values{"code": {code}, "next": {basePath + "/app/jobs/"}})
		if resp.Code != http.StatusFound || resp.Location != basePath+"/app/jobs/" {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
		lastStep = step
		if h.get(basePath+"/").Code != http.StatusOK {
			t.Fatal("index after verification")
		}
		if resp := h.get(verify); resp.Code != http.StatusFound {
			t.Error("verify page should bounce a verified session")
		}
	})

	h.run(t, "repeated bad codes lock the account", func(t *testing.T) {
		h.logout()
		h.clearLockouts()
		h.loginAsRunner()
		var last response
		for i := 0; i < 5; i++ {
			last = h.post(verify, url.Values{"code": {"999999"}})
		}
		if last.Code != http.StatusTooManyRequests || !last.contains(lockoutMessage) {
			t.Fatalf("5th bad code: %d", last.Code)
		}
		h.clearLockouts()
		// Test-only: rewind the replay guard so a current code is usable again.
		h.exec(`UPDATE admins SET totp_last_used_step = 0 WHERE email = $1`, testAdminEmail)
		code, step := currentCode(t, secret, 0)
		if resp := h.post(verify, url.Values{"code": {code}}); resp.Code != http.StatusFound {
			t.Fatalf("verify after clearing lock: %d", resp.Code)
		}
		lastStep = step
	})

	h.run(t, "a colleague resets a lost device from the Admins page", func(t *testing.T) {
		admins := h.model("admins")
		id := h.queryString(`SELECT id::text FROM admins WHERE email = $1`, testAdminEmail)
		page := h.get(admins.ObjectURL(id))
		if page.Code != http.StatusOK || page.contains(secret) {
			t.Fatalf("change page: %d, secret leaked=%v", page.Code, page.contains(secret))
		}
		if !page.contains(`name="totp_secret__clear"`) {
			t.Fatal("no Clear checkbox for the secret")
		}
		list := h.get(admins.URL())
		if list.contains(secret) {
			t.Fatal("secret leaked into the changelist")
		}

		f := scrapeForm(page.Body)
		f.Set("totp_secret__clear", "on")
		if resp := h.post(admins.ObjectURL(id), f); resp.Code != http.StatusFound {
			t.Fatalf("clear: %d\n%s", resp.Code, formErrors(resp.Body))
		}
		if h.queryString(`SELECT COALESCE(totp_secret, '') FROM admins WHERE email = $1`, testAdminEmail) != "" {
			t.Fatal("secret not cleared")
		}
		assertLastLog(t, h, admins, 2, "Changed totp_secret.")
		if !h.get(basePath + "/").contains("Set up two-factor") {
			t.Error("header should show two-factor is off again")
		}
	})

	h.run(t, "mandatory mode forces enrolment before anything else", func(t *testing.T) {
		cfg := admin.LoadConfig(false, "test-session-key")
		cfg.BasePath = basePath
		cfg.BootstrapPassword = "" // account already exists
		cfg.TwoFactorRequired = true
		portal, err := admin.Build(h.ctx, cfg, h.db)
		if err != nil {
			t.Fatal(err)
		}
		srv := httptest.NewServer(portal.Handler)
		defer srv.Close()
		jar, _ := cookiejar.New(nil)
		strict := &harness{t: t, ctx: h.ctx, db: h.db, site: portal.Site, server: srv, client: &http.Client{
			Jar:           jar,
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		}}

		if resp := strict.login(testAdminEmail, testAdminPassword); resp.Code != http.StatusFound {
			t.Fatalf("login: %d", resp.Code)
		}
		for _, path := range []string{basePath + "/", basePath + "/app/users/", basePath + "/app/users/add/"} {
			resp := strict.get(path)
			if resp.Code != http.StatusFound || !strings.HasPrefix(resp.Location, setup) {
				t.Errorf("%s: got %d %q, want redirect to setup", path, resp.Code, resp.Location)
			}
		}
		setupPage := strict.get(setup)
		if setupPage.Code != http.StatusOK {
			t.Error("setup page itself must be reachable")
		}
		strict.csrf = extractCSRF(setupPage.Body)
		if strict.post(basePath+"/logout/", nil).Code != http.StatusFound {
			t.Error("logout must be reachable")
		}
	})
}
