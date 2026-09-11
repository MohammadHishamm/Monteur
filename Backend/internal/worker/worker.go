package worker

import (
	"context"

	"github.com/OmarHosny18/APP-frontend/internal/service"
	"github.com/OmarHosny18/APP-frontend/internal/store"
)

type Worker struct {
	service *service.Service
	store   *store.Store
}

func New(s *service.Service, st *store.Store) *Worker {
	return &Worker{
		service: s,
		store:   st,
	}
}

func (w *Worker) Run(ctx context.Context) {
}
