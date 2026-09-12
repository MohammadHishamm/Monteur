package entity

import "encoding/json"

type CreateNotificationsRequest struct {
	UserID   string          `json:"userId"`
	UserIDs  []string        `json:"userIds"`
	Type     string          `json:"type"`
	Title    string          `json:"title"`
	Message  string          `json:"message"`
	Priority string          `json:"priority"`
	Data     json.RawMessage `json:"data"`
}

type NotificationResponse struct {
	ID        int64           `json:"id"`
	UserID    string          `json:"userId"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Message   string          `json:"message"`
	Data      json.RawMessage `json:"data"`
	Priority  string          `json:"priority"`
	IsRead    bool            `json:"isRead"`
	ReadAt    *string         `json:"readAt,omitempty"`
	CreatedAt string          `json:"createdAt"`
}
