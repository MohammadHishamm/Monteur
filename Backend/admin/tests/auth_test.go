package tests

import (
	"net/http"
	"net/url"
	"strings"
	"testing"
)

// testAuth covers sign-in, sign-out, session gating, CSRF and the open
// redirect guard. It leaves the harness signed in as the runner.
func testAuth(t *testing.T, h *harness, _ *fixtures) {
	h.run(t, "anonymous is redirected to login with next", func(t *testing.T) {
		resp := h.get(basePath + "/app/users/")
		if resp.Code != http.StatusFound || !strings.HasPrefix(resp.Location, basePath+"/login/?next=") {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
	})

	h.run(t, "bare /admin redirects to /admin/", func(t *testing.T) {
		resp := h.get(basePath)
		if resp.Code != http.StatusMovedPermanently || resp.Location != basePath+"/" {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
	})

	h.run(t, "missing trailing slash is appended", func(t *testing.T) {
		resp := h.get(basePath + "/login")
		if resp.Code != http.StatusMovedPermanently || resp.Location != basePath+"/login/" {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
	})

	h.run(t, "wrong password is rejected without leaking which field", func(t *testing.T) {
		resp := h.login(testAdminEmail, "not-the-password")
		if resp.Code != http.StatusOK || !resp.contains("Please enter the correct email and password") {
			t.Fatalf("got %d", resp.Code)
		}
		if h.get(basePath+"/").Code != http.StatusFound {
			t.Fatal("a failed login must not create a session")
		}
	})

	h.run(t, "unknown email gets the same message", func(t *testing.T) {
		resp := h.login(marker+"nobody@monteur.test", "whatever")
		if resp.Code != http.StatusOK || !resp.contains("Please enter the correct email and password") {
			t.Fatalf("got %d", resp.Code)
		}
	})

	h.run(t, "login without CSRF token is refused", func(t *testing.T) {
		resp := h.postRaw(basePath+"/login/", url.Values{"email": {testAdminEmail}, "password": {testAdminPassword}}, false)
		if resp.Code != http.StatusForbidden {
			t.Fatalf("got %d", resp.Code)
		}
	})

	h.run(t, "open redirect via next is neutralised", func(t *testing.T) {
		page := h.get(basePath + "/login/")
		resp := h.postRaw(basePath+"/login/", url.Values{
			"csrfmiddlewaretoken": {extractCSRF(page.Body)},
			"email":               {testAdminEmail},
			"password":            {testAdminPassword},
			"next":                {"https://evil.example/phish"},
		}, false)
		if resp.Code != http.StatusFound || resp.Location != basePath+"/" {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
		h.csrf = extractCSRF(h.get(basePath + "/").Body)
	})

	h.run(t, "index renders every registered model for a signed-in admin", func(t *testing.T) {
		resp := h.get(basePath + "/")
		if resp.Code != http.StatusOK || !resp.contains("Site administration") {
			t.Fatalf("got %d", resp.Code)
		}
		for _, m := range h.models() {
			if !resp.contains(`href="` + m.URL() + `"`) {
				t.Errorf("index is missing a link to %s", m.URL())
			}
		}
		if !resp.contains("Suite Runner") {
			t.Error("header should greet the signed-in admin by name")
		}
	})

	h.run(t, "login page bounces a signed-in admin home", func(t *testing.T) {
		resp := h.get(basePath + "/login/")
		if resp.Code != http.StatusFound || resp.Location != basePath+"/" {
			t.Fatalf("got %d %q", resp.Code, resp.Location)
		}
	})

	h.run(t, "POST without CSRF token is refused even when signed in", func(t *testing.T) {
		resp := h.postRaw(basePath+"/app/users/add/", url.Values{"email": {uniqueEmail("csrf")}}, false)
		if resp.Code != http.StatusForbidden {
			t.Fatalf("got %d", resp.Code)
		}
	})

	h.run(t, "logout ends the session", func(t *testing.T) {
		h.logout()
		if h.get(basePath+"/").Code != http.StatusFound {
			t.Fatal("still signed in after logout")
		}
		h.loginAsRunner()
	})

	h.run(t, "deactivated admin loses access on the next request", func(t *testing.T) {
		h.exec(`UPDATE admins SET is_active = false WHERE email = $1`, testAdminEmail)
		defer h.exec(`UPDATE admins SET is_active = true WHERE email = $1`, testAdminEmail)
		if h.get(basePath+"/").Code != http.StatusFound {
			t.Fatal("inactive admin still has access")
		}
	})

	h.loginAsRunner()
}
