package realtime

import (
	"net/http"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/gorilla/websocket"
)

// upgrader is the singleton WebSocket upgrader used by Upgrade.
// Origin validation is delegated to checkOrigin, which reads the allowed
// frontend URL from the application config at request time (not at init time)
// so that config hot-reloads are respected.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     checkOrigin,
}

// checkOrigin validates the WebSocket upgrade origin against the configured
// frontend URL and the always-allowed local development address.
func checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		// Non-browser clients (e.g. native apps, test tools) send no Origin.
		return true
	}

	frontend := ""
	if config.Configs != nil && config.Configs.FrontendURL != nil {
		frontend = config.Configs.FrontendURL.String()
	}

	allowed := []string{frontend, "http://localhost:3000"}
	for _, item := range allowed {
		if item == "" {
			continue
		}
		if strings.EqualFold(strings.TrimRight(item, "/"), strings.TrimRight(origin, "/")) {
			return true
		}
	}

	return false
}

// Upgrade upgrades an HTTP connection to WebSocket using the package-level
// upgrader. Callers should check the returned error and abort if non-nil.
func Upgrade(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, nil)
}
