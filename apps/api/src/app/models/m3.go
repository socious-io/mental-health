package models

import (
	"time"

	"github.com/google/uuid"
)

type Study struct {
	ID                    uuid.UUID `db:"id" json:"id"`
	OrgUserID             uuid.UUID `db:"org_user_id" json:"-"`
	TitleEn               string    `db:"title_en" json:"title_en"`
	TitleJa               string    `db:"title_ja" json:"title_ja"`
	DescriptionEn         string    `db:"description_en" json:"description_en"`
	DescriptionJa         string    `db:"description_ja" json:"description_ja"`
	RewardLovelace        int64     `db:"reward_lovelace" json:"reward_lovelace"`
	TargetParticipants    int       `db:"target_participants" json:"target_participants"`
	RequiresTreatmentNeed bool      `db:"requires_treatment_need" json:"requires_treatment_need"`
	MinBand               string    `db:"min_band" json:"min_band"`
	Status                string    `db:"status" json:"status"`
	EscrowTx              *string   `db:"escrow_tx" json:"escrow_tx,omitempty"`
	EscrowUtxo            *string   `db:"escrow_utxo" json:"escrow_utxo,omitempty"`
	CreatedAt             time.Time `db:"created_at" json:"created_at"`
}

type Participation struct {
	ID            uuid.UUID `db:"id" json:"id"`
	StudyID       uuid.UUID `db:"study_id" json:"study_id"`
	UserID        uuid.UUID `db:"user_id" json:"-"`
	Status        string    `db:"status" json:"status"`
	BindTx        *string   `db:"bind_tx" json:"bind_tx,omitempty"`
	EscrowTx      *string   `db:"escrow_tx" json:"escrow_tx,omitempty"`
	EscrowUtxo    *string   `db:"escrow_utxo" json:"escrow_utxo,omitempty"`
	ReleaseTx     *string   `db:"release_tx" json:"release_tx,omitempty"`
	RewardAddress *string   `db:"reward_address" json:"reward_address,omitempty"`
	Progress      int       `db:"progress" json:"progress"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	Handle        *string   `db:"handle" json:"handle,omitempty"`
}

type TreatmentCredential struct {
	ID               uuid.UUID `db:"id" json:"id"`
	UserID           uuid.UUID `db:"user_id" json:"-"`
	ProviderUserID   uuid.UUID `db:"provider_user_id" json:"-"`
	Level            string    `db:"level" json:"level"`
	Basis            string    `db:"basis" json:"basis"`
	ValidMonths      int       `db:"valid_months" json:"valid_months"`
	ShinCredentialID *string   `db:"shin_credential_id" json:"shin_credential_id,omitempty"`
	Status           string    `db:"status" json:"status"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
}

func CreateStudy(s *Study) error {
	return DB.Get(s, `
		INSERT INTO studies (org_user_id, title_en, title_ja, description_en, description_ja,
			reward_lovelace, target_participants, requires_treatment_need, min_band)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
		s.OrgUserID, s.TitleEn, s.TitleJa, s.DescriptionEn, s.DescriptionJa,
		s.RewardLovelace, s.TargetParticipants, s.RequiresTreatmentNeed, s.MinBand)
}

func GetStudy(id uuid.UUID) (*Study, error) {
	s := new(Study)
	err := DB.Get(s, `SELECT * FROM studies WHERE id=$1`, id)
	return s, err
}

func RecruitingStudies() ([]Study, error) {
	var out []Study
	err := DB.Select(&out, `SELECT * FROM studies WHERE status IN ('RECRUITING','FUNDING') ORDER BY created_at DESC`)
	return out, err
}

func OrgStudies(orgID uuid.UUID) ([]Study, error) {
	var out []Study
	err := DB.Select(&out, `SELECT * FROM studies WHERE org_user_id=$1 ORDER BY created_at DESC`, orgID)
	return out, err
}

func SetStudyEscrow(id uuid.UUID, tx, utxo, status string) error {
	_, err := DB.Exec(`UPDATE studies SET escrow_tx=$2, escrow_utxo=$3, status=$4 WHERE id=$1`, id, tx, utxo, status)
	return err
}

func CreateParticipation(studyID, userID uuid.UUID, rewardAddr string) (*Participation, error) {
	p := new(Participation)
	err := DB.Get(p, `
		INSERT INTO participations (study_id, user_id, reward_address)
		VALUES ($1,$2,$3) RETURNING *`, studyID, userID, rewardAddr)
	return p, err
}

func StudyParticipations(studyID uuid.UUID) ([]Participation, error) {
	var out []Participation
	err := DB.Select(&out, `
		SELECT p.*, u.handle FROM participations p JOIN users u ON u.id=p.user_id
		WHERE p.study_id=$1 ORDER BY p.created_at`, studyID)
	return out, err
}

func UserParticipations(userID uuid.UUID) ([]Participation, error) {
	var out []Participation
	err := DB.Select(&out, `SELECT p.*, NULL as handle FROM participations p WHERE p.user_id=$1 ORDER BY p.created_at DESC`, userID)
	return out, err
}

func GetParticipation(id uuid.UUID) (*Participation, error) {
	p := new(Participation)
	err := DB.Get(p, `SELECT p.*, u.handle FROM participations p JOIN users u ON u.id=p.user_id WHERE p.id=$1`, id)
	return p, err
}

func UpdateParticipation(id uuid.UUID, status string, progress int, bindTx, releaseTx *string) error {
	_, err := DB.Exec(`
		UPDATE participations SET status=$2, progress=$3,
			bind_tx=COALESCE($4, bind_tx), release_tx=COALESCE($5, release_tx)
		WHERE id=$1`, id, status, progress, bindTx, releaseTx)
	return err
}

func CreateTreatmentCredential(t *TreatmentCredential) error {
	return DB.Get(t, `
		INSERT INTO treatment_credentials (user_id, provider_user_id, level, basis, valid_months, shin_credential_id, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
		t.UserID, t.ProviderUserID, t.Level, t.Basis, t.ValidMonths, t.ShinCredentialID, t.Status)
}

func UserTreatmentCredential(userID uuid.UUID) (*TreatmentCredential, error) {
	t := new(TreatmentCredential)
	err := DB.Get(t, `SELECT * FROM treatment_credentials WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, userID)
	return t, err
}

func ProviderBookings(providerUserID uuid.UUID) ([]struct {
	Booking
	Handle string `db:"handle" json:"handle"`
}, error) {
	var out []struct {
		Booking
		Handle string `db:"handle" json:"handle"`
	}
	err := DB.Select(&out, `
		SELECT b.*, u.handle FROM bookings b
		JOIN users u ON u.id=b.user_id
		JOIN providers pr ON pr.id=b.provider_id
		WHERE pr.slug = (SELECT handle FROM users WHERE id=$1)
		ORDER BY b.created_at DESC`, providerUserID)
	return out, err
}

func SetParticipationEscrow(id uuid.UUID, escrowTx, escrowUtxo, bindTx string) error {
	_, err := DB.Exec(`UPDATE participations SET escrow_tx=$2, escrow_utxo=$3, bind_tx=$4 WHERE id=$1`, id, escrowTx, escrowUtxo, bindTx)
	return err
}

func DeleteParticipation(id uuid.UUID) error {
	_, err := DB.Exec(`DELETE FROM participations WHERE id=$1`, id)
	return err
}
