package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/realtime"
)

// HandleNotificationWebSocket upgrades the HTTP connection to a WebSocket and
// registers the client with the Hub. Authentication is enforced before the
// upgrade so unauthenticated connections are rejected with an HTTP 401.
func (h *Handler) HandleNotificationWebSocket(w http.ResponseWriter, r *http.Request) {
	if h.Hub == nil {
		common.ServeInternalServerResponse(w, r, errors.New("realtime hub is not initialised"))
		return
	}

	if h.rejectIfIPBanned(w, r) {
		return
	}

	userID, err := h.resolveAuthenticatedUserID(r)
	if err != nil {
		if errors.Is(err, apperror.ErrInternalServer) {
			common.ServeInternalServerResponse(w, r, err)
			return
		}
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	conn, err := realtime.Upgrade(w, r)
	if err != nil {
		common.Logger.Warn("failed to upgrade websocket connection",
			slog.Any("error", err),
			slog.String("component", "handler.socket"),
			slog.String("method", "HandleNotificationWebSocket"))
		return
	}

	client := &realtime.Client{
		Hub:    h.Hub,
		Conn:   conn,
		Send:   make(chan []byte, 64),
		UserID: userID,
	}

	h.Hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

// broadcastNewMessage fans out a new-message event to all WebSocket clients
// of every conversation participant except the sender.
func (h *Handler) broadcastNewMessage(msg *entity.Message) {
	if h.Hub == nil {
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
		h.Hub.SendJSONToUser(id, realtime.OutboundMessage{
			Type:         realtime.TypeNewMessage,
			Notification: msg,
		})
	}
}

// resolveAuthenticatedUserID extracts and validates the caller's identity from
// either the Redis session cookie or a signed JWT token.
//
// Security note: raw unauthenticated user_id/uid cookies, X-User-ID headers,
// and ?user_id= query parameters are intentionally never consulted here —
// only cryptographically verifiable session or token credentials are accepted.
func (h *Handler) resolveAuthenticatedUserID(r *http.Request) (string, error) {
	if h == nil || h.service == nil || h.service.Auth == nil {
		return "", apperror.ErrInternalServer
	}

	sess, err := h.service.Auth.GetRequestSession(r, false)
	if err != nil || sess == nil || !sess.IsAuth() || sess.UserID == nil {
		return "", apperror.ErrUserNotAuthenticated
	}

	userID := strings.TrimSpace(sess.UserID.String())
	if userID == "" {
		return "", apperror.ErrUserNotAuthenticated
	}

	// Verify user exists, is active, and is not banned.
	if h.store != nil && h.store.User != nil {
		u, err := h.store.User.FindByID(r.Context(), *sess.UserID)
		if err != nil {
			return "", apperror.ErrInternalServer
		}
		if u == nil {
			return "", apperror.ErrUserNotFound
		}
		if !u.IsActive {
			return "", apperror.ErrUserNotAuthenticated.WithDetail("account is not active")
		}
		if !u.IsEmailVerified && !u.Is_activated {
			return "", apperror.ErrUserNotAuthenticated.WithDetail("account not activated")
		}
		if u.IsBanned {
			return "", apperror.ErrUserAlreadyBanned
		}
	}

	return userID, nil
}
