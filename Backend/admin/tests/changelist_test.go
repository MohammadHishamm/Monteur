package tests

import (
	"html"
	"net/http"
	"net/url"
	"regexp"
	"testing"
)

var reFilterLink = regexp.MustCompile(`<li class="[^"]*"><a href="([^"]+)">`)

// testChangelists hammers every changelist with every sort order, every
// filter option, search and paging — the full matrix of SQL the repository
// can generate for the live schema. Fixture rows exist at this point, so
// each list has at least one row to render.
func testChangelists(t *testing.T, h *harness, fx *fixtures) {
	for _, m := range h.models() {
		m := m
		h.run(t, m.Name(), func(t *testing.T) {
			list := h.get(m.URL())
			if list.Code != http.StatusOK {
				t.Fatalf("changelist: %d", list.Code)
			}
			if !readOnlyTables[m.Name()] && !list.contains(`value="`+fx.first(m.Name())+`"`) {
				t.Errorf("fixture row %s is not listed", fx.first(m.Name()))
			}

			for _, col := range m.Admin.ListDisplay {
				for _, dir := range []string{"", "-"} {
					if resp := h.get(m.URL() + "?o=" + url.QueryEscape(dir+col)); resp.Code != http.StatusOK {
						t.Errorf("sort by %s%s: %d", dir, col, resp.Code)
					}
				}
			}

			if len(m.Admin.SearchFields) > 0 {
				resp := h.get(m.URL() + "?q=" + url.QueryEscape(marker))
				if resp.Code != http.StatusOK {
					t.Errorf("search: %d", resp.Code)
				}
				if resp := h.get(m.URL() + "?q=" + url.QueryEscape("%_\\'\"")); resp.Code != http.StatusOK {
					t.Errorf("search with LIKE metacharacters: %d", resp.Code)
				}
			}

			// Every link in the filter sidebar must produce a valid page.
			for _, link := range reFilterLink.FindAllStringSubmatch(list.Body, -1) {
				href := html.UnescapeString(link[1])
				if resp := h.get(href); resp.Code != http.StatusOK {
					t.Errorf("filter %s: %d", href, resp.Code)
				}
			}

			for _, q := range []string{"?p=0", "?p=1", "?p=999", "?o=not_a_column", "?created_at=garbage"} {
				if resp := h.get(m.URL() + q); resp.Code != http.StatusOK {
					t.Errorf("%s: %d", q, resp.Code)
				}
			}
		})
	}

	h.run(t, "unknown model and unknown row are 404", func(t *testing.T) {
		if h.get(basePath+"/app/not_a_table/").Code != http.StatusNotFound {
			t.Error("unknown model")
		}
		if h.get(basePath+"/nope/users/").Code != http.StatusNotFound {
			t.Error("unknown app")
		}
		users := h.model("users")
		if h.get(users.ObjectURL("00000000-0000-0000-0000-000000000000")).Code != http.StatusNotFound {
			t.Error("unknown key")
		}
		if h.get(users.ObjectURL("not-even-a-uuid")).Code != http.StatusNotFound {
			t.Error("malformed key must be 404, not 500")
		}
	})

	h.run(t, "filters combine with search and ordering", func(t *testing.T) {
		users := h.model("users")
		resp := h.get(users.URL() + "?user_type=client&is_active=1&q=" + url.QueryEscape(marker) + "&o=-email")
		if resp.Code != http.StatusOK || !resp.contains(`value="`+fx.client+`"`) {
			t.Fatalf("client fixture missing from filtered list: %d", resp.Code)
		}
		if resp.contains(`value="` + fx.freelancer + `"`) {
			t.Error("freelancer fixture must be filtered out")
		}
		if !resp.contains("Clear all filters") {
			t.Error("active filters should offer a clear link")
		}
	})

	h.run(t, "foreign keys render as labels linking to the related row", func(t *testing.T) {
		jobs := h.model("jobs")
		resp := h.get(jobs.URL() + "?q=" + url.QueryEscape(marker))
		clientEmail := h.queryString(`SELECT email FROM users WHERE id::text = $1`, fx.client)
		if !resp.contains(`href="`+h.model("users").ObjectURL(fx.client)+`"`) || !resp.contains(">"+clientEmail+"<") {
			t.Error("client_id should show the client's email and link to it")
		}
	})
}
