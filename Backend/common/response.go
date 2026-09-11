package common

import (
	"encoding/json"
	"encoding/xml"
	"errors"
	"log/slog"
	"net/http"
)

var (
	ErrForbidden     = NewCustomError("forbidden")
	ErrNotFound      = NewCustomError("not found")
	ErrUnauthorized  = NewCustomError("unauthorized")
	ErrInternalError = NewCustomError("the server encountered a problem")
	ErrBadRequest    = NewCustomError("bad request")
	ErrUnverified    = NewCustomError("unverified")
)

type DataEnvelope struct {
	Data any `json:"data"`
}

type MetaEnvelope struct {
	Meta any `json:"meta"`
}

type DataMetaEnvelope struct {
	Data any `json:"data"`
	Meta any `json:"meta,omitempty"`
}

type ErrorEnvelope struct {
	Error  string `json:"error"`
	Detail string `json:"detail,omitempty"`
}

type ErrorsEnvelope struct {
	Error []string `json:"error"`
}

type StatusEnvelope struct {
	Status string `json:"status"`
}

type ListMetaEnvelope struct {
	Page   int `json:"page"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Total  int `json:"total,omitempty"`
}

type XmlErrror struct {
	XMLName xml.Name `xml:"error"`
	Code    int      `xml:"code,omitempty"`
	Message string   `xml:"message,omitempty"`
}

func writeJson(w http.ResponseWriter, status int, data any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(data)
}

func writeXml(w http.ResponseWriter, status int, data any) error {
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(status)
	return xml.NewEncoder(w).Encode(data)
}

func ReadJson[T any](w http.ResponseWriter, r *http.Request) (*T, error) {
	var data T
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	defer r.Body.Close()

	if err := decoder.Decode(&data); err != nil {
		Logger.Error("failed to decode json",
			slog.Any("error", err),
			slog.String("request", r.URL.String()),
			slog.String("method", r.Method),
			slog.String("component", "common.response"),
			slog.String("method", "ReadJson"))
		return nil, err
	}

	return &data, nil
}

func WriteJsonError(w http.ResponseWriter, status int, err error) error {
	envelope := &ErrorEnvelope{Error: err.Error()}

	// Check if the error has a detail field (CustomError)
	if customErr, ok := err.(interface{ Detail() string }); ok {
		if detail := customErr.Detail(); detail != "" {
			envelope.Detail = detail
		}
	}

	return writeJson(w, status, envelope)
}

func WriteJsonErrors(w http.ResponseWriter, status int, errs []string) error {
	return writeJson(w, status, &ErrorsEnvelope{Error: errs})
}

func WriteJson(w http.ResponseWriter, status int, v any) error {
	return writeJson(w, status, v)
}

func WriteXml(w http.ResponseWriter, status int, v any) error {
	return writeXml(w, status, v)
}

func WriteXmlError(w http.ResponseWriter, status int, v any) error {
	return writeXml(w, status, v)
}

func ServeInternalServerResponse(w http.ResponseWriter, r *http.Request, err error) {
	if err == nil {
		err = ErrInternalError
	}

	Logger.Error("failed with internal server error",
		slog.Any("error", err),
		slog.String("request", r.URL.String()),
		slog.String("method", r.Method),
		slog.String("component", "common.response"),
		slog.String("method", "ServeInternalServerResponse"))

	WriteJsonError(w, http.StatusInternalServerError, ErrInternalError)
}

func ServeForbiddenResponse(w http.ResponseWriter, r *http.Request) {
	WriteJsonError(w, http.StatusForbidden, ErrForbidden)
}

func ServeUnverifiedErrorResponse(w http.ResponseWriter, r *http.Request) {
	WriteJsonError(w, http.StatusForbidden, ErrUnverified)
}

func ServeBadRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	if err == nil {
		err = ErrBadRequest
	}

	WriteJsonError(w, http.StatusBadRequest, err)
}

func ServeConflictResponse(w http.ResponseWriter, r *http.Request, err error) {
	WriteJson(w, http.StatusConflict, err)
}

func ServeNotFoundResponse(w http.ResponseWriter, r *http.Request, err error) {
	Logger.Error("failed with not found",
		slog.Any("error", err),
		slog.String("request", r.URL.String()),
		slog.String("method", r.Method),
		slog.String("component", "common.response"),
		slog.String("method", "ServeNotFoundResponse"))
	WriteJsonError(w, http.StatusNotFound, ErrNotFound)
}

func ServeUnauthorizedErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	if err == nil {
		err = ErrUnauthorized
	}

	WriteJsonError(w, http.StatusUnauthorized, err)
}

func ServeRateLimitExceededResponse(w http.ResponseWriter, r *http.Request, retryAfter string) {
	w.Header().Set("Retry-After", retryAfter)
	WriteJsonError(w, http.StatusTooManyRequests, errors.New("rate limit exceeded, retry after: "+retryAfter))
}
