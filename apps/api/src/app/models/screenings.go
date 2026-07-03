package models

import (
	"time"

	"github.com/google/uuid"
)

type Screening struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	UserID           uuid.UUID  `db:"user_id" json:"-"`
	Score            int        `db:"score" json:"score"`
	Band             string     `db:"band" json:"band"`
	Item9Flag        bool       `db:"item9_flag" json:"item9_flag"`
	CredentialID     *string    `db:"credential_id" json:"credential_id,omitempty"`
	CredentialStatus *string    `db:"credential_status" json:"credential_status,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
}

func CreateScreening(userID uuid.UUID, score int, band string, item9 bool) (*Screening, error) {
	s := new(Screening)
	err := DB.Get(s, `
		INSERT INTO screenings (user_id, score, band, item9_flag)
		VALUES ($1, $2, $3, $4) RETURNING *`, userID, score, band, item9)
	return s, err
}

func SetScreeningCredential(id uuid.UUID, credID, status string) error {
	_, err := DB.Exec(`UPDATE screenings SET credential_id=$2, credential_status=$3 WHERE id=$1`, id, credID, status)
	return err
}

func LatestScreening(userID uuid.UUID) (*Screening, error) {
	s := new(Screening)
	err := DB.Get(s, `SELECT * FROM screenings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, userID)
	return s, err
}
