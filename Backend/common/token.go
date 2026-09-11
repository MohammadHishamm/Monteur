package common

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ===========================
// CONFIGURATION
// ===========================
var (
	jwtSecret       = []byte("")
	accessTokenTTL  = 15 * time.Minute   // short-lived
	refreshTokenTTL = 7 * 24 * time.Hour // long-lived
)

func SetJWTSecret(secret string) {
	jwtSecret = []byte(secret)
}

// ===========================
// CLAIMS STRUCT
// ===========================
type Claims struct {
	UserID   string   `json:"user_id"`
	Provider string   `json:"provider"` // "email", "google", "discord"
	Roles    []string `json:"roles"`
	jwt.RegisteredClaims
}

// ===========================
// ACCESS TOKEN
// ===========================

// GenerateAccessToken generates a JWT access token
func GenerateAccessToken(userID, provider string, roles []string) (string, error) {
	claims := &Claims{
		UserID:   userID,
		Provider: provider,
		Roles:    roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// VerifyAccessToken parses and validates a JWT access token
func VerifyAccessToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	}, jwt.WithLeeway(5*time.Second)) // allow 5s clock skew
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}



// ===========================
// REFRESH TOKEN
// ===========================

// GenerateRefreshToken creates a secure random token (256-bit)
func GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashToken returns a SHA-256 hash of the token string
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// IsRefreshTokenValid checks if a refresh token is still valid based on expiration
func IsRefreshTokenValid(expiration time.Time) bool {
	return time.Now().Before(expiration)
}


// GenerateAdminToken creates an 8-hour JWT for admin dashboard sessions.
// Admins authenticate against the admins table, not the users table.
func GenerateAdminToken(adminID string) (string, error) {
	claims := &Claims{
		UserID:   adminID,
		Provider: "admin",
		Roles:    []string{"Admin"},
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func GeneratePasswordResetToken(userID string) (string, error) {
    claims := &Claims{
        UserID:   userID,
        Provider: "email",
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}


// ===========================
// CONTEXT HELPERS
// ===========================

type tokenCtxKey string

const ContextClaimsKey tokenCtxKey = "claims"

// Attach claims to context
func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, ContextClaimsKey, claims)
}

// Retrieve claims from context
func GetClaimsFromContext(ctx context.Context) (*Claims, error) {
	claims, ok := ctx.Value(ContextClaimsKey).(*Claims)
	if !ok || claims == nil {
		return nil, errors.New("claims not found in context")
	}
	return claims, nil
}
