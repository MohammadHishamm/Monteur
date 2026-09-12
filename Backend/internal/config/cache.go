package config

import (
	"context"
	"time"

	redismod "github.com/gomodule/redigo/redis"
	"github.com/redis/go-redis/v9"
)

func NewRedis(ctx context.Context, addr, password string, db int) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(ctx, time.Second*5)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return rdb, nil
}

func NewRedisOptional(ctx context.Context, addr, password string, db int) (*redis.Client, error) {
	return NewRedis(ctx, addr, password, db)
}

func NewRedisPool(ctx context.Context, addr, password string, db int) (*redismod.Pool, error) {
	passOption := redismod.DialPassword(password)
	dbOption := redismod.DialDatabase(db)

	return &redismod.Pool{
		MaxIdle:     3,
		IdleTimeout: 240 * time.Second,
		TestOnBorrow: func(c redismod.Conn, t time.Time) error {
			_, err := c.Do("PING")
			return err
		},
		DialContext: func(ctx context.Context) (redismod.Conn, error) {
			return redismod.DialContext(ctx, "tcp", addr, passOption, dbOption)
		},
	}, nil
}
