package common

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"

	"crypto/hmac"
	"encoding/hex"

	"golang.org/x/crypto/bcrypt"
)

func GenerateHMAC(key, data []byte) string {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

func CompareHMAC(hmac1, hmac2 string) bool {
	h1, err1 := hex.DecodeString(hmac1)
	h2, err2 := hex.DecodeString(hmac2)

	if err1 != nil || err2 != nil {
		return false
	}

	return hmac.Equal(h1, h2)
}

func GenerateRandomN(n int) ([]byte, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}

	return buf, nil
}

func GenerateRandomString(n int) (string, error) {
	buf, err := GenerateRandomN(n)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(buf), nil
}

// HashPassword hashes a plaintext password using bcrypt.
// Use bcrypt.DefaultCost for production; can be increased if needed. < 11 or 12 if server using high cpu memory
func HashPassword(password string) (string, error) {
	if password == "" {
		return "", errors.New("password cannot be empty")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashed), nil
}

// VerifyPassword compares a plaintext password with a hashed password.
// Returns true if they match, false otherwise.
func VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// EncryptAES encrypts plaintext using AES-256-GCM with the provided key.
// The key should be 32 bytes (256 bits). If a shorter key is provided, it will be hashed to 32 bytes.
// Returns base64-encoded encrypted data with nonce prepended.
func EncryptAES(plaintext string, key string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	// Hash the key to ensure it's exactly 32 bytes
	keyHash := sha256.Sum256([]byte(key))
	keyBytes := keyHash[:]

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Create a nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt the plaintext
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptAES decrypts base64-encoded ciphertext using AES-256-GCM with the provided key.
// The key should be 32 bytes (256 bits). If a shorter key is provided, it will be hashed to 32 bytes.
func DecryptAES(ciphertext string, key string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	// Hash the key to ensure it's exactly 32 bytes
	keyHash := sha256.Sum256([]byte(key))
	keyBytes := keyHash[:]

	// Decode from base64
	ciphertextBytes, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	// Extract nonce (first gcm.NonceSize() bytes)
	nonceSize := gcm.NonceSize()
	if len(ciphertextBytes) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertextBytes := ciphertextBytes[:nonceSize], ciphertextBytes[nonceSize:]

	// Decrypt the ciphertext
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}
