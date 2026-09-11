package ratelimiter

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

type BucketRateLimiter struct {
	mu      sync.RWMutex
	clients map[string]*BucketClient

	limit   int
	window  time.Duration
	enabled bool

	bucketSize  time.Duration
	bucketCount int
	logAllowed  bool
}

type BucketClient struct {
	mu         sync.Mutex
	buckets    []int
	lastUpdate time.Time
}

// NewBucketRateLimiter creates a new fixed window rate limiter.
func NewBucketRateLimiter(enabled bool, requestPerTimeFrame int, d time.Duration, bucketCount int, logAllowed bool) (Limiter, error) {
	if bucketCount <= 0 {
		bucketCount = 1
	}
	if d <= 0 {
		d = common.RatelimiterDuration
	}
	if requestPerTimeFrame <= 0 {
		requestPerTimeFrame = DefaultRateLimiterConfig.RequestsPerTimeFrame
	}

	return &BucketRateLimiter{
		clients:     make(map[string]*BucketClient),
		window:      d,
		limit:       requestPerTimeFrame,
		enabled:     enabled,
		bucketSize:  d / time.Duration(bucketCount),
		bucketCount: bucketCount,
		logAllowed:  logAllowed,
	}, nil
}

func NewDefaultBucketRateLimiter(bucketCount int, opts ...Option) (Limiter, error) {
	c := DefaultRateLimiterConfig

	for _, opt := range opts {
		opt(&c)
	}

	return NewBucketRateLimiter(c.Enabled, c.RequestsPerTimeFrame, c.TimeFrame, bucketCount, c.LogAllowed)
}

// Request enforces rate limiting for a given IP address.
func (rl *BucketRateLimiter) Request(ipAddr string) (bool, time.Duration) {
	if !rl.enabled {
		return true, 0
	}

	now := time.Now()

	rl.mu.Lock()
	c, ok := rl.clients[ipAddr]
	if !ok {
		c = &BucketClient{
			buckets:    make([]int, rl.bucketCount),
			lastUpdate: now,
		}
		rl.clients[ipAddr] = c
	}
	rl.mu.Unlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	elapsed := now.Sub(c.lastUpdate)
	if elapsed >= rl.bucketSize {
		shift := int(elapsed / rl.bucketSize)
		if shift > rl.bucketCount {
			shift = rl.bucketCount
		}

		copy(c.buckets, c.buckets[shift:])
		for i := rl.bucketCount - shift; i < rl.bucketCount; i++ {
			c.buckets[i] = 0
		}
		c.lastUpdate = now
	}

	total := 0
	for _, v := range c.buckets {
		total += v
	}

	if total >= rl.limit {
		retryAfter := rl.window - elapsed
		if retryAfter < 0 {
			retryAfter = rl.bucketSize
		}
		return false, retryAfter
	}

	c.buckets[rl.bucketCount-1]++
	return true, 0
}

func (rl *BucketRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := common.GetIPAddr(r)

		if !rl.enabled {
			next.ServeHTTP(w, r)
			return
		}

		if allow, retryAfter := rl.Request(ip); !allow {
			common.Logger.Warn("rate limited client request",
				slog.Bool("allow", allow),
				slog.Any("retryAfter", retryAfter),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("component", "ratelimiter.bucket"),
				slog.String("method", "Middleware"))
			common.ServeRateLimitExceededResponse(w, r, retryAfter.String())
			return
		}

		if rl.logAllowed {
			common.Logger.Debug("allowed client request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("component", "ratelimiter.bucket"),
				slog.String("method", "Middleware"))
		}

		next.ServeHTTP(w, r)
	})
}

func (rl *BucketRateLimiter) Worker(ctx context.Context) {
	common.Logger.Info("starting worker",
		slog.String("worker", "inactiveClientsCleaner"),
		slog.String("component", "ratelimiter.bucket"),
		slog.String("method", "Worker"))

	go rl.inactiveClientsCleaner(ctx)
}

// inactiveClientsCleaner deletes clients that have been inactive for a long time.
func (rl *BucketRateLimiter) inactiveClientsCleaner(ctx context.Context) {
	t := time.NewTicker(time.Hour)
	defer t.Stop()

	for {
		select {
		case <-t.C:
			now := time.Now()
			rl.mu.Lock()

			for ip, c := range rl.clients {
				c.mu.Lock()
				inactive := now.Sub(c.lastUpdate) > time.Hour
				c.mu.Unlock()

				if inactive {
					delete(rl.clients, ip)
				}
			}

			rl.mu.Unlock()

		case <-ctx.Done():
			return
		}
	}
}
