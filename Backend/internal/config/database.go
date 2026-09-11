package config

import (
	"context"
	"database/sql"
	"time"

	_ "github.com/lib/pq"
)

func NewDatabase(ctx context.Context, addr, maxIdleTime, maxLifetime string, maxOpenConns, maxIdleConns int) (*sql.DB, error) {
	db, err := sql.Open("postgres", addr)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err = db.PingContext(ctx)
	if err != nil {
		return nil, err
	}

	// Optional: set connection pool
	if maxOpenConns > 0 {
		db.SetMaxOpenConns(maxOpenConns)
	}
	if maxIdleConns > 0 {
		db.SetMaxIdleConns(maxIdleConns)
	}
	if maxIdleTime != "" {
		if d, err := time.ParseDuration(maxIdleTime); err == nil {
			db.SetConnMaxIdleTime(d)
		}
	}
	if maxLifetime != "" {
		if d, err := time.ParseDuration(maxLifetime); err == nil {
			db.SetConnMaxLifetime(d)
		}
	}

	return db, nil
}
