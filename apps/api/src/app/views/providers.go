package views

import (
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
)

type match struct {
	Provider models.Provider `json:"provider"`
	Score    int             `json:"score"`
	Reasons  []string        `json:"reasons"`
}

// Transparent matching: severity band + risk factors + user preferences.
func matchProviders(all []models.Provider, band, lang, modality, cost string, crisis bool) []match {
	var out []match
	for _, p := range all {
		serves := false
		for _, b := range p.Bands {
			if b == band {
				serves = true
				break
			}
		}
		if !serves {
			continue
		}
		m := match{Provider: p, Score: 1, Reasons: []string{"serves your severity band"}}
		for _, l := range p.Languages {
			if l == lang {
				m.Score += 2
				m.Reasons = append(m.Reasons, "speaks your language")
				break
			}
		}
		if modality != "" && (p.Modality == modality || p.Modality == "either") {
			m.Score += 2
			m.Reasons = append(m.Reasons, "matches your format preference")
		}
		if cost != "" && p.CostBand == cost {
			m.Score += 1
			m.Reasons = append(m.Reasons, "matches your budget")
		}
		if crisis && p.Modality != "in_person" {
			m.Score += 1
			m.Reasons = append(m.Reasons, "fast online availability (risk factor)")
		}
		out = append(out, m)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	return out
}

func providersGroup(r *gin.Engine) {
	g := r.Group("/providers")
	g.Use(app.LoginRequired())

	g.GET("/matches", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		s, err := models.LatestScreening(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "complete a screening first"})
			return
		}
		all, err := models.AllProviders()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		lang := c.DefaultQuery("lang", user.Locale)
		matches := matchProviders(all, s.Band, lang, c.Query("modality"), c.Query("cost"), s.Item9Flag)
		c.JSON(http.StatusOK, gin.H{"band": s.Band, "matches": matches})
	})
}
