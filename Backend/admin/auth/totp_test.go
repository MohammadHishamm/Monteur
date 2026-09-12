package auth

import (
	"strings"
	"testing"
	"time"
)

// rfc6238Secret is the RFC 6238 Appendix B test secret ("12345678901234567890").
const rfc6238Secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

func TestTOTPCodeMatchesRFC6238Vectors(t *testing.T) {
	// Appendix B lists 8-digit codes; the last six digits are the 6-digit code.
	cases := map[int64]string{
		59:          "287082", // 94287082
		1111111109:  "081804", // 07081804
		1111111111:  "050471", // 14050471
		1234567890:  "005924", // 89005924
		2000000000:  "279037", // 69279037
		20000000000: "353130", // 65353130
	}
	for at, want := range cases {
		got, err := TOTPCode(rfc6238Secret, TOTPStep(time.Unix(at, 0)))
		if err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Errorf("t=%d: got %s want %s", at, got, want)
		}
	}
}

func TestVerifyTOTPSkewAndReplay(t *testing.T) {
	now := time.Unix(1111111111, 0)
	step := TOTPStep(now)
	code, _ := TOTPCode(rfc6238Secret, step)

	if _, ok := VerifyTOTP(rfc6238Secret, code, now, 0); !ok {
		t.Fatal("current code rejected")
	}
	if _, ok := VerifyTOTP(rfc6238Secret, " "+code[:3]+" "+code[3:]+" ", now, 0); !ok {
		t.Fatal("spaces should be tolerated")
	}
	if _, ok := VerifyTOTP(rfc6238Secret, code, now.Add(totpPeriod), 0); !ok {
		t.Fatal("previous step should be accepted (skew)")
	}
	if _, ok := VerifyTOTP(rfc6238Secret, code, now.Add(2*totpPeriod), 0); ok {
		t.Fatal("two steps old must be rejected")
	}
	if _, ok := VerifyTOTP(rfc6238Secret, code, now, step); ok {
		t.Fatal("replayed code must be rejected")
	}
	if _, ok := VerifyTOTP(rfc6238Secret, "000000", now, 0); ok {
		t.Fatal("wrong code accepted")
	}
	if _, ok := VerifyTOTP(rfc6238Secret, "12345", now, 0); ok {
		t.Fatal("short code accepted")
	}
}

func TestNewTOTPSecretAndURI(t *testing.T) {
	s, err := NewTOTPSecret()
	if err != nil || len(s) != 32 || strings.ContainsAny(s, "=189") {
		t.Fatalf("secret %q %v", s, err)
	}
	uri := TOTPURI("Monteur admin", "a@b.c", s)
	if !strings.HasPrefix(uri, "otpauth://totp/Monteur%20admin:a@b.c?") || !strings.Contains(uri, "secret="+s) {
		t.Fatalf("uri %q", uri)
	}
	if FormatSecret("ABCDEFGH") != "ABCD EFGH" {
		t.Fatal("format")
	}
}
