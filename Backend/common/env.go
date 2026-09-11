package common

import (
	"os"
	"strconv"
	"strings"
)

func GetEnvString(key, fallback string) string {
	val, ok := os.LookupEnv(key)
	if ok {
		return val
	}

	return fallback
}

func GetEnvInt64(key string, fallback int64) int64 {
	val, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	i, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return fallback
	}

	return i
}

func GetEnvInt(key string, fallback int) int {
	val, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	i, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return fallback
	}

	return int(i)
}

func GetEnvBool(key string, fallback bool) bool {
	val, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	i, err := strconv.ParseBool(val)
	if err != nil {
		return fallback
	}

	return i
}

func GetEnvStrings(key string, fallback []string) []string {
	val, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	return strings.FieldsFunc(val, func(r rune) bool {
		if r == ',' {
			return true
		}

		return false
	})
}
