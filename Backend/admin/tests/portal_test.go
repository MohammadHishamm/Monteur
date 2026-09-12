package tests

import (
	"testing"
)

// TestAdminPortal is the single entry point of the suite. The phases share
// one booted portal and one set of fixtures and must run in this order:
// rows are created in the CRUD phase, reused by the later phases, and
// removed before the isolation check compares the database with the
// snapshot taken at the start.
func TestAdminPortal(t *testing.T) {
	h := newHarness(t)
	before := h.snapshot()
	fx := newFixtures()

	phases := []struct {
		name string
		run  func(*testing.T, *harness, *fixtures)
	}{
		{"Auth", testAuth},
		{"Lockout", testLockout},
		{"CRUD", testCRUD},
		{"Changelist", testChangelists},
		{"Validation", testValidation},
		{"InstantRefresh", testInstantRefresh},
		{"Performance", testPerformance},
		{"TwoFactor", testTwoFactor},
		{"Cleanup", testDeleteFixtures},
	}
	for _, p := range phases {
		if !t.Run(p.name, func(t *testing.T) { p.run(t, h, fx) }) {
			t.Fatalf("phase %s failed; later phases depend on it", p.name)
		}
	}

	h.run(t, "Isolation", func(t *testing.T) {
		after := h.snapshot()
		for table, want := range before {
			got, ok := after[table]
			if !ok {
				t.Errorf("table %s disappeared", table)
				continue
			}
			if got != want {
				t.Errorf("table %s changed: before %+v, after %+v", table, want, got)
			}
		}
		for table := range after {
			if _, ok := before[table]; !ok {
				t.Errorf("table %s appeared", table)
			}
		}
	})
}
