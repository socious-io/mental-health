package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Booking struct {
	ID          uuid.UUID       `db:"id" json:"id"`
	UserID      uuid.UUID       `db:"user_id" json:"-"`
	ProviderID  uuid.UUID       `db:"provider_id" json:"provider_id"`
	Band        string          `db:"band" json:"band"`
	Preferences json.RawMessage `db:"preferences" json:"preferences"`
	Status      string          `db:"status" json:"status"`
	CreatedAt   time.Time       `db:"created_at" json:"created_at"`
}

func CreateBooking(userID, providerID uuid.UUID, band string, prefs json.RawMessage) (*Booking, error) {
	b := new(Booking)
	err := DB.Get(b, `
		INSERT INTO bookings (user_id, provider_id, band, preferences)
		VALUES ($1, $2, $3, $4) RETURNING *`, userID, providerID, band, prefs)
	return b, err
}

func UserBookings(userID uuid.UUID) ([]Booking, error) {
	var out []Booking
	err := DB.Select(&out, `SELECT * FROM bookings WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	return out, err
}
