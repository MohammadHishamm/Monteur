package entity

import "time"

type Notification struct {
	ID        int64
	UserID    string
	Type      string
	Title     string
	Message   string
	Data      []byte
	Priority  string
	IsRead    bool
	ReadAt    *time.Time
	CreatedAt time.Time
}

type CreateNotificationParams struct {
	UserID   string
	Type     string
	Title    string
	Message  string
	Data     []byte
	Priority string
}
