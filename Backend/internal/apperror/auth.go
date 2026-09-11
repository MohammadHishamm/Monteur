package apperror

var (
	ErrAuthProviderInvalid = NewCustomError("invalid auth provider")
	ErrAuthHostInvalid     = NewCustomError("invalid auth host")
	ErrUserLoggedIn 	   = NewCustomError("user logged  in")
)