package repository

import (
	"errors"
	"net/url"
	"strconv"
	"strings"

	"github.com/OmarHosny18/APP-frontend/admin/schema"
	"github.com/google/uuid"
)

// Key identifies one row: the string form of each primary-key value in the
// table's PK column order. Most tables have a single UUID PK; composite keys
// (saved_freelancers) are supported by encoding each part separately.
type Key []string

const keySeparator = ","

// Encode renders the key as a URL path segment.
func (k Key) Encode() string {
	parts := make([]string, len(k))
	for i, v := range k {
		// PathEscape leaves "," alone, so escape it explicitly: it is our separator.
		parts[i] = strings.ReplaceAll(url.PathEscape(v), keySeparator, "%2C")
	}
	return strings.Join(parts, keySeparator)
}

// String returns a human-readable form, e.g. for log messages.
func (k Key) String() string { return strings.Join(k, keySeparator) }

// ErrBadKey is returned for a path segment that cannot be a key of the
// table — wrong arity or a part that is not valid for its column type.
// Callers turn it into a 404, the same way Django treats a malformed pk.
var ErrBadKey = errors.New("repository: malformed row key")

// DecodeKey parses a path segment produced by Encode for the given table,
// checking arity and that each part parses as its primary-key column type
// so garbage never reaches the database as a query parameter.
func DecodeKey(t *schema.Table, segment string) (Key, error) {
	raw := strings.Split(segment, keySeparator)
	if len(raw) != len(t.PrimaryKey) {
		return nil, ErrBadKey
	}
	k := make(Key, len(raw))
	for i, p := range raw {
		v, err := url.PathUnescape(p)
		if err != nil {
			v = p
		}
		if c := t.Column(t.PrimaryKey[i]); c != nil && !validKeyPart(c.Kind, v) {
			return nil, ErrBadKey
		}
		k[i] = v
	}
	return k, nil
}

func validKeyPart(kind schema.Kind, v string) bool {
	switch kind {
	case schema.KindUUID:
		_, err := uuid.Parse(v)
		return err == nil
	case schema.KindInt:
		_, err := strconv.ParseInt(v, 10, 64)
		return err == nil
	default:
		return v != ""
	}
}

// KeyOf extracts the key of a row using the table's PK columns.
func KeyOf(t *schema.Table, row Row) Key {
	k := make(Key, len(t.PrimaryKey))
	for i, pk := range t.PrimaryKey {
		k[i] = Stringify(row[pk])
	}
	return k
}
