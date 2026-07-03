package models

import (
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Provider struct {
	ID               uuid.UUID      `db:"id" json:"id"`
	Slug             string         `db:"slug" json:"slug"`
	NameEn           string         `db:"name_en" json:"name_en"`
	NameJa           string         `db:"name_ja" json:"name_ja"`
	Modality         string         `db:"modality" json:"modality"`
	Languages        pq.StringArray `db:"languages" json:"languages"`
	CostBand         string         `db:"cost_band" json:"cost_band"`
	Bands            pq.StringArray `db:"bands" json:"bands"`
	DescriptionEn    string         `db:"description_en" json:"description_en"`
	DescriptionJa    string         `db:"description_ja" json:"description_ja"`
	AnonymousBooking bool           `db:"anonymous_booking" json:"anonymous_booking"`
	CreatedAt        interface{}    `db:"created_at" json:"-"`
}

func AllProviders() ([]Provider, error) {
	var out []Provider
	err := DB.Select(&out, `SELECT * FROM providers ORDER BY slug`)
	return out, err
}
