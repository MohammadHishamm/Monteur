package common

import (
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/OmarHosny18/APP-frontend/internal/apperror"

	"github.com/google/uuid"
)

const (
	NORM_WORD  = 1 << 0
	NORM_SPACE = 1 << 1
	NORM_CASE  = 1 << 2
)

var (
	validCharsRegex   = regexp.MustCompile(`^[\p{L}\p{N}]+$`)
	invalidCharsRegex = regexp.MustCompile(`[^\p{L}\p{N}\s]+`)
	spaceRegex        = regexp.MustCompile(`\s+`)
)

func GenerateExcerpt(s string) string {
	if s == "" {
		return ""
	}

	rs := []rune(s)

	if len(rs) <= 255 {
		return s
	}

	return fmt.Sprintf("%s...", string(rs[:200]))
}

func GetCookieDomain(u *url.URL) string {
	isIP, isLocalhost := ValidateDomain(u.Hostname())
	if isIP || isLocalhost {
		return u.Hostname()
	}

	Logger.Debug("validated hostname",
		slog.String("host", u.Hostname()),
		slog.Bool("isIP", isIP),
		slog.Bool("isLocalhost", isLocalhost),
		slog.String("component", "common.string"),
		slog.String("method", "GetCookieDomain"))

	return fmt.Sprintf(".%s", u.Hostname())
}

func ValidateDomain(d string) (isIP bool, isLocalhost bool) {
	ip := net.ParseIP(d)
	if ip != nil && !ip.IsLoopback() {
		isIP = true
		isLocalhost = false
		return
	}

	host := d
	if h, _, err := net.SplitHostPort(d); err == nil {
		host = h
		return
	}

	if host == "localhost" {
		isLocalhost = true
	}

	return
}

func StrConv(v any) string {
	if v == nil {
		return ""
	}

	switch t := v.(type) {
	case string:
		return t
	case *string:
		if t == nil {
			return ""
		}
		return *t
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case int32:
		return strconv.FormatInt(int64(t), 10)
	case int16:
		return strconv.FormatInt(int64(t), 10)
	case int8:
		return strconv.FormatInt(int64(t), 10)
	case *int:
		if t == nil {
			return ""
		}
		return strconv.Itoa(*t)
	case *int64:
		if t == nil {
			return ""
		}
		return strconv.FormatInt(*t, 10)
	case float64:
		return strconv.FormatFloat(t, 'f', 2, 64)
	case float32:
		return strconv.FormatFloat(float64(t), 'f', 2, 32)
	case *float64:
		if t == nil {
			return ""
		}
		return strconv.FormatFloat(*t, 'f', 2, 64)
	case bool:
		return strconv.FormatBool(t)
	case *bool:
		if t == nil {
			return ""
		}
		return strconv.FormatBool(*t)
	case []byte:
		return string(t)
	case *[]byte:
		if t == nil {
			return ""
		}
		return string(*t)
	default:
		return fmt.Sprintf("%v", t)
	}
}

func GetFieldJsonName(field reflect.StructField) string {
	return strings.SplitN(field.Tag.Get("json"), ",", 2)[0]
}

func GetEmailName(email string) string {
	if email == "" {
		return ""
	}

	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		return ""
	}

	return parts[0]
}

func GetSessionName(names ...string) string {
	if len(names) == 0 {
		return ""
	}

	return strings.ToLower(fmt.Sprintf("_%s_", strings.Join(names, "_")))
}

func ParseSliceUUIDs(data []string) ([]uuid.UUID, error) {

	if len(data) == 0 {
		return []uuid.UUID{}, nil
	}

	uuids := make([]uuid.UUID, len(data))
	for i, str := range data {
		parsedUUID, err := uuid.Parse(str)
		if err != nil {
			return nil, apperror.ErrUUIDInvalid.WithDetailError(err).WithDetail(fmt.Sprintf("index:%d", i))
		}
		uuids[i] = parsedUUID
	}

	return uuids, nil
}

func GetUserFullName(fn, ln *string) string {
	if fn == nil && ln == nil {
		return ""
	}

	if fn == nil {
		return *ln
	}

	if ln == nil {
		return *fn
	}

	if *fn == "" {
		return *ln
	}

	if *ln == "" {
		return *fn
	}

	return fmt.Sprintf("%s %s", *fn, *ln)
}

func GetHostPort(s string) (host, port string) {
	u, err := url.Parse(s)
	if err == nil {
		return u.Hostname(), u.Port()
	}

	host, port, err = net.SplitHostPort(s)
	if err != nil {
		return "", ""
	}

	return
}

func BuildSlug(s string, flag int) string {
	s = NormalizeString(s, flag)
	return strings.ReplaceAll(s, " ", "-")
}

func NormalizeString(s string, flag int) string {
	if s == "" {
		return ""
	}

	if flag&NORM_CASE != 0 {
		s = strings.ToLower(s)
	}

	if flag&NORM_WORD != 0 {
		s = invalidCharsRegex.ReplaceAllString(s, "")
	}

	if flag&NORM_SPACE != 0 {
		s = spaceRegex.ReplaceAllString(s, " ")
	}

	s = strings.TrimSpace(s)

	return s
}
