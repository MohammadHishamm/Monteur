package cache

import (
	"bytes"
	"context"
	"encoding/gob"
	"log/slog"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/config"

	"github.com/redis/go-redis/v9"
)

type TypedRedisCache[T any] struct {
	rdb *redis.Client
}

func newTypedRedisCache[T any](rdb *redis.Client) *TypedRedisCache[T] {
	return &TypedRedisCache[T]{rdb: rdb}
}

func (c *TypedRedisCache[T]) InvalidatePattern(ctx context.Context, patterns ...string) error {
	if !config.Configs.CacheEnabled || c.rdb == nil {
		common.Logger.Warn("skip invalidating cache",
			slog.String("message", "redis is disabled"),
			slog.Any("patterns", patterns),
			slog.String("component", "cache.cache"),
			slog.String("method", "InvalidatePattern"))
		return nil
	}

	return invalidatePattern(ctx, c.rdb, patterns...)
}

func (c *TypedRedisCache[T]) GetList(ctx context.Context, key string) ([]*T, error) {
	if !config.Configs.CacheEnabled || c.rdb == nil {
		common.Logger.Warn("skip retrieving cache",
			slog.String("message", "redis is disabled"),
			slog.String("key", key),
			slog.String("component", "cache.cache"),
			slog.String("method", "GetList"))
		return nil, nil
	}

	b, err := c.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var list []*T
	if err := gob.NewDecoder(bytes.NewReader(b)).Decode(&list); err != nil {
		return nil, err
	}

	common.Logger.Info("retrieved list from cache",
		slog.String("key", key),
		slog.String("component", "cache.cache"),
		slog.String("method", "GetList"))

	return list, nil
}

func (c *TypedRedisCache[T]) SetList(ctx context.Context, key string, list []*T, ttl *time.Duration) error {
	if !config.Configs.CacheEnabled || c.rdb == nil {
		common.Logger.Warn("skip setting list cache",
			slog.String("error", "redis is disabled"),
			slog.String("key", key),
			slog.String("component", "cache.cache"),
			slog.String("method", "SetList"))
		return nil
	}

	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(list); err != nil {
		return err
	}

	if ttl == nil {
		ttl = &CacheDurationDefault
	}

	common.Logger.Info("set list cache",
		slog.String("key", key),
		slog.Any("ttl", ttl),
		slog.String("component", "cache.cache"),
		slog.String("method", "SetList"))

	return c.rdb.Set(ctx, key, buf.Bytes(), *ttl).Err()
}

func (c *TypedRedisCache[T]) Get(ctx context.Context, key string) (*T, error) {
	if !config.Configs.CacheEnabled || c.rdb == nil {
		common.Logger.Warn("skip retrieving cache item",
			slog.String("message", "redis is disabled"),
			slog.String("key", key),
			slog.String("component", "cache.cache"),
			slog.String("method", "Get"))
		return nil, nil
	}

	b, err := c.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var item *T
	if err := gob.NewDecoder(bytes.NewReader(b)).Decode(&item); err != nil {
		return nil, err
	}

	common.Logger.Info("retrieved cache item",
		slog.String("key", key),
		slog.String("component", "cache.cache"),
		slog.String("method", "Get"))

	return item, nil
}

func (c *TypedRedisCache[T]) Set(ctx context.Context, key string, item *T, ttl *time.Duration) error {
	if !config.Configs.CacheEnabled || c.rdb == nil {
		common.Logger.Warn("skip setting cache item",
			slog.String("error", "redis is disabled"),
			slog.String("key", key),
			slog.String("component", "cache.cache"),
			slog.String("method", "Set"))
		return nil
	}

	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(item); err != nil {
		return err
	}

	if ttl == nil {
		ttl = &CacheFeaturedListDurationDefault
	}

	common.Logger.Info("set cache item",
		slog.String("key", key),
		slog.Any("ttl", ttl),
		slog.String("component", "cache.cache"),
		slog.String("method", "Set"))

	return c.rdb.Set(ctx, key, buf.Bytes(), *ttl).Err()
}
