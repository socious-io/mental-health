package views

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/config"
)

var bandRank = map[string]int{"minimal": 0, "mild": 1, "moderate": 2, "moderately_severe": 3, "severe": 4}

// User-facing research & opportunity endpoints.
func studiesGroup(r *gin.Engine) {
	g := r.Group("/studies")
	g.Use(app.LoginRequired())

	g.GET("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		list, err := models.RecruitingStudies()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		var screeningBand string
		if s, err := models.LatestScreening(user.ID); err == nil {
			screeningBand = s.Band
		}
		hasTN := false
		if _, err := models.UserTreatmentCredential(user.ID); err == nil {
			hasTN = true
		}
		type item struct {
			models.Study
			Eligible bool   `json:"eligible"`
			Missing  string `json:"missing,omitempty"`
		}
		out := make([]item, 0, len(list))
		for _, s := range list {
			it := item{Study: s, Eligible: true}
			if !user.IdentityVerified {
				it.Eligible, it.Missing = false, "verification"
			} else if screeningBand == "" || bandRank[screeningBand] < bandRank[s.MinBand] {
				it.Eligible, it.Missing = false, "screening"
			} else if s.RequiresTreatmentNeed && !hasTN {
				it.Eligible, it.Missing = false, "treatment_need"
			}
			out = append(out, it)
		}
		c.JSON(http.StatusOK, out)
	})

	g.POST("/:id/apply", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad id"})
			return
		}
		s, err := models.GetStudy(id)
		if err != nil || s.Status != "RECRUITING" {
			c.JSON(http.StatusNotFound, gin.H{"error": "study not recruiting"})
			return
		}
		if !user.IdentityVerified {
			c.JSON(http.StatusForbidden, gin.H{"error": "verify your account first"})
			return
		}
		scr, err := models.LatestScreening(user.ID)
		if err != nil || bandRank[scr.Band] < bandRank[s.MinBand] {
			c.JSON(http.StatusForbidden, gin.H{"error": "screening credential required"})
			return
		}
		if s.RequiresTreatmentNeed {
			if _, err := models.UserTreatmentCredential(user.ID); err != nil {
				c.JSON(http.StatusForbidden, gin.H{"error": "treatment-need credential required"})
				return
			}
		}
		rewardAddr := ""
		if config.C.Payment.Enabled {
			var w struct {
				Address string `json:"address"`
			}
			if err := app.ChainRunner("/wallets/new", gin.H{"user_id": user.ID.String()}, &w); err == nil {
				rewardAddr = w.Address
			}
		}
		p, err := models.CreateParticipation(id, user.ID, rewardAddr)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "already applied"})
			return
		}
		if config.C.Payment.Enabled {
			// Lock this participant's reward at the escrow validator, then bind
			// them as recipient (RecipientDeposit) — one escrow box per participation.
			var init struct {
				TxHash  string `json:"tx_hash"`
				Utxo    string `json:"utxo"`
				OrgAddr string `json:"org_addr"`
			}
			if err := app.ChainRunner("/escrow/initiate", gin.H{"lovelace": s.RewardLovelace}, &init); err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": "escrow initiate: " + err.Error()})
				return
			}
			var bound struct {
				TxHash string `json:"tx_hash"`
				Utxo   string `json:"utxo"`
			}
			if err := app.ChainRunner("/escrow/bind", gin.H{
				"escrow_utxo":        init.Utxo,
				"participant_wallet": "users/" + user.ID.String(),
				"org_addr":           init.OrgAddr,
				"lovelace":           s.RewardLovelace,
			}, &bound); err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": "escrow bind: " + err.Error()})
				return
			}
			models.SetParticipationEscrow(p.ID, init.TxHash, bound.Utxo, bound.TxHash)
		}
		models.UpdateParticipation(p.ID, "ACTIVE", 0, nil, nil)
		p2, _ := models.GetParticipation(p.ID)
		c.JSON(http.StatusCreated, p2)
	})

	g.GET("/mine", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		list, err := models.UserParticipations(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusOK, list)
	})

	g.POST("/participations/:id/checkin", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad id"})
			return
		}
		p, err := models.GetParticipation(id)
		if err != nil || p.UserID != user.ID {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		progress := p.Progress + 10
		status := p.Status
		if progress >= 100 {
			progress = 100
			status = "COMPLETED"
		}
		models.UpdateParticipation(id, status, progress, nil, nil)
		c.JSON(http.StatusOK, gin.H{"progress": progress, "status": status})
	})
}
