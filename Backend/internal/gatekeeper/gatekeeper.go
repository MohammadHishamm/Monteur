package gatekeeper

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
)

type Keeper interface {
	Verify(reqID, timestamp string) (bool, error)
	Middleware(next http.Handler) http.Handler
}

type hmacKeeper struct {
	Enabled         bool
	ApiKey          string
	SecretKey       string
	RequestDuration time.Duration
}

func NewHMACKeeper(enabled bool, apiKey, secretKey string) (Keeper, error) {
	if apiKey == "" || secretKey == "" {
		common.Logger.Error("failed to create new hmac keeper",
			slog.String("error", "apiKey or secretKey is missing"),
			slog.String("component", "gatekeeper.gatekeeper"),
			slog.String("method", "NewHMACKeeper"))

		return nil, ErrInvalidConfig.WithDetail("missing required configuration api key or secret key")
	}

	d, err := time.ParseDuration(common.GateKeeperDuration)
	if err != nil {
		return nil, ErrInvalidConfig.WithDetail(err.Error())
	}

	return &hmacKeeper{
		Enabled:         enabled,
		ApiKey:          apiKey,
		SecretKey:       secretKey,
		RequestDuration: d,
	}, nil
}

func (ag *hmacKeeper) Verify(reqID, timestamp string) (bool, error) {
	if reqID == "" || timestamp == "" {
		return false, ErrInvalidCredentials
	}

	if !ag.isValidTimeStamp(timestamp) {
		return false, ErrInvalidTimestamp
	}

	p := ag.ApiKey + timestamp
	hash := common.GenerateHMAC([]byte(ag.SecretKey), []byte(p))

	return common.CompareHMAC(hash, reqID), nil
}

// Middleware returns a middleware that verifies the request ID and timestamp
// and allows the request to proceed if verification is successful.
func (ag *hmacKeeper) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger := common.Logger.With(slog.String("method", "Middleware"), slog.String("ipAddr", common.GetIPAddr(r)))

		if !ag.Enabled {
			logger.Warn("ignored gatekeeper verification", "message", "gatekeeper disabled")
			next.ServeHTTP(w, r)
			return
		}

		t, reqID := ag.getTimestamp(r), ag.getRequestID(r)
		ok, err := ag.Verify(reqID, t)
		if err != nil {
			logger.Error("failed to verify request", "error", err)
			common.ServeUnauthorizedErrorResponse(w, r, ErrForbidden.WithDetail(err.Error()))
			return
		}

		if !ok {
			logger.Error("failed to verify request", "error", "verification failed")
			common.ServeUnauthorizedErrorResponse(w, r, ErrForbidden.WithDetail("verification failed"))
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (ag *hmacKeeper) isValidTimeStamp(timestamp string) bool {
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}

	t := time.Unix(ts, 0)
	since := time.Since(t)

	return since < ag.RequestDuration
}

func (ag *hmacKeeper) getRequestID(r *http.Request) string {
	return r.Header.Get(common.GateKeeperHeaderRequestID)
}

func (ag *hmacKeeper) getTimestamp(r *http.Request) string {
	return r.Header.Get(common.GateKeeperHeaderTimeStamp)
}
