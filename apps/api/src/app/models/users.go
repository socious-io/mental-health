package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	Handle           string     `db:"handle" json:"handle"`
	Email            string     `db:"email" json:"-"`
	PasswordHash     string     `db:"password_hash" json:"-"`
	IdentityVerified bool       `db:"identity_verified" json:"identity_verified"`
	VerifiedAt       *time.Time `db:"verified_at" json:"verified_at,omitempty"`
	Locale           string     `db:"locale" json:"locale"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
}

func CreateUser(handle, email, passwordHash, locale string) (*User, error) {
	u := new(User)
	err := DB.Get(u, `
		INSERT INTO users (handle, email, password_hash, locale)
		VALUES ($1, $2, $3, $4)
		RETURNING *`, handle, email, passwordHash, locale)
	return u, err
}

func GetUserByID(id uuid.UUID) (*User, error) {
	u := new(User)
	err := DB.Get(u, `SELECT * FROM users WHERE id=$1`, id)
	return u, err
}

func GetUserByLogin(login string) (*User, error) {
	u := new(User)
	err := DB.Get(u, `SELECT * FROM users WHERE handle=$1 OR email=$1`, login)
	return u, err
}
