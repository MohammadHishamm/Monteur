package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/config"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/gorilla/websocket"
)

const (
	wsWriteWait      = 10 * time.Second
	wsPongWait       = 60 * time.Second
	wsPingPeriod     = (wsPongWait * 9) / 10
	wsMaxMessageSize = 4096
)

type notificationOutboundMessage struct {
	Type         string `json:"type"`
	Error        string `json:"error,omitempty"`
	Notification any    `json:"notification,omitempty"`
}

type socketClient struct {
	manager *socketManager
	conn    *websocket.Conn
	send    chan []byte
	userID  string
}

type socketManager struct {
	mu         sync.RWMutex
	clients    map[*socketClient]struct{}
	users      map[string]map[*socketClient]struct{}
	register   chan *socketClient
	unregister chan *socketClient
}

func newSocketManager() *socketManager {
	m := &socketManager{
		clients:    make(map[*socketClient]struct{}),
		users:      make(map[string]map[*socketClient]struct{}),
		register:   make(chan *socketClient),
		unregister: make(chan *socketClient),
	}

	go m.run()

	return m
}

func (m *socketManager) run() {
	for {
		select {
		case client := <-m.register:
			m.registerClient(client)
		case client := <-m.unregister:
			m.unregisterClient(client)
		}
	}
}

func (m *socketManager) registerClient(client *socketClient) {
	m.mu.Lock()
	m.clients[client] = struct{}{}
	if _, ok := m.users[client.userID]; !ok {
		m.users[client.userID] = make(map[*socketClient]struct{})
	}
	m.users[client.userID][client] = struct{}{}
	m.mu.Unlock()
}

func (m *socketManager) unregisterClient(client *socketClient) {
	m.mu.Lock()
	if _, ok := m.clients[client]; !ok {
		m.mu.Unlock()
		return
	}

	delete(m.clients, client)
	if clients, ok := m.users[client.userID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(m.users, client.userID)
		}
	}
	m.mu.Unlock()

	close(client.send)
}

func (m *socketManager) sendRawToUser(userID string, encoded []byte) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for client := range m.users[userID] {
		client.sendRaw(encoded)
	}
}

func (m *socketManager) sendJSONToUser(userID string, payload any) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}
	m.sendRawToUser(userID, encoded)
}

func (c *socketClient) readPump() {
	defer func() {
		c.manager.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(wsMaxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(wsPongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(wsPongWait))
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				common.Logger.Warn("websocket closed unexpectedly",
					slog.String("user_id", c.userID),
					slog.Any("error", err),
					slog.String("component", "handler.socket"),
					slog.String("method", "readPump"))
			}
			break
		}
	}
}

func (c *socketClient) writePump() {
	ticker := time.NewTicker(wsPingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case payload, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *socketClient) sendRaw(data []byte) {
	select {
	case c.send <- data:
	default:
		// Prevent a slow or blocked client from stalling all broadcasts.
		select {
		case c.manager.unregister <- c:
		default:
		}
	}
}

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}

		frontend := ""
		if config.Configs != nil && config.Configs.FrontendURL != nil {
			frontend = config.Configs.FrontendURL.String()
		}

		allowed := []string{frontend, "http://localhost:3000"}
		for _, item := range allowed {
			if item != "" && strings.EqualFold(strings.TrimRight(item, "/"), strings.TrimRight(origin, "/")) {
				return true
			}
		}

		return false
	},
}

func (h *Handler) broadcastNewMessage(msg *entity.Message) {
	if h.socketManager == nil {
		return
	}

	participantIDs, err := h.store.Message.GetConversationParticipantIDs(context.Background(), msg.ConversationID)
	if err != nil {
		common.Logger.Error("broadcast: failed to fetch participants",
			slog.Any("error", err),
			slog.String("conversation_id", msg.ConversationID.String()),
			slog.String("component", "handler.socket"),
			slog.String("method", "broadcastNewMessage"))
		return
	}

	senderID := msg.SenderUserID.String()
	for _, id := range participantIDs {
		if id == senderID {
			continue
		}
		h.socketManager.sendJSONToUser(id, notificationOutboundMessage{
			Type:         "new_message",
			Notification: msg,
		})
	}
}

func (h *Handler) HandleNotificationWebSocket(w http.ResponseWriter, r *http.Request) {
	if h.socketManager == nil {
		common.ServeInternalServerResponse(w, r, errors.New("socket manager is not initialized"))
		return
	}

	if h.rejectIfIPBanned(w, r) {
		return
	}

	userID, err := h.resolveSocketUserID(r)
	if err != nil {
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		common.Logger.Warn("failed to upgrade websocket connection",
			slog.Any("error", err),
			slog.String("component", "handler.socket"),
			slog.String("method", "HandleNotificationWebSocket"))
		return
	}

	client := &socketClient{
		manager: h.socketManager,
		conn:    conn,
		send:    make(chan []byte, 64),
		userID:  userID,
	}

	h.socketManager.register <- client

	go client.writePump()
	go client.readPump()
}

func (h *Handler) resolveSocketUserID(r *http.Request) (string, error) {
	if h != nil && h.service != nil && h.service.Auth != nil {
		sess, err := h.service.Auth.GetRequestSession(r, false)
		if err == nil && sess != nil && sess.UserID != nil {
			if userID := strings.TrimSpace(sess.UserID.String()); userID != "" {
				return userID, nil
			}
		}
	}

	authorization := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(authorization), "bearer ") {
		token := strings.TrimSpace(authorization[7:])
		if token != "" {
			claims, err := common.VerifyAccessToken(token)
			if err == nil && claims != nil && claims.UserID != "" {
				return strings.TrimSpace(claims.UserID), nil
			}
		}
	}

	if userID := strings.TrimSpace(r.Header.Get("X-User-ID")); userID != "" {
		return userID, nil
	}

	if userID := strings.TrimSpace(r.URL.Query().Get("user_id")); userID != "" {
		return userID, nil
	}

	for _, cookieName := range []string{"user_id", "uid"} {
		cookie, err := r.Cookie(cookieName)
		if err == nil {
			if userID := strings.TrimSpace(cookie.Value); userID != "" {
				return userID, nil
			}
		}
	}

	return "", errors.New("missing authenticated user id")
}
