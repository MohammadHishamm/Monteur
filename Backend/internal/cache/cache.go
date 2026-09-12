package cache

import (
	"context"

	"log/slog"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/OmarHosny18/APP-frontend/internal/config"

	"github.com/redis/go-redis/v9"
)

var (
	CacheDurationDefault             time.Duration = 3 * time.Hour
	CacheFeaturedListDurationDefault time.Duration = 12 * time.Hour

	// CacheMangaListKey                 = "manga:list:base:query:%s"
	// CacheMangaUserListKey             = "manga:list:user:%s:query:%s"
	// CacheMangaPopularListKey          = "manga:list:popular:query:%s"
	// CacheMangaRecommendedUserListKey  = "manga:list:recommended:user:%s:query:%s"
	// CacheMangaRecommendedGuestListKey = "manga:list:recommended:guest:%s:query:%s"
	// CacheMangaFeaturedListKey         = "manga:list:featured:query:%s"

	// CacheNovelListKey                 = "novel:list:base:query:%s"
	// CacheNovelUserListKey             = "novel:list:user:%s:query:%s"
	// CacheNovelFeaturedListKey         = "novel:list:featured:query:%s"
	// CacheNovelPopularListKey          = "novel:list:popular:query:%s"
	// CacheNovelRecommendedUserListKey  = "novel:list:recommended:user:%s:query:%s"
	// CacheNovelRecommendedGuestListKey = "novel:list:recommended:guest:%s:query:%s"

	// CacheAnnouncementKey         = "announcement:item:base:%s:query:%"
	// CacheAnnouncementListKey     = "announcement:list:base:query:%s"
	// CacheAnnouncementUserListKey = "announcement:list:user:%s:query:%s"

	// CacheSeoOptionDataKey    = "seo:option:data"
	// CacheSeoOptionSettingKey = "seo:option:setting"

	// CacheUserBalanceKey = "user:balance:%s"
)

type Cache struct {
	Client           *redis.Client
	// Manga            *TypedRedisCache[entity.Manga]
	// MangaWithTags    *TypedRedisCache[entity.MangaWithTags]
	// MangaFeatured    *TypedRedisCache[entity.MangaWithFeatured]
	// Novel            *TypedRedisCache[entity.Novel]
	// NovelWithTags    *TypedRedisCache[entity.NovelWithTags]
	// Announcement     *TypedRedisCache[entity.Announcement]
	// SeoOptionSetting *TypedRedisCache[entity.SeoOptionSetting]
	// SeoOptionData    *TypedRedisCache[entity.SeoOptionData]
	// UserBalance      *TypedRedisCache[entity.UserBalance]
}

func New(rdb *redis.Client) *Cache {
	// gob.Register(entity.Manga{})
	// gob.Register(entity.MangaWithTags{})
	// gob.Register(entity.MangaWithFeatured{})
	// gob.Register(entity.Novel{})
	// gob.Register(entity.NovelWithTags{})
	// gob.Register(entity.Announcement{})
	// gob.Register(entity.SeoOptionSetting{})
	// gob.Register(entity.SeoOptionData{})
	// gob.Register(entity.UserBalance{})

	return &Cache{
		Client:           rdb,
		// Manga:            newTypedRedisCache[entity.Manga](rdb),
		// MangaWithTags:    newTypedRedisCache[entity.MangaWithTags](rdb),
		// MangaFeatured:    newTypedRedisCache[entity.MangaWithFeatured](rdb),
		// Novel:            newTypedRedisCache[entity.Novel](rdb),
		// NovelWithTags:    newTypedRedisCache[entity.NovelWithTags](rdb),
		// Announcement:     newTypedRedisCache[entity.Announcement](rdb),
		// SeoOptionSetting: newTypedRedisCache[entity.SeoOptionSetting](rdb),
		// SeoOptionData:    newTypedRedisCache[entity.SeoOptionData](rdb),
		// UserBalance:      newTypedRedisCache[entity.UserBalance](rdb),
	}
}

func (c *Cache) InvalidatePattern(ctx context.Context, patterns ...string) error {
	if !config.Configs.CacheEnabled || c.Client == nil {
		common.Logger.Warn("skip invalidating cache",
			slog.String("message", "redis is disabled"),
			slog.Any("patterns", patterns),
			slog.String("component", "cache.cache"),
			slog.String("method", "InvalidatePattern"))
		return nil
	}

	return invalidatePattern(ctx, c.Client, patterns...)
}
