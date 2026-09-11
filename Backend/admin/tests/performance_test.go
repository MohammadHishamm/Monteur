package tests

import (
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"sync"
	"testing"
	"time"
)

// Latency budgets. Local PostgreSQL in Docker on a laptop answers these in
// tens of milliseconds; the budgets are deliberately loose so a busy CI
// runner does not flake, yet tight enough to catch an accidental N+1 query
// or a missing index on a 5k-row table.
const (
	perfRows        = 5000
	budgetPerPage   = 750 * time.Millisecond // any single page
	budgetMeanPage  = 250 * time.Millisecond // mean over the sample
	budgetP95Page   = 500 * time.Millisecond
	concurrency     = 16
	requestsPerConn = 10
)

// testPerformance seeds a few thousand users, then measures the pages an
// admin actually uses — index, changelist, filtered/sorted/searched/paged
// changelist, change form, add — and a burst of concurrent requests.
func testPerformance(t *testing.T, h *harness, fx *fixtures) {
	users := h.model("users")

	h.exec(`
		INSERT INTO users (email, password_hash, full_name, user_type, status, country, tier, city)
		SELECT 'admintest-perf-' || i || '@monteur.test', 'x', 'admintest-perf user ' || i,
		       CASE WHEN i % 2 = 0 THEN 'client' ELSE 'freelancer' END,
		       'offline', 'EG',
		       (ARRAY['bronze','silver','gold','platinum'])[1 + i % 4],
		       'Cairo'
		FROM generate_series(1, $1) AS i`, perfRows)
	defer h.exec(`DELETE FROM users WHERE email LIKE 'admintest-perf-%'`)

	if n := h.count("users", "email LIKE 'admintest-perf-%'"); n != perfRows {
		t.Fatalf("seeded %d rows, want %d", n, perfRows)
	}

	pages := []struct {
		name string
		path string
	}{
		{"index", basePath + "/"},
		{"changelist first page", users.URL()},
		{"changelist page 20", users.URL() + "?p=20"},
		{"changelist last page", users.URL() + "?p=9999"},
		{"changelist sorted by email desc", users.URL() + "?o=-email"},
		{"changelist filtered (tier=gold, freelancer)", users.URL() + "?tier=gold&user_type=freelancer"},
		{"changelist date filter", users.URL() + "?created_at=today"},
		{"changelist search", users.URL() + "?q=" + url.QueryEscape("perf user 4999")},
		{"changelist search + filter + sort + page", users.URL() + "?q=perf&user_type=client&o=-created_at&p=3"},
		{"change form", users.ObjectURL(fx.client)},
		{"add form", users.AddURL()},
		{"jobs changelist (FK labels)", h.model("jobs").URL()},
		{"admin_log changelist", h.model("admin_log").URL()},
	}

	// Warm the connection pool and the OS page cache once.
	h.get(users.URL())

	for _, p := range pages {
		p := p
		h.run(t, p.name, func(t *testing.T) {
			var samples []time.Duration
			for i := 0; i < 5; i++ {
				var resp response
				d := timed(func() { resp = h.get(p.path) })
				if resp.Code != http.StatusOK {
					t.Fatalf("%s: %d", p.path, resp.Code)
				}
				samples = append(samples, d)
			}
			stats := summarize(samples)
			t.Logf("%-45s min %6s  mean %6s  max %6s", p.name, stats.min, stats.mean, stats.max)
			if stats.max > budgetPerPage {
				t.Errorf("slowest request %s exceeds budget %s", stats.max, budgetPerPage)
			}
			if stats.mean > budgetMeanPage {
				t.Errorf("mean %s exceeds budget %s", stats.mean, budgetMeanPage)
			}
		})
	}

	h.run(t, "add round trip", func(t *testing.T) {
		form := fx.addForm(users)
		form.Set("user_type", "client")
		var resp response
		d := timed(func() { resp = h.post(users.AddURL(), form) })
		if resp.Code != http.StatusFound {
			t.Fatalf("add: %d\n%s", resp.Code, formErrors(resp.Body))
		}
		t.Logf("add (bcrypt + insert + audit log): %s", d)
		if d > budgetPerPage {
			t.Errorf("add took %s, budget %s", d, budgetPerPage)
		}
		h.exec(`DELETE FROM users WHERE email = $1`, form.Get("email"))
	})

	h.run(t, "concurrent admins", func(t *testing.T) {
		var (
			wg       sync.WaitGroup
			mu       sync.Mutex
			failures []string
			samples  []time.Duration
		)
		paths := []string{users.URL(), users.URL() + "?q=perf&o=-email", basePath + "/", users.ObjectURL(fx.client)}

		total := timed(func() {
			for c := 0; c < concurrency; c++ {
				wg.Add(1)
				go func(c int) {
					defer wg.Done()
					for i := 0; i < requestsPerConn; i++ {
						path := paths[(c+i)%len(paths)]
						start := time.Now()
						resp, err := h.client.Get(h.url(path))
						d := time.Since(start)
						mu.Lock()
						if err != nil || resp.StatusCode != http.StatusOK {
							code := 0
							if resp != nil {
								code = resp.StatusCode
							}
							failures = append(failures, fmt.Sprintf("%s → %d %v", path, code, err))
						}
						samples = append(samples, d)
						mu.Unlock()
						if resp != nil {
							resp.Body.Close()
						}
					}
				}(c)
			}
			wg.Wait()
		})

		if len(failures) > 0 {
			t.Fatalf("%d of %d concurrent requests failed:\n%s", len(failures), len(samples), failures[0])
		}
		stats := summarize(samples)
		t.Logf("%d requests over %d connections in %s: mean %s  p95 %s  max %s",
			len(samples), concurrency, total, stats.mean, stats.p95, stats.max)
		if stats.p95 > budgetP95Page*2 {
			t.Errorf("p95 under load %s exceeds %s", stats.p95, budgetP95Page*2)
		}
	})

	h.run(t, "the API's own tables are untouched by the load", func(t *testing.T) {
		// The seed and the requests above only ever touched marker rows.
		if n := h.count("users", "email NOT LIKE 'admintest-%' AND updated_at > NOW() - INTERVAL '2 minutes'"); n != 0 {
			t.Errorf("%d real users were modified during the performance run", n)
		}
	})
}

type stats struct {
	min, mean, p95, max time.Duration
}

func summarize(samples []time.Duration) stats {
	sorted := append([]time.Duration(nil), samples...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	var sum time.Duration
	for _, s := range sorted {
		sum += s
	}
	p95 := sorted[int(float64(len(sorted)-1)*0.95)]
	return stats{min: sorted[0], mean: sum / time.Duration(len(sorted)), p95: p95, max: sorted[len(sorted)-1]}
}
