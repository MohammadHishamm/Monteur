package realtime

import "encoding/json"

// Message type constants used in the WebSocket notification envelope.
const (
	TypeNotification = "notification"
	TypeNewMessage   = "new_message"
	TypeError        = "error"
)

// OutboundMessage is the canonical envelope sent to connected WebSocket clients.
// Every push from the server uses this structure.
type OutboundMessage struct {
	// Type categorises the event (e.g. TypeNotification, TypeNewMessage).
	Type string `json:"type"`

	// Error is non-empty only when Type == TypeError.
	Error string `json:"error,omitempty"`

	// Notification carries the domain payload (notification, message, …).
	// It is intentionally typed as `any` so callers can pass arbitrary structs
	// that are marshalled at send time.
	Notification any `json:"notification,omitempty"`
}

// MustMarshal serialises the message to JSON and panics on encoding failure
// (which cannot happen for well-formed OutboundMessage values).
func (m OutboundMessage) MustMarshal() []byte {
	b, err := json.Marshal(m)
	if err != nil {
		panic("realtime: failed to marshal OutboundMessage: " + err.Error())
	}
	return b
}
