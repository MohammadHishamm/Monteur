package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/OmarHosny18/APP-frontend/common"
	"github.com/google/uuid"
)

const maxVideoMemory = 32 << 20 // 32 MB form-parse buffer; file streams to disk

// HandleUploadVideo godoc
//
//	@Summary		Upload a video file — Authenticated
//	@Tags			upload
//	@Accept			multipart/form-data
//	@Produce		json
//	@Router			/upload/video [post]
func (h *Handler) HandleUploadVideo(w http.ResponseWriter, r *http.Request) {
	storageDir := common.GetEnvString("STORAGE_DIR", "./uploads")
	publicMediaBase := common.GetEnvString("PUBLIC_MEDIA_BASE", "/uploads")
	maxVideoBytes := common.GetEnvInt64("MAX_VIDEO_BYTES", 314572800)
	videoTranscode := common.GetEnvBool("VIDEO_TRANSCODE", false)

	r.Body = http.MaxBytesReader(w, r.Body, maxVideoBytes)
	if err := r.ParseMultipartForm(maxVideoMemory); err != nil {
		common.ServeBadRequestResponse(w, r, fmt.Errorf("video too large or malformed: %w", err))
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		common.ServeBadRequestResponse(w, r, err)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".mp4" && ext != ".webm" {
		common.ServeBadRequestResponse(w, r, fmt.Errorf("unsupported video type: %s", ext))
		return
	}

	if err := os.MkdirAll(storageDir, 0755); err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}

	name := fmt.Sprintf("%d_%s%s", time.Now().UnixMilli(), uuid.New().String()[:8], ext)
	dstPath := filepath.Join(storageDir, name)

	dst, err := os.Create(dstPath)
	if err != nil {
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		os.Remove(dstPath)
		common.ServeInternalServerResponse(w, r, err)
		return
	}
	dst.Close()

	finalName := name
	if videoTranscode {
		if out, err := transcodeTo720p(dstPath, storageDir); err == nil {
			os.Remove(dstPath)
			finalName = filepath.Base(out)
		}
		// on transcode error fall back to raw upload — don't fail the request
	}

	url := strings.TrimRight(publicMediaBase, "/") + "/" + finalName
	common.WriteJson(w, http.StatusCreated, common.DataEnvelope{Data: map[string]string{"url": url}})
}

// transcodeTo720p compresses the raw upload to H.264 720p using FFmpeg.
// Only called when VIDEO_TRANSCODE=true (i.e. on a server with ffmpeg installed).
func transcodeTo720p(rawPath, outDir string) (string, error) {
	out := filepath.Join(outDir, uuid.New().String()+".mp4")
	cmd := exec.Command("ffmpeg",
		"-i", rawPath,
		"-vf", "scale=-2:720",
		"-c:v", "libx264", "-crf", "28", "-preset", "fast",
		"-c:a", "aac", "-b:a", "128k",
		"-movflags", "+faststart",
		"-y", out,
	)
	if err := cmd.Run(); err != nil {
		return "", err
	}
	return out, nil
}
