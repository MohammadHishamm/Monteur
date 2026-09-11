package common

import (
	"net"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// GetIPAddr returns the real client IP address, even behind proxies.
func GetIPAddr(r *http.Request) string {
	// 1. Check X-Forwarded-For header (may contain multiple IPs)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		for _, ip := range ips {
			ip = strings.TrimSpace(ip)
			if parsed := net.ParseIP(ip); parsed != nil && !parsed.IsLoopback() {
				return parsed.String()
			}
		}
	}

	// 2. Check Cloudflare header
	if cfIP := r.Header.Get("CF-Connecting-IP"); cfIP != "" {
		if parsed := net.ParseIP(cfIP); parsed != nil && !parsed.IsLoopback() {
			return parsed.String()
		}
	}

	// 3. Check X-Real-IP header
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		if parsed := net.ParseIP(realIP); parsed != nil && !parsed.IsLoopback() {
			return parsed.String()
		}
	}

	// 4. Fallback to RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		if ip := net.ParseIP(host); ip != nil && !ip.IsLoopback() {
			return ip.String()
		}
	}

	// 5. If all else fails, return empty string
	return ""
}

// GetUserAgent returns the user agent from the request header
func GetUserAgent(r *http.Request) string {
	if ua := r.Header.Get("User-Agent"); ua != "" {
		return ua
	}

	return "unknown"
}

func ParseIDURLParam(r *http.Request, key string) (uuid.UUID, error) {
	param := chi.URLParam(r, key)
	if param == "" {
		return uuid.Nil, ErrBadRequest
	}

	return uuid.Parse(param)
}
