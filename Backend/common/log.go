package common

import (
	"log/slog"
	"os"
)

var (
	Logger *slog.Logger
)

func NewLogger(l slog.Level) *slog.Logger {
	o := &slog.HandlerOptions{Level: l}

	if l == slog.LevelDebug {
		return slog.New(slog.NewTextHandler(os.Stdout, o))
	}

	return slog.New(slog.NewJSONHandler(os.Stdout, o))
}

func InitLogger(isDev bool) *slog.Logger {
	l := slog.LevelInfo

	if isDev {
		l = slog.LevelDebug
	}

	Logger = NewLogger(l)
	return Logger
}
