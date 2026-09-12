package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/google/uuid"
)

const uploadDir = "./uploads"
const maxUploadBytes = 10 << 20 // 10 MB

// HandleUploadFile godoc
//
//	@Summary		Upload a file (avatar, cover) — Authenticated
//	@Tags			upload
//	@Accept			multipart/form-data
//	@Produce		json
//	@Router			/upload [post]
func (h *Handler) HandleUploadFile(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowed[ext] {
		common.ServeBadRequestResponse(w, r, fmt.Errorf("unsupported file type: %s", ext))
		return
	}

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixMilli(), uuid.New().String()[:8], ext)
	destPath := filepath.Join(uploadDir, filename)

	data, err := io.ReadAll(file)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if err := os.WriteFile(destPath, data, 0644); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	url := fmt.Sprintf("/uploads/%s", filename)
	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: map[string]string{"url": url}})
}
