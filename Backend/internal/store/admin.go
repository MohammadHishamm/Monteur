package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/OmarHosny18/APP-frontend/internal/entity"
	"github.com/google/uuid"
)

type AdminStore struct {
	db *sql.DB
}

func newAdminStore(db *sql.DB) *AdminStore {
	return &AdminStore{db: db}
}

// Create creates a new admin
func (as *AdminStore) Create(ctx context.Context, a *entity.Admin) (bool, error) {
	query := `
		INSERT INTO admins
			(id, email, password_hash, full_name, phone, is_active, created_at, updated_at)
		VALUES
			($1, $2, $3, $4, $5, $6, $7, $8)
	`
	re, err := as.db.ExecContext(ctx, query, a.ID, a.Email, a.PasswordHash, a.FullName, a.Phone, a.IsActive, a.CreatedAt, a.UpdatedAt)
	if err != nil {
		return false, err
	}

	ra, _ := re.RowsAffected()
	return ra > 0, nil
}

// FindByEmail finds an admin by email
func (as *AdminStore) FindByEmail(ctx context.Context, email string) (*entity.Admin, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, is_active, last_login_at, created_at, updated_at
		FROM admins WHERE email = $1
	`
	var a entity.Admin
	row := as.db.QueryRowContext(ctx, query, email)
	err := row.Scan(&a.ID, &a.Email, &a.PasswordHash, &a.FullName, &a.Phone, &a.IsActive, &a.LastLoginAt, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &a, nil
}

// FindByID finds an admin by ID
func (as *AdminStore) FindByID(ctx context.Context, id uuid.UUID) (*entity.Admin, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, is_active, last_login_at, created_at, updated_at
		FROM admins WHERE id = $1
	`
	var a entity.Admin
	row := as.db.QueryRowContext(ctx, query, id)
	err := row.Scan(&a.ID, &a.Email, &a.PasswordHash, &a.FullName, &a.Phone, &a.IsActive, &a.LastLoginAt, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &a, nil
}

// CheckByEmail checks if admin exists by email
func (as *AdminStore) CheckByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM admins WHERE email = $1)`
	var exists bool
	err := as.db.QueryRowContext(ctx, query, email).Scan(&exists)
	return exists, err
}

// ListAll lists all admins
func (as *AdminStore) ListAll(ctx context.Context, limit, offset int) ([]*entity.Admin, error) {
	query := `
		SELECT id, email, password_hash, full_name, phone, is_active, last_login_at, created_at, updated_at
		FROM admins ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`
	rows, err := as.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var admins []*entity.Admin
	for rows.Next() {
		var a entity.Admin
		err := rows.Scan(&a.ID, &a.Email, &a.PasswordHash, &a.FullName, &a.Phone, &a.IsActive, &a.LastLoginAt, &a.CreatedAt, &a.UpdatedAt)
		if err != nil {
			return nil, err
		}
		admins = append(admins, &a)
	}
	return admins, rows.Err()
}

// Update updates an admin
func (as *AdminStore) Update(ctx context.Context, a *entity.Admin) error {
	query := `
		UPDATE admins
		SET email = $1, password_hash = $2, full_name = $3, phone = $4, is_active = $5, last_login_at = $6, updated_at = $7
		WHERE id = $8
	`
	_, err := as.db.ExecContext(ctx, query, a.Email, a.PasswordHash, a.FullName, a.Phone, a.IsActive, a.LastLoginAt, a.UpdatedAt, a.ID)
	return err
}

// Delete deletes an admin
func (as *AdminStore) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM admins WHERE id = $1`
	_, err := as.db.ExecContext(ctx, query, id)
	return err
}
