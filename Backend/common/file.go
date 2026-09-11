package common

import (
	"fmt"
	"image"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/google/uuid"
)

const (
	MangaCoverPath         SaveLocation = "mangas/covers"
	MangaBannerPath        SaveLocation = "mangas/banners"
	MangaThumbPath         SaveLocation = "mangas/thumbs"
	MangaChapterPath       SaveLocation = "mangas/chapters"
	NovelCoverPath         SaveLocation = "novels/covers"
	NovelBannerPath        SaveLocation = "novels/banners"
	NovelThumbPath         SaveLocation = "novels/thumbs"
	NovelChapterPath       SaveLocation = "novels/chapters"
	AnnouncementBannerPath SaveLocation = "announcements/banners"
	AnnouncementThumbPath  SaveLocation = "announcements/thumbs"
	UserImagesPath         SaveLocation = "users/images"
	ChallengeSubmissionPath SaveLocation = "challenges/submissions"
	StoreCoinAvatarPath    SaveLocation = "store/coins"
	UploadDirName          string       = "uploads"
	MaxUploadSize          int64        = 500 << 20 // 500 MB

	CoinAvatarWidth  = 80
	CoinAvatarHeight = 60

	ThumbSmWidth = 300
	ThumbMdWidth = 450
	ThumbLgWidth = 600
)

var (
	ErrFileNotFound     = NewCustomError("file not found")
	ErrFileTooLarge     = NewCustomError("file is too large")
	ErrFileInvalidType  = NewCustomError("file type not supported")
	ErrFileMissingExt   = NewCustomError("file extention is missing")
	ErrPathMismatchType = NewCustomError("path exists but is not a directory")

	DefaultUploader *Uploader
)

type SaveLocation string

func (sl SaveLocation) String() string {
	return string(sl)
}

type ValidFileExts map[string]bool

type Uploader struct {
	Location      string
	MaxUploadSize int64
	ValidFileExts ValidFileExts
}

type UploadResult struct {
	Index    int
	Filename string
	Path     string
	Error    error
}

// NewUploader creates a new uploader.
func NewUploader(maxUploadSize int64, location string) *Uploader {
	return &Uploader{
		Location:      location,
		MaxUploadSize: maxUploadSize,
		ValidFileExts: ValidImageExts,
	}
}

func MustInitUploader(maxUploadSize int64, location string) {
	if DefaultUploader == nil {
		DefaultUploader = NewUploader(maxUploadSize, location)
	}

	_, err := DefaultUploader.MakeUploadLocation(location)
	if err != nil {
		Logger.Error("failed to create static resources directory",
			slog.Any("error", err),
			slog.String("location", location),
			slog.String("component", "common.file"),
			slog.String("method", "MustInitUploader"))
		panic(err)
	}

	Logger.Info("created static resources directory",
		slog.String("location", location),
		slog.String("component", "common.file"),
		slog.String("method", "MustInitUploader"))
}

// NewDefaultUploader creates a new default uploader.
func NewDefaultUploader() *Uploader {
	return NewUploader(MaxUploadSize, UploadDirName)
}

// SaveFile saves a file to the specified location.
// For banners, automatically resizes to 752px width for performance optimization.
func (u *Uploader) SaveFile(r *http.Request, key string, location SaveLocation) (string, error) {
	fhs, err := u.ParseFileHeaders(r, key)
	if err != nil {
		return "", err
	}

	fh := fhs[0]

	err = u.ValidateFileHeader(fh)
	if err != nil {
		return "", err
	}

	// Optimize banners: resize to display size (752px width) to reduce file size
	// This significantly improves page load performance
	if location == MangaBannerPath || location == NovelBannerPath {
		// Save original first, then resize
		originalPath, err := u.WriteFileHeader(fh, location)
		if err != nil {
			return "", err
		}

		// Resize banner to 752px width (display size) to reduce file size
		// This saves ~500KB per banner image
		resizedPath, err := u.resizeImage(originalPath, location, 752)
		if err != nil {
			// If resize fails, return original (log error but don't fail upload)
			Logger.Warn("failed to resize banner image, using original",
				slog.Any("error", err),
				slog.String("path", originalPath),
				slog.String("component", "common.file"),
				slog.String("method", "SaveFile"))
			return originalPath, nil
		}

		// Delete original and use resized version
		os.Remove(filepath.Join(u.Location, originalPath))
		return resizedPath, nil
	}

	path, err := u.WriteFileHeader(fh, location)
	if err != nil {
		return "", err
	}

	return path, nil
}

// SaveFiles saves multiple files to the specified location.
// Returns slice of saved paths, and slice of errors of any during writing to disk.
// Last param is error during function execurtion outside of disk write errors
// The returned paths are in the same order as the files were provided in the request.
func (u *Uploader) SaveFiles(r *http.Request, key string, location SaveLocation) ([]string, []string, error) {
	fhs, err := u.ParseFileHeaders(r, key)
	if err != nil {
		return nil, nil, ErrFileNotFound
	}

	var (
		wg     sync.WaitGroup
		result = make(chan UploadResult, len(fhs))
	)

	for index, fh := range fhs {
		wg.Add(1)

		go func(index int, fh *multipart.FileHeader) {
			defer wg.Done()

			err := u.ValidateFileHeader(fh)
			if err != nil {
				result <- UploadResult{
					Index:    index,
					Filename: fh.Filename,
					Error:    err,
				}
				return
			}

			path, err := u.WriteFileHeader(fh, location)
			if err != nil {
				result <- UploadResult{
					Index:    index,
					Filename: fh.Filename,
					Path:     path,
					Error:    err,
				}
				return
			}

			result <- UploadResult{
				Index:    index,
				Filename: fh.Filename,
				Path:     path,
			}
		}(index, fh)
	}

	go func() {
		wg.Wait()
		close(result)
	}()

	// Collect results and preserve order
	results := make([]UploadResult, 0, len(fhs))
	for res := range result {
		results = append(results, res)
	}

	// Build paths array in the correct order (preserving original file order)
	// This ensures the returned paths match the order files were provided in FormData
	paths := make([]string, len(fhs))
	errs := make([]string, 0)

	for _, res := range results {
		if res.Error != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", res.Filename, res.Error))
		} else if res.Index >= 0 && res.Index < len(paths) {
			paths[res.Index] = res.Path
		}
	}

	// Filter out any empty slots (in case of errors, but maintain order for successful uploads)
	finalPaths := make([]string, 0, len(paths))
	for _, path := range paths {
		if path != "" {
			finalPaths = append(finalPaths, path)
		}
	}

	return finalPaths, errs, nil
}

// DeleteFiles cleans the uploaded files.
// Returns success rate and slice of errors.
func (u *Uploader) DeleteFiles(paths []string) (int, []string) {
	var (
		wg     sync.WaitGroup
		result = make(chan UploadResult, len(paths))
	)

	for _, path := range paths {
		wg.Add(1)

		go func(path string) {
			defer wg.Done()

			if path == "" {
				return
			}

			fullPath := filepath.Join(u.Location, path)
			err := os.Remove(fullPath)

			// Handle "file not found" errors gracefully - file may have already been deleted
			if err != nil && os.IsNotExist(err) {
				Logger.Debug("file not found (already deleted), skipping",
					slog.String("path", fullPath),
					slog.String("component", "common.file"),
					slog.String("method", "CleanUploads"))
				// Don't report this as an error - treat as success
				result <- UploadResult{Path: fullPath, Error: nil}
				return
			}

			if err != nil {
				Logger.Error("failed to delete file",
					slog.Any("error", err),
					slog.String("path", fullPath),
					slog.String("component", "common.file"),
					slog.String("method", "CleanUploads"))
			} else {
				Logger.Debug("deleted file",
					slog.String("path", fullPath),
					slog.String("component", "common.file"),
					slog.String("method", "CleanUploads"))
			}

			result <- UploadResult{Path: fullPath, Error: err}
		}(path)
	}

	go func() {
		wg.Wait()
		close(result)
	}()

	var (
		errs         []string
		successCount int
	)

	for res := range result {
		if res.Error != nil {
			err := fmt.Sprintf("%s: %v", res.Path, res.Error)
			errs = append(errs, err)
		} else {
			successCount += 1
		}
	}

	return successCount, errs
}

func (u *Uploader) SaveFileHeader(fh *multipart.FileHeader, location SaveLocation) (string, error) {
	err := u.ValidateFileHeader(fh)
	if err != nil {
		return "", err
	}

	path, err := u.WriteFileHeader(fh, location)
	if err != nil {
		return "", err
	}

	return path, nil
}

// SetMaxUploadSize sets the maximum upload size.
func (u *Uploader) SetMaxUploadSize(maxUploadSize int64) {
	u.MaxUploadSize = maxUploadSize
}

// ValidateFileHeader validates the file header.
func (u *Uploader) ValidateFileHeader(fh *multipart.FileHeader) error {
	if fh.Size > u.MaxUploadSize {
		return ErrFileTooLarge
	}

	fn := u.SanitizeFileName(fh.Filename)
	ext := u.getFileExt(fn)
	if ext == "" {
		return ErrFileMissingExt
	}

	err := u.validateExt(ext)
	if err != nil {
		return err
	}

	return nil
}

// WriteFileHeader uploads the file header.
// FileHeader is not validated.
func (u *Uploader) WriteFileHeader(fh *multipart.FileHeader, loc SaveLocation) (string, error) {
	location := filepath.Join(u.Location, loc.String())
	Logger.Info("uploading file header",
		slog.String("location", location),
		slog.String("component", "common.file"),
		slog.String("method", "UploadFileHeader"))
	file, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	err = os.MkdirAll(location, os.ModePerm)
	if err != nil {
		return "", err
	}

	ext := u.getFileExt(fh.Filename)
	if ext == "" {
		return "", ErrFileMissingExt
	}

	name, err := u.WriteFile(file, location, ext)
	if err != nil {
		return "", err
	}

	return filepath.Join(string(loc), name), nil
}

func (u *Uploader) MakeUploadLocation(loc string) (bool, error) {
	s, err := os.Stat(loc)
	if err == nil {
		if s.IsDir() {
			return false, nil
		}

		return false, ErrPathMismatchType
	}

	if err := os.MkdirAll(loc, os.ModePerm); err != nil {
		return false, err
	}

	return true, nil
}

func (u *Uploader) WriteFile(r io.Reader, loc, ext string) (string, error) {
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}

	Logger.Debug("uploading file",
		slog.String("location", loc),
		slog.String("ext", ext),
		slog.String("component", "common.file"),
		slog.String("method", "UploadFile"))

	name := uuid.NewString() + ext
	path := filepath.Join(loc, name)
	dst, err := os.Create(path)
	if err != nil {
		Logger.Error("failed to upload file",
			slog.Any("error", err),
			slog.String("path", path),
			slog.String("component", "common.file"),
			slog.String("method", "UploadFile"))
		return "", err
	}
	defer func() {
		if err != nil {
			os.Remove(path)
		}
		dst.Close()
	}()

	_, err = io.Copy(dst, r)
	if err != nil {
		Logger.Error("failed to upload file",
			slog.Any("error", err),
			slog.String("path", path),
			slog.String("component", "common.file"),
			slog.String("method", "UploadFile"))
		return "", err
	}

	return name, nil
}

func (u *Uploader) resizeImage(inputPath string, l SaveLocation, maxWidth int) (string, error) {
	path := filepath.Join(u.Location, inputPath)
	file, err := os.Open(path)
	if err != nil {
		Logger.Error("failed to open file",
			slog.Any("error", err),
			slog.String("path", path),
			slog.String("component", "common.file"),
			slog.String("method", "resizeImage"))
		return "", err
	}
	defer file.Close()

	location := filepath.Join(u.Location, string(l))
	err = os.MkdirAll(location, os.ModePerm)
	if err != nil {
		Logger.Error("failed to create directory",
			slog.Any("error", err),
			slog.String("path", location),
			slog.String("component", "common.file"),
			slog.String("method", "resizeImage"))
		return "", err
	}

	ext := u.getFileExt(inputPath)
	if ext == "" {
		return "", ErrFileMissingExt
	}

	Logger.Debug("resizing image",
		slog.String("path", path),
		slog.String("ext", ext),
		slog.String("component", "common.file"),
		slog.String("method", "resizeImage"))

	if !isResizableImageFormat(ext) {
		Logger.Debug("skipping resize for gif",
			slog.String("path", path),
			slog.String("component", "common.file"),
			slog.String("method", "resizeImage"))
		name, err := u.WriteFile(file, location, ext)
		if err != nil {
			return "", err
		}

		return filepath.Join(string(l), name), nil
	}

	tempImg, format, err := ResizeImage(file, maxWidth)
	if err != nil {
		return "", err
	}

	name := uuid.NewString() + "." + format
	outPath := filepath.Join(location, name)
	relOutPath := filepath.Join(string(l), name)
	dst, err := os.Create(outPath)
	if err != nil {
		return "", err
	}
	defer func() {
		if err != nil {
			os.Remove(outPath)
		}

		dst.Close()
	}()

	err = EncodeJPG(dst, tempImg)
	if err != nil {
		return "", err
	}

	return relOutPath, nil
}

func (u *Uploader) MakeCoinAvatar(inputPath string) (string, error) {
	path := filepath.Join(u.Location, inputPath)
	file, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("failed to open file for resizing: %w", err)
	}
	defer file.Close()

	// Ensure output directory exists
	location := filepath.Join(u.Location, string(StoreCoinAvatarPath))
	if err := os.MkdirAll(location, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create store coin avatar directory: %w", err)
	}

	// Reset file pointer before decoding (just in case)
	if _, err := file.Seek(0, 0); err != nil {
		return "", fmt.Errorf("failed to reset file pointer: %w", err)
	}

	// Resize to fixed 80x60 (or constants)
	resizedImg, format, err := ResizeImageToFixedSize(file, CoinAvatarWidth, CoinAvatarHeight)
	if err != nil {
		return "", fmt.Errorf("failed to resize image: %w", err)
	}

	// Ensure valid format
	format = strings.ToLower(format)
	if format != "jpeg" && format != "png" {
		format = "jpeg" // default to jpeg
	}

	name := uuid.NewString() + "." + format
	outPath := filepath.Join(location, name)
	relOutPath := filepath.Join(string(StoreCoinAvatarPath), name)

	dst, err := os.Create(outPath)
	if err != nil {
		return "", fmt.Errorf("failed to create output file: %w", err)
	}
	defer dst.Close()

	// Encode based on format
	switch format {
	case "png":
		if err := EncodePNG(dst, resizedImg.(*image.RGBA)); err != nil {
			return "", fmt.Errorf("failed to encode PNG image: %w", err)
		}
	default:
		if err := EncodeJPG(dst, resizedImg.(*image.RGBA)); err != nil {
			return "", fmt.Errorf("failed to encode JPEG image: %w", err)
		}
	}

	return relOutPath, nil
}

func (u *Uploader) MakeImageThumb(inputPath string, l SaveLocation, maxWidth int) (string, error) {
	return u.resizeImage(inputPath, l, maxWidth)
}

func (u *Uploader) ParseFileHeaders(r *http.Request, name string) ([]*multipart.FileHeader, error) {
	if r.MultipartForm == nil || r.MultipartForm.File == nil {
		return nil, http.ErrMissingFile
	}

	if len(r.MultipartForm.File) == 0 {
		Logger.Error("failed to parse file header",
			slog.Any("error", http.ErrMissingFile),
			slog.Any("files", r.MultipartForm.File),
			slog.String("component", "common.file"),
			slog.String("method", "ParseFileHeaders"))
		return nil, http.ErrMissingFile
	}

	fhs, ok := r.MultipartForm.File[name]
	if !ok || fhs == nil || len(fhs) == 0 {
		return nil, ErrFileNotFound
	}

	return fhs, nil
}

func (u *Uploader) ParseFileHeader(r *http.Request, name string) (*multipart.FileHeader, error) {
	fhs, err := u.ParseFileHeaders(r, name)
	if err != nil {
		Logger.Error("failed to parse file header",
			slog.Any("error", err),
			slog.String("component", "common.file"),
			slog.String("method", "ParseFileHeader"))
		return nil, err
	}

	return fhs[0], nil
}

func (u *Uploader) getFileExt(fn string) string {
	ext := filepath.Ext(fn)
	return strings.ToLower(ext)
}

func (u *Uploader) validateExt(extn string) error {
	if !strings.Contains(extn, ".") {
		extn = "." + extn
	}

	if !u.ValidFileExts[extn] {
		return ErrFileInvalidType
	}

	return nil
}

func (u *Uploader) SanitizeFileName(fileName string) string {
	fileName = filepath.Base(fileName)
	fileName = filepath.Clean(fileName)

	if fileName == "" || fileName == "." {
		fileName = "unnamed_file"
	}

	return fileName
}

func GetUploadedFileLocalPath(relativePath string) (string, error) {
	exec, err := os.Executable()
	if err != nil {
		return "", err
	}

	exePath := filepath.Dir(exec)
	return filepath.Join(exePath, "..", UploadDirName, relativePath), nil
}
