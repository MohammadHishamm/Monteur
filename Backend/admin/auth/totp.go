package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// TOTP parameters — the defaults every authenticator app assumes (Google
// Authenticator, Authy, 1Password …): SHA-1, 6 digits, 30-second steps.
const (
	totpDigits = 6
	totpPeriod = 30 * time.Second
	// totpSkew is how many steps either side of "now" are accepted, to
	// tolerate clock drift between the phone and the server.
	totpSkew = 1
)

var b32 = base32.StdEncoding.WithPadding(base32.NoPadding)

// NewTOTPSecret returns a fresh 160-bit secret, base32-encoded the way
// authenticator apps expect to receive it.
func NewTOTPSecret() (string, error) {
	buf := make([]byte, 20)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("auth: totp secret: %w", err)
	}
	return b32.EncodeToString(buf), nil
}

// TOTPStep is the counter value for a point in time.
func TOTPStep(at time.Time) int64 { return at.Unix() / int64(totpPeriod.Seconds()) }

// TOTPCode computes the code for a secret at a given step (RFC 6238 on top
// of RFC 4226's HOTP).
func TOTPCode(secret string, step int64) (string, error) {
	key, err := b32.DecodeString(strings.ToUpper(strings.TrimSpace(secret)))
	if err != nil {
		return "", fmt.Errorf("auth: totp secret is not base32: %w", err)
	}
	var msg [8]byte
	binary.BigEndian.PutUint64(msg[:], uint64(step))

	mac := hmac.New(sha1.New, key)
	mac.Write(msg[:])
	sum := mac.Sum(nil)

	offset := sum[len(sum)-1] & 0x0f
	code := binary.BigEndian.Uint32(sum[offset:offset+4]) & 0x7fffffff
	mod := uint32(1)
	for i := 0; i < totpDigits; i++ {
		mod *= 10
	}
	return fmt.Sprintf("%0*d", totpDigits, code%mod), nil
}

// VerifyTOTP checks a submitted code against the secret around now and
// returns the step it matched. lastUsedStep is the newest step already
// accepted for this admin; codes at or before it are rejected so a captured
// code cannot be replayed inside its window.
func VerifyTOTP(secret, code string, now time.Time, lastUsedStep int64) (int64, bool) {
	code = strings.ReplaceAll(strings.TrimSpace(code), " ", "")
	if len(code) != totpDigits {
		return 0, false
	}
	current := TOTPStep(now)
	for delta := int64(-totpSkew); delta <= totpSkew; delta++ {
		step := current + delta
		if step <= lastUsedStep {
			continue
		}
		want, err := TOTPCode(secret, step)
		if err != nil {
			return 0, false
		}
		if subtle.ConstantTimeCompare([]byte(want), []byte(code)) == 1 {
			return step, true
		}
	}
	return 0, false
}

// TOTPURI renders the otpauth:// URI that authenticator apps read from the
// enrollment QR code.
func TOTPURI(issuer, account, secret string) string {
	label := url.PathEscape(issuer + ":" + account)
	q := url.Values{
		"secret":    {secret},
		"issuer":    {issuer},
		"algorithm": {"SHA1"},
		"digits":    {fmt.Sprint(totpDigits)},
		"period":    {fmt.Sprint(int(totpPeriod.Seconds()))},
	}
	return "otpauth://totp/" + label + "?" + q.Encode()
}

// FormatSecret groups a secret in blocks of four for manual entry.
func FormatSecret(secret string) string {
	var sb strings.Builder
	for i, r := range secret {
		if i > 0 && i%4 == 0 {
			sb.WriteByte(' ')
		}
		sb.WriteRune(r)
	}
	return sb.String()
}
