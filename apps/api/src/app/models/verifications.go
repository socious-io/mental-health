package models

import (
	"time"

	"github.com/google/uuid"
)

type Verification struct {
	ID                 uuid.UUID `db:"id" json:"id"`
	UserID             uuid.UUID `db:"user_id" json:"-"`
	ShinVerificationID *string   `db:"shin_verification_id" json:"-"`
	ShinIndividualID   *string   `db:"shin_individual_id" json:"-"`
	Status             string    `db:"status" json:"status"`
	ConnectURL         *string   `db:"connect_url" json:"connect_url,omitempty"`
	CreatedAt          time.Time `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`
}

func UpsertVerification(userID uuid.UUID, shinID, individualID, connectURL string) (*Verification, error) {
	v := new(Verification)
	err := DB.Get(v, `
		INSERT INTO verifications (user_id, shin_verification_id, shin_individual_id, connect_url, status)
		VALUES ($1, $2, $3, $4, 'REQUESTED')
		RETURNING *`, userID, shinID, individualID, connectURL)
	return v, err
}

func UpsertVerificationWithID(id, userID uuid.UUID, shinID, individualID, connectURL string) (*Verification, error) {
	v := new(Verification)
	err := DB.Get(v, `
		INSERT INTO verifications (id, user_id, shin_verification_id, shin_individual_id, connect_url, status)
		VALUES ($1, $2, $3, $4, $5, 'REQUESTED')
		RETURNING *`, id, userID, shinID, individualID, connectURL)
	return v, err
}

func GetVerificationByID(id uuid.UUID) (*Verification, error) {
	v := new(Verification)
	err := DB.Get(v, `SELECT * FROM verifications WHERE id=$1`, id)
	return v, err
}

func LatestVerification(userID uuid.UUID) (*Verification, error) {
	v := new(Verification)
	err := DB.Get(v, `SELECT * FROM verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, userID)
	return v, err
}

func MarkUserVerified(userID uuid.UUID) error {
	now := time.Now()
	_, err := DB.Exec(`UPDATE users SET identity_verified=true, verified_at=$2 WHERE id=$1`, userID, now)
	if err != nil {
		return err
	}
	_, err = DB.Exec(`UPDATE verifications SET status='VERIFIED', updated_at=now() WHERE user_id=$1`, userID)
	return err
}
