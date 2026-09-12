// Package registry declares which tables the portal manages and how each is
// presented — the Go counterpart of hotdesk's app/admin.py.
//
// To expose a new table, add an entry to registrations. Column names are
// validated against the live schema at startup, so a typo fails the boot
// with a clear message instead of a broken page.
package registry

import (
	"context"
	"fmt"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/OmarHosny18/APP-frontend/admin/site"
)

// AppLabel is the single Django-style app every table lives under, giving
// URLs of the form /admin/app/<table>/ — the same shape as hotdesk's
// /admin/app/booking/.
const AppLabel = "app"

type registration struct {
	table string
	admin site.ModelAdmin
}

var registrations = []registration{
	{"admins", site.ModelAdmin{
		VerboseName:  "admin",
		ListDisplay:  []string{"email", "full_name", "is_active", "totp_secret", "last_login_at", "created_at"},
		SearchFields: []string{"email", "full_name"},
		ListFilter:   []string{"is_active", "created_at"},
		Ordering:     []string{"email"},
		// Clearing totp_secret resets a colleague's two-factor enrolment
		// (lost phone); the secret itself is never shown.
		SecretFields:   []string{"totp_secret"},
		ReadonlyFields: []string{"id", "created_at", "updated_at", "last_login_at", "totp_confirmed_at", "totp_last_used_step"},
	}},
	{"users", site.ModelAdmin{
		ListDisplay:  []string{"email", "full_name", "user_type", "tier", "country", "is_active", "is_banned", "verification_status", "created_at"},
		SearchFields: []string{"email", "full_name", "phone", "company_name", "city"},
		ListFilter:   []string{"user_type", "tier", "status", "is_active", "is_banned", "is_email_verified", "verification_status", "onboarding_completed", "country", "created_at"},
	}},
	{"user_verifications", site.ModelAdmin{
		ListDisplay:  []string{"id", "user_id", "status", "rejection_reason", "created_at"},
		SearchFields: []string{"user_id", "rejection_reason"},
		ListFilter:   []string{"status", "created_at"},
	}},
	{"user_balances", site.ModelAdmin{
		ListDisplay:  []string{"user_id", "available_balance", "pending_balance", "lifetime_earned", "lifetime_spent", "currency", "updated_at"},
		SearchFields: []string{"user_id"},
		ListFilter:   []string{"currency", "updated_at"},
		Ordering:     []string{"-updated_at"},
	}},
	{"jobs", site.ModelAdmin{
		ListDisplay:  []string{"title", "client_id", "category", "budget_type", "budget_min", "budget_max", "status", "urgent", "proposals_count", "posted_at"},
		SearchFields: []string{"title", "summary", "description"},
		ListFilter:   []string{"status", "category", "budget_type", "experience_tier", "urgent", "posted_at"},
		Ordering:     []string{"-posted_at"},
	}},
	{"proposals", site.ModelAdmin{
		ListDisplay:  []string{"id", "job_id", "freelancer_id", "bid_amount", "budget_type", "status", "submitted_at"},
		SearchFields: []string{"cover_letter", "client_message"},
		ListFilter:   []string{"status", "budget_type", "submitted_at"},
		Ordering:     []string{"-submitted_at"},
	}},
	{"projects", site.ModelAdmin{
		ListDisplay:  []string{"title", "client_id", "freelancer_id", "category", "amount", "progress", "status", "escrow_funded", "due_at"},
		SearchFields: []string{"title"},
		ListFilter:   []string{"status", "category", "budget_type", "escrow_funded", "created_at"},
	}},
	{"reviews", site.ModelAdmin{
		ListDisplay:  []string{"id", "project_id", "reviewer_id", "reviewee_id", "rating", "created_at"},
		SearchFields: []string{"body"},
		ListFilter:   []string{"rating", "created_at"},
		ReprField:    "body",
	}},
	{"conversations", site.ModelAdmin{
		ListDisplay:  []string{"id", "kind", "subject", "project_id", "job_id", "last_message_at", "created_at"},
		SearchFields: []string{"subject"},
		ListFilter:   []string{"kind", "last_message_at"},
	}},
	{"conversation_participants", site.ModelAdmin{
		ListDisplay:  []string{"id", "conversation_id", "user_id", "role", "muted", "archived", "joined_at"},
		SearchFields: []string{"conversation_id", "user_id"},
		ListFilter:   []string{"role", "muted", "archived"},
		Ordering:     []string{"-joined_at"},
	}},
	{"messages", site.ModelAdmin{
		ListDisplay:  []string{"id", "conversation_id", "sender_user_id", "sender_admin_id", "body", "sent_at", "deleted_at"},
		SearchFields: []string{"body"},
		ListFilter:   []string{"sent_at"},
		Ordering:     []string{"-sent_at"},
		ReprField:    "body",
	}},
	{"flagged_messages", site.ModelAdmin{
		ListDisplay:  []string{"id", "sender_user_id", "trigger_word", "status", "reviewed_by", "reviewed_at", "created_at"},
		SearchFields: []string{"trigger_word", "body_snapshot"},
		ListFilter:   []string{"status", "created_at"},
		ReprField:    "trigger_word",
	}},
	{"notifications", site.ModelAdmin{
		ListDisplay:  []string{"id", "user_id", "type", "title", "priority", "is_read", "created_at"},
		SearchFields: []string{"title", "message", "type"},
		ListFilter:   []string{"type", "priority", "is_read", "created_at"},
	}},
	{"freelancer_showcases", site.ModelAdmin{
		ListDisplay:  []string{"title", "freelancer_id", "category", "client_name", "is_featured", "display_order", "created_at"},
		SearchFields: []string{"title", "summary", "client_name", "industry"},
		ListFilter:   []string{"category", "is_featured", "created_at"},
	}},
	{"freelancer_profile_views", site.ModelAdmin{
		ListDisplay:  []string{"id", "freelancer_id", "viewer_user_id", "viewer_ip_address", "view_date", "viewed_at"},
		SearchFields: []string{"viewer_ip_address", "referrer"},
		ListFilter:   []string{"viewed_at"},
		Ordering:     []string{"-viewed_at"},
		ReprField:    "viewer_ip_address",
	}},
	{"saved_freelancers", site.ModelAdmin{
		ListDisplay:  []string{"user_id", "freelancer_id", "created_at"},
		SearchFields: []string{"user_id", "freelancer_id"},
		ListFilter:   []string{"created_at"},
		ReprField:    "user_id",
	}},
	{"refresh_tokens", site.ModelAdmin{
		ListDisplay:  []string{"id", "user_id", "ip_address", "expires_at", "revoked_at", "created_at"},
		SearchFields: []string{"ip_address", "user_agent"},
		ListFilter:   []string{"created_at", "expires_at"},
		Exclude:      []string{"token_hash"},
		ReprField:    "ip_address",
		// Tokens are minted by the API; the portal only inspects and revokes.
		DisableAdd: true,
	}},
	{"admin_log", site.ModelAdmin{
		VerboseName:       "admin log entry",
		VerboseNamePlural: "admin log entries",
		ListDisplay:       []string{"id", "admin_email", "action_flag", "model", "object_repr", "change_message", "created_at"},
		SearchFields:      []string{"admin_email", "object_repr", "change_message", "model"},
		ListFilter:        []string{"action_flag", "model", "created_at"},
		ReprField:         "object_repr",
		DisableAdd:        true,
		DisableChange:     true,
		DisableDelete:     true,
	}},
}

// Register introspects every declared table and registers it on the site.
func Register(ctx context.Context, s *site.Site, in *schema.Introspector) error {
	for _, reg := range registrations {
		table, err := in.Table(ctx, reg.table)
		if err != nil {
			return fmt.Errorf("registry: %w", err)
		}
		if _, err := s.Register(AppLabel, table, reg.admin); err != nil {
			return fmt.Errorf("registry: %w", err)
		}
	}
	return nil
}
