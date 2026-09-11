package common

import (
	"fmt"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/apperror"
)

// BuildCallbackURL builds a callback URL for the given environment, host, port, and provider.
// Returns an empty string if it fails at some point.
func BuildCallbackURL(isDev bool, host, port, schema, provider string) (string, error) {
	if isDev && IsValidLocalhost(host) {
		return buildCallbackURL(schema, fmt.Sprintf("%s:%s", "localhost", port), provider), nil
	}

	if IsValidIP(host) || !IsValidProxy(host) && !IsValidLocalhost(host) {
		addr := host

		if port != "" {
			addr = fmt.Sprintf("%s:%s", host, port)
		}

		return buildCallbackURL(schema, addr, provider), nil
	}

	return "", apperror.ErrAuthHostInvalid
}

func buildCallbackURL(schema, addr, provider string) string {
	if strings.HasPrefix(addr, schema) {
		return fmt.Sprintf("%s/v1/auth/%s/callback", addr, provider)
	}

	return fmt.Sprintf("%s://%s/v1/auth/%s/callback", schema, addr, provider)
}
