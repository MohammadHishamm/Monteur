package cache

import (
	"context"
	"log/slog"

	"github.com/OmarHosny18/APP-frontend/common"

	"github.com/redis/go-redis/v9"
)

func invalidatePattern(ctx context.Context, rdb *redis.Client, patterns ...string) error {
	if rdb == nil {
		common.Logger.Warn("skip invalidating cache",
			slog.String("message", "redis is disabled"),
			slog.Any("patterns", patterns),
			slog.String("component", "cache.helper"),
			slog.String("method", "InvalidatePattern"))
		return nil
	}

	var (
		keys   []string
		cursor uint64
	)

	for _, p := range patterns {
		cursor = 0

		for {
			ks, newCursor, err := rdb.Scan(ctx, cursor, p, 100).Result()
			if err != nil {
				return err
			}

			keys = append(keys, ks...)
			cursor = newCursor
			if cursor == 0 {
				break
			}
		}

		common.Logger.Info("invalidating cache keys",
			slog.String("pattern", p),
			slog.Any("keys", keys),
			slog.String("component", "cache.helper"),
			slog.String("method", "InvalidatePattern"))
	}

	if len(keys) == 0 {
		return nil
	}

	pipe := rdb.Pipeline()
	pipe.Del(ctx, keys...)
	_, err := pipe.Exec(ctx)

	return err
}
