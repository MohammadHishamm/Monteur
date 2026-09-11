package common

import (
	"fmt"
	"net/http"
	"strconv"
)

type BaseQuery struct {
	Search string `json:"search,omitempty" validate:"max=100"`
	Limit  int    `json:"limit" validate:"gte=1,lte=50"`
	Offset int    `json:"offset" validate:"gte=0"`
	Sort   string `json:"sort,omitempty" validate:"oneof=asc desc"`
}

func (bq *BaseQuery) String() string {
	return fmt.Sprintf("search:%s,limit:%d,offset:%d,sort:%s", bq.Search, bq.Limit, bq.Offset, bq.Sort)
}

type Paginator struct {
	Cursor CursorQuery
	Offset OffsetQuery
}

type CursorQuery struct {
	BaseQuery
	NextPagination *string `json:"nextPagination,omitempty"`
}

func (cq *CursorQuery) String() string {
	if cq.NextPagination == nil {
		return fmt.Sprintf("%s,nextPagination:nil", cq.BaseQuery.String())
	}

	return fmt.Sprintf("%s,nextPagination:%s", *cq.NextPagination, cq.BaseQuery.String())
}

type OffsetQuery struct {
	BaseQuery
	Status        string `json:"status,omitempty" validate:"required,oneof=completed ongoing none"`
	PublishStatus string `json:"publishStatus,omitempty" validate:"required,oneof=published pending"`
	Active        bool   `json:"active,omitempty" validate:"boolean"`
}

func (oq *OffsetQuery) String() string {
	return fmt.Sprintf("%s,status:%s,publishStatus:%s,active:%t", oq.BaseQuery.String(), oq.Status, oq.PublishStatus, oq.Active)
}

func NewBaseQuery(sort, search string, offset, limit int) BaseQuery {
	if sort == "" {
		sort = "desc"
	}

	return BaseQuery{
		Sort:   sort,
		Search: search,
		Offset: offset,
		Limit:  limit,
	}
}

func (qr *BaseQuery) Parse(r *http.Request) error {
	qs := r.URL.Query()

	sort := qs.Get("sort")
	if sort != "" {
		qr.Sort = sort
	}

	search := qs.Get("search")
	if search != "" {
		qr.Search = search
	}

	limit := qs.Get("limit")
	if limit != "" {
		l, err := strconv.Atoi(limit)
		if err != nil {
			return err
		}
		qr.Limit = l
	}

	offset := qs.Get("offset")
	if offset != "" {
		o, err := strconv.Atoi(offset)
		if err != nil {
			return err
		}
		qr.Offset = o
	}

	return nil
}

func NewOffsetQuery(status, publishStatus, search string, sort string, limit, offset int) OffsetQuery {
	if publishStatus == "" {
		publishStatus = "published"
	}

	if status == "" {
		status = "none"
	}

	return OffsetQuery{
		Status:        status,
		PublishStatus: publishStatus,
		Active:        false,
		BaseQuery:     NewBaseQuery(sort, search, offset, limit),
	}
}

func NewDefaultOffsetQuery() OffsetQuery {
	return NewOffsetQuery("", "", "", "desc", 10, 0)
}

func (oq *OffsetQuery) Parse(r *http.Request) error {
	err := oq.BaseQuery.Parse(r)
	if err != nil {
		return err
	}

	qs := r.URL.Query()

	status := qs.Get("status")
	if status != "" {
		oq.Status = status
	}

	publishStatus := qs.Get("publishStatus")
	if publishStatus != "" {
		oq.PublishStatus = publishStatus
	}

	active := qs.Get("active")
	if active != "" {
		b, err := strconv.ParseBool(active)
		if err != nil {
			return err
		}
		oq.Active = b
	}

	return nil
}

func NewCursorQuery(nextPagination *string, sort, search string, limit int) CursorQuery {
	return CursorQuery{
		NextPagination: nextPagination,
		BaseQuery:      NewBaseQuery(sort, search, limit, 0),
	}
}

func NewDefaultCursorQuery() CursorQuery {
	return NewCursorQuery(nil, "desc", "", 10)
}

func (cq *CursorQuery) Parse(r *http.Request) error {
	err := cq.BaseQuery.Parse(r)
	if err != nil {
		return err
	}

	qs := r.URL.Query()

	nextPagination := qs.Get("nextPagination")
	if nextPagination != "" {
		cq.NextPagination = &nextPagination
	} else {
		cq.NextPagination = nil
	}

	return nil
}
