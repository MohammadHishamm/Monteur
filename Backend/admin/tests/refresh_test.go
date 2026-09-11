package tests

import (
	"net/http"
	"net/url"
	"strconv"
	"testing"
)

// testInstantRefresh proves the portal never serves stale data: a write made
// through the portal or straight in SQL is visible on the very next request,
// and a deleted row disappears just as fast.
func testInstantRefresh(t *testing.T, h *harness, fx *fixtures) {
	users := h.model("users")

	h.run(t, "a direct SQL change is visible on the next request", func(t *testing.T) {
		name := marker + "sql edit " + randomHex(2)
		h.exec(`UPDATE users SET full_name = $1 WHERE id::text = $2`, name, fx.client)
		list := h.get(users.URL() + "?q=" + url.QueryEscape(marker))
		if list.Code != http.StatusOK || !list.contains(">"+name+"<") {
			t.Fatal("changelist did not reflect a direct database update")
		}
		if !h.get(users.ObjectURL(fx.client)).contains(`value="` + name + `"`) {
			t.Fatal("change form did not reflect a direct database update")
		}
	})

	h.run(t, "add then list within the same instant", func(t *testing.T) {
		form := fx.addForm(users)
		form.Set("user_type", "client")
		form.Set("full_name", marker+"instant")

		var key string
		elapsed := timed(func() {
			resp := h.post(users.AddURL(), form)
			if resp.Code != http.StatusFound {
				t.Fatalf("add: %d\n%s", resp.Code, formErrors(resp.Body))
			}
			key = h.queryString(`SELECT id::text FROM users WHERE full_name = $1`, marker+"instant")
			list := h.get(users.URL() + "?q=" + url.QueryEscape(marker+"instant"))
			if !list.contains(`value="` + key + `"`) {
				t.Fatal("row missing from the list right after add")
			}
		})
		t.Logf("add + list round trip: %s", elapsed)

		resp := h.post(users.DeleteURL(key), nil)
		if resp.Code != http.StatusFound {
			t.Fatalf("delete: %d", resp.Code)
		}
		if h.get(users.URL() + "?q=" + url.QueryEscape(marker+"instant")).contains(`value="` + key + `"`) {
			t.Fatal("row still listed right after delete")
		}
		if h.get(users.ObjectURL(key)).Code != http.StatusNotFound {
			t.Fatal("change page still served after delete")
		}
	})

	h.run(t, "the row count in the paginator tracks the table", func(t *testing.T) {
		before := h.get(users.URL() + "?q=" + url.QueryEscape(marker))
		form := fx.addForm(users)
		form.Set("user_type", "freelancer")
		if resp := h.post(users.AddURL(), form); resp.Code != http.StatusFound {
			t.Fatalf("add: %d", resp.Code)
		}
		after := h.get(users.URL() + "?q=" + url.QueryEscape(marker))
		n := h.count("users", "email LIKE 'admintest-%'")
		if !after.contains(strconv.Itoa(n)+" users") || before.contains(strconv.Itoa(n)+" users") {
			t.Fatalf("paginator should now say %d users", n)
		}
		h.exec(`DELETE FROM users WHERE email = $1`, form.Get("email"))
	})

	h.run(t, "responses are not cacheable by the browser", func(t *testing.T) {
		resp, err := h.client.Get(h.url(users.URL()))
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.Header.Get("Content-Type") != "text/html; charset=utf-8" {
			t.Errorf("content type %q", resp.Header.Get("Content-Type"))
		}
		if cc := resp.Header.Get("Cache-Control"); cc != "no-store, max-age=0" {
			t.Errorf("Cache-Control = %q; pages must never be cached", cc)
		}
		if resp.Header.Get("X-Frame-Options") != "DENY" {
			t.Error("clickjacking protection header missing")
		}
	})

}
