package apperror

// MaxWarnings is the number of chat-policy violations before a user is auto-banned.
const MaxWarnings = 3

var (
	ErrNotFound       = NewCustomError("not found")
	ErrInternalServer = NewCustomError("internal server error")
	ErrBadRequest     = NewCustomError("bad request")

	ErrInvalidInput           = NewCustomError("invalid input")
	ErrUserAlreadyExists      = NewCustomError("user already exists")
	ErrUserEmailAlreadyExists = NewCustomError("user email already exists")
	ErrUserNotFound           = NewCustomError("user not found")
	ErrUserNotAuthenticated   = NewCustomError("user not authenticated")
	ErrUserNotAuthorized      = NewCustomError("user not authorized")
	ErrUserSessionInvalid     = NewCustomError("user session invalid")
	ErrUserSessionUpdate      = NewCustomError("user session update failed")
	ErrEnvInvalid             = NewCustomError("environment is invalid")

	ErrUUIDInvalid = NewCustomError("invalid UUID")

	ErrTxStart    = NewCustomError("failed to start transaction")
	ErrTxRollback = NewCustomError("failed to rollback transaction")
	ErrTxCommit   = NewCustomError("failed to commit transaction")

	ErrSearchQueryInvalid = NewCustomError("invalid search queries")

	ErrDatabasePingFailed   = NewCustomError("database ping failed")
	ErrDatabaseHealthFailed = NewCustomError("database health check failed")

	ErrContentColorDominant      = NewCustomError("failed to generate dominant color")
	ErrContentColorInvalid       = NewCustomError("invalid color")
	ErrContentDeleteInvalidInput = NewCustomError("invalid content ID")

	// Moderation
	ErrFlaggedMessageNotFound = NewCustomError("flagged message not found")
	ErrFlaggedMessageReviewed = NewCustomError("flagged message already reviewed")
	ErrUserAlreadyBanned      = NewCustomError("user is already banned")
	ErrUserNotBanned          = NewCustomError("user is not banned")
)
