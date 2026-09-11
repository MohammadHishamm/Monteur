package common_test

import (
	"testing"

	"github.com/OmarHosny18/APP-frontend/common"
)

func TestBuildSlug(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		flags    int
		expected string
	}{
		{
			name:     "Normalize word",
			input:    "Hello@ World!",
			flags:    common.NORM_WORD,
			expected: "Hello-World",
		},
		{
			name:     "All flags",
			input:    "  Hello@   WORLD! ",
			flags:    common.NORM_CASE | common.NORM_SPACE | common.NORM_WORD,
			expected: "hello-world",
		},
		{
			name:     "No flags",
			input:    "  Hello   World! ",
			flags:    0,
			expected: "Hello---World!",
		},
		{
			name:     "Space and Word",
			input:    "This & That",
			flags:    common.NORM_WORD | common.NORM_SPACE,
			expected: "This-That",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := common.BuildSlug(tt.input, tt.flags)
			if got != tt.expected {
				t.Errorf("BuildSlug(%q, %d) = %q; want %q", tt.input, tt.flags, got, tt.expected)
			}
		})
	}
}
