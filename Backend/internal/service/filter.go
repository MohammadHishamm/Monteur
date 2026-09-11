package service

import (
	"regexp"
	"strings"
)

// FilterResult holds the outcome of a content filter check.
type FilterResult struct {
	Flagged     bool
	TriggerWord string
}

// filterRule holds a compiled pattern and a human-readable label.
type filterRule struct {
	label   string
	pattern *regexp.Regexp
}

// contentFilterRules is the list of patterns that are checked against message bodies.
// Add or remove rules here to tune the filter.
var contentFilterRules = []filterRule{
	// ── Messaging / Social apps ──
	{label: "whatsapp", pattern: regexp.MustCompile(`(?i)\bwhatsapp\b`)},
	{label: "telegram", pattern: regexp.MustCompile(`(?i)\btelegram\b`)},
	{label: "discord", pattern: regexp.MustCompile(`(?i)\bdiscord\b`)},
	{label: "signal", pattern: regexp.MustCompile(`(?i)\bsignal\b`)},
	{label: "viber", pattern: regexp.MustCompile(`(?i)\bviber\b`)},
	{label: "wechat", pattern: regexp.MustCompile(`(?i)\bwechat\b`)},
	{label: "skype", pattern: regexp.MustCompile(`(?i)\bskype\b`)},
	{label: "line_app", pattern: regexp.MustCompile(`(?i)\bline app\b`)},
	// ── Social media ──
	{label: "instagram", pattern: regexp.MustCompile(`(?i)\binstagram\b`)},
	{label: "facebook", pattern: regexp.MustCompile(`(?i)\bfacebook\b`)},
	{label: "snapchat", pattern: regexp.MustCompile(`(?i)\bsnapchat\b`)},
	{label: "tiktok", pattern: regexp.MustCompile(`(?i)\btiktok\b`)},
	{label: "twitter", pattern: regexp.MustCompile(`(?i)\btwitter\b`)},
	{label: "linkedin_dm", pattern: regexp.MustCompile(`(?i)\blinkedin\b.*\b(dm|message|contact)\b`)},
	// ── Phone numbers (7+ digits, optionally separated by spaces/dashes/parens) ──
	{label: "phone_number", pattern: regexp.MustCompile(`\b(\+?\d[\d\s\-\(\)\.]{6,}\d)\b`)},
	// ── External links ──
	{label: "external_url", pattern: regexp.MustCompile(`(?i)(https?://|www\.)\S+`)},
	{label: "domain_hint", pattern: regexp.MustCompile(`(?i)\b\w+\.(com|net|org|io|co|app|ly)\b`)},
	// ── Email addresses ──
	{label: "email_address", pattern: regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)},
	// ── Explicit pay-outside phrases ──
	{label: "contact_outside", pattern: regexp.MustCompile(`(?i)(contact|reach|message|text|call)\s+(me\s+)?(outside|off(site| site|-site)|directly)`)},
	{label: "pay_outside", pattern: regexp.MustCompile(`(?i)(pay|payment|transfer|send money)\s+(outside|off(site| site|-site)|directly)`)},
}

// FilterMessage checks the message body against all content filter rules.
// It returns as soon as the first match is found.
func FilterMessage(body string) FilterResult {
	normalized := strings.TrimSpace(body)
	for _, rule := range contentFilterRules {
		if rule.pattern.MatchString(normalized) {
			return FilterResult{Flagged: true, TriggerWord: rule.label}
		}
	}
	return FilterResult{}
}
