package apperror

import (
	"errors"
	"fmt"
)

type CustomError struct {
	message string
	detail  string
	wrapped error
}

func NewCustomError(message string) *CustomError {
	return &CustomError{message: message}
}

func (err *CustomError) Error() string {
	if err.detail != "" {
		return fmt.Sprintf("%s: %s", err.message, err.detail)
	}

	return err.message
}

func (err *CustomError) Detail() string {
	return err.detail
}

func (err *CustomError) WithDetail(detail string) *CustomError {
	return &CustomError{
		message: err.message,
		detail:  detail,
		wrapped: err.wrapped,
	}
}

func (err *CustomError) WithDetailError(detailErr error) *CustomError {
	return &CustomError{
		message: err.message,
		detail:  detailErr.Error(),
		wrapped: err.wrapped,
	}
}

func (err *CustomError) Wrap(inner error) *CustomError {
	return &CustomError{
		message: err.message,
		detail:  err.detail,
		wrapped: inner,
	}
}

func (err *CustomError) Unwrap() error {
	return err.wrapped
}

func (err *CustomError) Is(target error) bool {
	var customError *CustomError

	if errors.As(target, &customError) {
		return err.message == customError.message
	}

	return false
}
