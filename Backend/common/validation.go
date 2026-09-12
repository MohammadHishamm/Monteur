package common

import (
	"net"
	"net/url"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

var (
	Validator *validator.Validate = nil
)

func InitValidator() {
	if Validator == nil {
		Validator = validator.New(validator.WithRequiredStructEnabled())
		Validator.RegisterTagNameFunc(jsonTagFunc)
	}
}

func IsDefaultUserName(username string) bool {
	return username == DefaultUserName
}

// IsValidLocalhost validates a host string and returns whether it is localhost or loopback IP.
// If the host is a proxy, it extracts the host and checks if its valid localhost.
func IsValidLocalhost(host string) bool {
	if ip := net.ParseIP(host); ip != nil {
		return ip.IsLoopback()
	}

	if IsValidProxy(host) {
		host, _ := GetHostPort(host)
		return IsValidLocalhost(host)
	}

	return strings.EqualFold(host, "localhost")
}

// IsValidProxy validates a proxy string and returns whether it is a valid HTTP or HTTPS URL.
// Fallback to checking if the proxy string is a valid Host with Port.
func IsValidProxy(px string) bool {
	u, err := url.Parse(px)
	if err == nil && (u.Scheme == "http" || u.Scheme == "https") {
		return true
	}

	_, _, err = net.SplitHostPort(px)
	if err != nil {
		return false
	}

	return true
}

// IsValidIP validates an IP address string and returns whether it is a valid IPv4 address.
// Fails if the IP address is loopback IP.
func IsValidIP(ip string) bool {
	p := net.ParseIP(ip)
	return p != nil && !p.IsLoopback()
}

func jsonTagFunc(fld reflect.StructField) string {
	name := GetFieldJsonName(fld)
	if name == "-" {
		return ""
	}
	return name
}
