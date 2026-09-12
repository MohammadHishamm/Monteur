package ratelimiter

import (
	"context"
	"net/http"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

var (
	DefaultBucketCount = 32

	DefaultRateLimiterConfig = RateLimiterConfig{
		Enabled:              true,
		RequestsPerTimeFrame: 600,
		TimeFrame:            common.RatelimiterDuration,
	}
)

type Limiter interface {
	Request(ipAddr string) (bool, time.Duration)
	Middleware(next http.Handler) http.Handler
	Worker(ctx context.Context)
}

type RateLimiterConfig struct {
	Enabled              bool
	RequestsPerTimeFrame int
	TimeFrame            time.Duration
	LogAllowed           bool
}

type Option func(*RateLimiterConfig)

func WithEnabled(enabled bool) Option {
	return func(c *RateLimiterConfig) {
		c.Enabled = enabled
	}
}

func WithRequestCount(count int) Option {
	return func(c *RateLimiterConfig) {
		if count > 0 {
			c.RequestsPerTimeFrame = count
		}
	}
}

func WithTimeFrame(tf time.Duration) Option {
	return func(c *RateLimiterConfig) {
		if tf > 0 {
			c.TimeFrame = tf
		}
	}
}

func WithLogAllowed(enabled bool) Option {
	return func(c *RateLimiterConfig) {
		c.LogAllowed = enabled
	}
}
