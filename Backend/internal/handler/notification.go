package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/apperror"
	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/OmarHosny18/APP-frontend/internal/realtime"
	"github.com/go-chi/chi/v5"
)

func (h *Handler) HandleCreateNotifications(w http.ResponseWriter, r *http.Request) {
	body, err := common.ReadJson[entity.CreateNotificationsRequest](w, r)
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	notificationType := strings.TrimSpace(body.Type)
	if notificationType == "" {
		common.ServeBadRequestResponse(w, r, errors.New("type is required"))
		return
	}

	title := strings.TrimSpace(body.Title)
	message := strings.TrimSpace(body.Message)
	if title == "" && message == "" {
		common.ServeBadRequestResponse(w, r, errors.New("either title or message is required"))
		return
	}

	userIDs := make([]string, 0, len(body.UserIDs)+1)
	if item := strings.TrimSpace(body.UserID); item != "" {
		userIDs = append(userIDs, item)
	}
	for _, item := range body.UserIDs {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			userIDs = append(userIDs, trimmed)
		}
	}

	if len(userIDs) == 0 {
		common.ServeBadRequestResponse(w, r, errors.New("userId or userIds is required"))
		return
	}

	seen := make(map[string]struct{}, len(userIDs))
	unique := make([]string, 0, len(userIDs))
	for _, item := range userIDs {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		unique = append(unique, item)
	}

	data := body.Data
	if len(data) == 0 {
		data = json.RawMessage("{}")
	}

	priority := strings.TrimSpace(body.Priority)
	if priority == "" {
		priority = "normal"
	}

	inputs := make([]entity.CreateNotificationParams, 0, len(unique))
	for _, userID := range unique {
		inputs = append(inputs, entity.CreateNotificationParams{
			UserID:   userID,
			Type:     notificationType,
			Title:    title,
			Message:  message,
			Data:     []byte(data),
			Priority: priority,
		})
	}

	created, err := h.service.CreateNotifications(r.Context(), inputs)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	for _, item := range created {
		h.pushNotification(item)
	}

	response := make([]entity.NotificationResponse, 0, len(created))
	for _, item := range created {
		response = append(response, mapNotificationResponse(item))
	}

	_ = common.WriteJson(w, http.StatusCreated, map[string]any{
		"notifications": response,
	})
}

func (h *Handler) HandleListNotifications(w http.ResponseWriter, r *http.Request) {
	resolvedUserID, err := h.resolveAuthenticatedUserID(r)
	if err != nil {
		if errors.Is(err, apperror.ErrInternalServer) {
			common.ServeInternalServerResponse(w, r, err)
			return
		}
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	if queryUserID := strings.TrimSpace(r.URL.Query().Get("user_id")); queryUserID != "" && queryUserID != resolvedUserID {
		common.ServeForbiddenResponse(w, r)
		return
	}

	userID := resolvedUserID

	limit := 20
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}

	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			offset = parsed
		}
	}

	items, err := h.service.ListNotifications(r.Context(), userID, limit, offset)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	response := make([]entity.NotificationResponse, 0, len(items))
	for _, item := range items {
		response = append(response, mapNotificationResponse(item))
	}

	_ = common.WriteJson(w, http.StatusOK, map[string]any{
		"notifications": response,
		"userId":        userID,
		"limit":         limit,
		"offset":        offset,
	})
}

func (h *Handler) HandleMarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	idParam := strings.TrimSpace(chi.URLParam(r, "notificationID"))
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || id <= 0 {
		common.ServeBadRequestResponse(w, r, errors.New("invalid notificationID"))
		return
	}

	resolvedUserID, err := h.resolveAuthenticatedUserID(r)
	if err != nil {
		if errors.Is(err, apperror.ErrInternalServer) {
			common.ServeInternalServerResponse(w, r, err)
			return
		}
		common.ServeUnauthorizedErrorResponse(w, r, err)
		return
	}

	if queryUserID := strings.TrimSpace(r.URL.Query().Get("user_id")); queryUserID != "" && queryUserID != resolvedUserID {
		common.ServeForbiddenResponse(w, r)
		return
	}

	userID := resolvedUserID

	updated, err := h.service.MarkNotificationRead(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			common.ServeNotFoundResponse(w, r, err)
			return
		}
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	_ = common.WriteJson(w, http.StatusOK, map[string]any{
		"notification": mapNotificationResponse(*updated),
	})
}

func (h *Handler) pushNotification(item entity.Notification) {
	if h.Hub == nil {
		return
	}

	dataPayload := json.RawMessage(item.Data)
	if len(dataPayload) == 0 {
		dataPayload = json.RawMessage("{}")
	}

	payload := realtime.OutboundMessage{
		Type: realtime.TypeNotification,
		Notification: map[string]any{
			"id":        item.ID,
			"userId":    item.UserID,
			"type":      item.Type,
			"title":     item.Title,
			"message":   item.Message,
			"data":      dataPayload,
			"priority":  item.Priority,
			"isRead":    item.IsRead,
			"createdAt": item.CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
		},
	}

	if item.ReadAt != nil {
		payload.Notification.(map[string]any)["readAt"] = item.ReadAt.UTC().Format("2006-01-02T15:04:05Z07:00")
	}

	h.Hub.SendJSONToUser(item.UserID, payload)
}

func mapNotificationResponse(item entity.Notification) entity.NotificationResponse {
	createdAt := item.CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
	var readAt *string
	if item.ReadAt != nil {
		v := item.ReadAt.UTC().Format("2006-01-02T15:04:05Z07:00")
		readAt = &v
	}

	data := json.RawMessage(item.Data)
	if len(data) == 0 {
		data = json.RawMessage("{}")
	}

	return entity.NotificationResponse{
		ID:        item.ID,
		UserID:    item.UserID,
		Type:      item.Type,
		Title:     item.Title,
		Message:   item.Message,
		Data:      data,
		Priority:  item.Priority,
		IsRead:    item.IsRead,
		ReadAt:    readAt,
		CreatedAt: createdAt,
	}
}
