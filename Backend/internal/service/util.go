package service

import "github.com/google/uuid"

// colorPalette is the set of Tailwind color names the frontend uses for card accents.
var colorPalette = []string{
	"emerald", "teal", "sky", "violet", "rose", "amber", "indigo", "fuchsia",
}

// colorFromUUID returns a deterministic Tailwind color name derived from a UUID.
func colorFromUUID(id uuid.UUID) string {
	return colorPalette[int(id[0])%len(colorPalette)]
}
