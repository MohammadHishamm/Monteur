package tests

import (
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
)

// testValidation submits deliberately broken forms and checks that each
// mistake is reported on the form (400) with Django's wording, and that
// nothing is written. Database constraint failures must surface as
// readable messages, never as a 500.
func testValidation(t *testing.T, h *harness, fx *fixtures) {
	users := h.model("users")
	jobs := h.model("jobs")

	expectFieldError := func(t *testing.T, resp response, field, message string) {
		t.Helper()
		if resp.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d (redirect %q)", resp.Code, resp.Location)
		}
		if !resp.contains(`field-`+field+` errors`) || !resp.contains(message) {
			t.Errorf("expected %q on field %s; form errors were:\n%s", message, field, formErrors(resp.Body))
		}
	}

	h.run(t, "blank add form reports every required field", func(t *testing.T) {
		before := h.count("users", "")
		resp := h.post(users.AddURL(), url.Values{})
		for _, f := range []string{"email", "full_name", "user_type", "password_hash"} {
			expectFieldError(t, resp, f, "This field is required.")
		}
		if h.count("users", "") != before {
			t.Error("invalid form must not insert")
		}
	})

	base := func() url.Values {
		f := fx.addForm(users)
		f.Set("user_type", "client")
		return f
	}

	h.run(t, "invalid JSON", func(t *testing.T) {
		f := base()
		f.Set("languages", `{not json`)
		expectFieldError(t, h.post(users.AddURL(), f), "languages", "Enter valid JSON.")
	})

	h.run(t, "invalid choice", func(t *testing.T) {
		f := base()
		f.Set("user_type", "alien")
		expectFieldError(t, h.post(users.AddURL(), f), "user_type", "Select a valid choice.")
	})

	h.run(t, "invalid whole number", func(t *testing.T) {
		f := base()
		f.Set("years_of_experience", "many")
		expectFieldError(t, h.post(users.AddURL(), f), "years_of_experience", "Enter a whole number.")
	})

	h.run(t, "invalid decimal", func(t *testing.T) {
		f := base()
		f.Set("hourly_rate", "12,50")
		expectFieldError(t, h.post(users.AddURL(), f), "hourly_rate", "Enter a number.")
	})

	h.run(t, "invalid timestamp", func(t *testing.T) {
		f := base()
		f.Set("last_login_at", "yesterday")
		expectFieldError(t, h.post(users.AddURL(), f), "last_login_at", "Enter a valid date/time")
	})

	h.run(t, "too long for varchar", func(t *testing.T) {
		f := base()
		f.Set("phone", strings.Repeat("9", 40)) // phone is VARCHAR(20)
		expectFieldError(t, h.post(users.AddURL(), f), "phone", "at most 20 characters")
	})

	h.run(t, "invalid UUID in a foreign key", func(t *testing.T) {
		f := fx.addForm(jobs)
		f.Set("client_id", "not-a-uuid")
		expectFieldError(t, h.post(jobs.AddURL(), f), "client_id", "Enter a valid UUID.")
	})

	h.run(t, "several errors are reported together", func(t *testing.T) {
		f := base()
		f.Set("languages", "x")
		f.Set("user_type", "alien")
		f.Set("years_of_experience", "x")
		resp := h.post(users.AddURL(), f)
		expectFieldError(t, resp, "languages", "Enter valid JSON.")
		expectFieldError(t, resp, "user_type", "Select a valid choice.")
		expectFieldError(t, resp, "years_of_experience", "Enter a whole number.")
		if !resp.contains("Please correct the errors below.") {
			t.Error("plural error note expected")
		}
	})

	h.run(t, "posted values are echoed back after an error", func(t *testing.T) {
		f := base()
		f.Set("full_name", marker+"echo me")
		f.Set("languages", "broken")
		resp := h.post(users.AddURL(), f)
		if !resp.contains(`value="` + marker + `echo me"`) {
			t.Error("full_name should be pre-filled with the posted value")
		}
		if !resp.contains(`>broken</textarea>`) {
			t.Error("the invalid JSON should be shown for correction")
		}
	})

	h.run(t, "unique violation becomes a form error", func(t *testing.T) {
		f := base()
		f.Set("email", h.queryString(`SELECT email FROM users WHERE id::text = $1`, fx.client))
		resp := h.post(users.AddURL(), f)
		if resp.Code != http.StatusBadRequest || !resp.contains("already exists") {
			t.Fatalf("got %d: %s", resp.Code, formErrors(resp.Body))
		}
	})

	h.run(t, "dangling foreign key becomes a form error", func(t *testing.T) {
		f := fx.addForm(jobs)
		f.Set("client_id", uuid.NewString())
		resp := h.post(jobs.AddURL(), f)
		if resp.Code != http.StatusBadRequest || !resp.contains("Referenced row does not exist") {
			t.Fatalf("got %d: %s", resp.Code, formErrors(resp.Body))
		}
	})

	h.run(t, "range CHECK violation becomes a form error", func(t *testing.T) {
		f := base()
		f.Set("profile_completion", "250") // CHECK (0..100)
		resp := h.post(users.AddURL(), f)
		if resp.Code != http.StatusBadRequest || !resp.contains("rejected by constraint") {
			t.Fatalf("got %d: %s", resp.Code, formErrors(resp.Body))
		}
	})

	h.run(t, "blank required field on change is rejected", func(t *testing.T) {
		page := h.get(users.ObjectURL(fx.client))
		f := scrapeForm(page.Body)
		f.Set("warning_count", "")
		expectFieldError(t, h.post(users.ObjectURL(fx.client), f), "warning_count", "This field is required.")
	})

	h.run(t, "readonly columns cannot be written through the form", func(t *testing.T) {
		page := h.get(users.ObjectURL(fx.client))
		f := scrapeForm(page.Body)
		f.Set("id", uuid.NewString())
		f.Set("created_at", "2000-01-01T00:00:00")
		before := h.queryString(`SELECT id::text || '|' || created_at::text FROM users WHERE id::text = $1`, fx.client)
		if resp := h.post(users.ObjectURL(fx.client), f); resp.Code != http.StatusFound {
			t.Fatalf("got %d: %s", resp.Code, formErrors(resp.Body))
		}
		after := h.queryString(`SELECT id::text || '|' || created_at::text FROM users WHERE id::text = $1`, fx.client)
		if before != after {
			t.Error("id/created_at changed despite being readonly")
		}
	})

	h.run(t, "blank password on change keeps the hash, non-blank rehashes", func(t *testing.T) {
		hashBefore := h.queryString(`SELECT password_hash FROM users WHERE id::text = $1`, fx.client)

		f := scrapeForm(h.get(users.ObjectURL(fx.client)).Body)
		f.Set("password_hash", "")
		if resp := h.post(users.ObjectURL(fx.client), f); resp.Code != http.StatusFound {
			t.Fatalf("blank password: %d", resp.Code)
		}
		if h.queryString(`SELECT password_hash FROM users WHERE id::text = $1`, fx.client) != hashBefore {
			t.Fatal("blank password must keep the stored hash")
		}

		f.Set("password_hash", "new-plain-password")
		if resp := h.post(users.ObjectURL(fx.client), f); resp.Code != http.StatusFound {
			t.Fatalf("new password: %d", resp.Code)
		}
		hashAfter := h.queryString(`SELECT password_hash FROM users WHERE id::text = $1`, fx.client)
		if hashAfter == hashBefore || hashAfter == "new-plain-password" || !strings.HasPrefix(hashAfter, "$2") {
			t.Fatalf("password must be bcrypt-hashed, got %q", hashAfter)
		}
	})

	h.run(t, "password is never rendered", func(t *testing.T) {
		page := h.get(users.ObjectURL(fx.client))
		hash := h.queryString(`SELECT password_hash FROM users WHERE id::text = $1`, fx.client)
		if page.contains(hash) {
			t.Error("stored hash leaked into the change form")
		}
		if h.get(users.URL() + "?q=" + url.QueryEscape(marker)).contains(hash) {
			t.Error("stored hash leaked into the changelist")
		}
	})
}
