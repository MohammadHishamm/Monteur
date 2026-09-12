package handler

import (
	"context"
	"net/http"

	"github.com/OmarHosny18/APP-frontend/admin/site"
)

func withModelCtx(r *http.Request, m *site.Model) context.Context {
	return context.WithValue(r.Context(), modelCtxKey{}, m)
}
