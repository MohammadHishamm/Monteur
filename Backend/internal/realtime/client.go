package realtime

import (
	"log/slog"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/gorilla/websocket"
)

const (
	// WriteWait is the maximum time allowed to write a message to the peer.
	WriteWait = 10 * time.Second

	// PongWait is the time allowed to read the next pong message from the peer.
	PongWait = 60 * time.Second

	// PingPeriod is how often ping messages are sent. Must be less than PongWait.
	PingPeriod = (PongWait * 9) / 10

	// MaxMessageSize is the maximum message size (bytes) allowed from the peer.
	MaxMessageSize = 4096
)

// Client represents a single connected WebSocket session for one user.
// Multiple clients may share the same UserID (e.g. multiple browser tabs).
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string
}

// ReadPump pumps messages from the WebSocket connection to the hub.
//
// The application runs ReadPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		_ = c.Conn.Close()
	}()

	c.Conn.SetReadLimit(MaxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(PongWait))
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(PongWait))
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				common.Logger.Warn("websocket closed unexpectedly",
					slog.String("user_id", c.UserID),
					slog.Any("error", err),
					slog.String("component", "realtime.client"),
					slog.String("method", "ReadPump"))
			}
			break
		}
	}
}

// WritePump pumps messages from the hub to the WebSocket connection.
//
// A goroutine running WritePump is started for each connection. The application
// ensures that there is at most one writer to a connection by executing all
// writes from this goroutine.
func (c *Client) WritePump() {
	ticker := time.NewTicker(PingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()

	for {
		select {
		case payload, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(WriteWait))
			if !ok {
				// Hub closed the channel.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(WriteWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// SendRaw enqueues raw bytes for delivery to the client.
// If the client's send buffer is full it is unregistered to prevent a slow
// consumer from blocking all broadcasts.
func (c *Client) SendRaw(data []byte) {
	select {
	case c.Send <- data:
	default:
		// Non-blocking fallback: schedule unregister and drop the frame.
		select {
		case c.Hub.Unregister <- c:
		default:
		}
	}
}
