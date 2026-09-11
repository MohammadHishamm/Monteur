package realtime

import (
	"encoding/json"
	"sync"
)

// Hub maintains the set of active WebSocket clients and broadcasts messages.
// It is the single source of truth for connection lifecycle management.
//
// Usage:
//
//	hub := realtime.NewHub()
//	// hub.Run() is called inside NewHub in a background goroutine.
//	hub.SendJSONToUser(userID, payload)
type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]struct{}
	users      map[string]map[*Client]struct{}

	// Register is a channel on which handlers push new clients after upgrade.
	Register chan *Client

	// Unregister is a channel on which clients signal disconnection.
	Unregister chan *Client
}

// NewHub creates and starts a Hub. The internal Run loop runs in its own
// goroutine and is ready immediately upon return.
func NewHub() *Hub {
	h := &Hub{
		clients:    make(map[*Client]struct{}),
		users:      make(map[string]map[*Client]struct{}),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
	go h.run()
	return h
}

// run is the main event loop. It must be the only goroutine that mutates the
// client/user maps so that no additional locking is required for the hot paths.
func (h *Hub) run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)
		case client := <-h.Unregister:
			h.unregisterClient(client)
		}
	}
}

func (h *Hub) registerClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[c] = struct{}{}
	if _, ok := h.users[c.UserID]; !ok {
		h.users[c.UserID] = make(map[*Client]struct{})
	}
	h.users[c.UserID][c] = struct{}{}
}

func (h *Hub) unregisterClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[c]; !ok {
		return
	}

	delete(h.clients, c)
	if clients, ok := h.users[c.UserID]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.users, c.UserID)
		}
	}
	close(c.Send)
}

// SendRawToUser enqueues raw pre-encoded bytes to every active connection
// owned by the given user ID. Safe to call from multiple goroutines.
func (h *Hub) SendRawToUser(userID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.users[userID] {
		client.SendRaw(data)
	}
}

// SendJSONToUser marshals payload to JSON and delivers it to all connections
// owned by the given user ID. Encoding errors are silently dropped.
func (h *Hub) SendJSONToUser(userID string, payload any) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}
	h.SendRawToUser(userID, encoded)
}

// ConnectedCount returns the current number of connected clients across all
// users. Intended for health-checks and metrics.
func (h *Hub) ConnectedCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
