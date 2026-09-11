package gatekeeper

import "github.com/OmarHosny18/APP-frontend/common"

var (
	ErrForbidden          = common.NewCustomError("forbidden")
	ErrInvalidTimestamp   = common.NewCustomError("Invalid timestamp")
	ErrFailedHMAC         = common.NewCustomError("Failed to generate HMAC")
	ErrInvalidCredentials = common.NewCustomError("Invalid request credentials")
	ErrInvalidConfig      = common.NewCustomError("Invalid configuration")
)
