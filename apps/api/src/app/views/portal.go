package views

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/config"
	"github.com/socious-io/mental-health/api/src/shin"
)

func roleRequired(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		if user.Role != role {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": role + " account required"})
			return
		}
		c.Next()
	}
}

// Provider portal: pseudonymous patient list + TreatmentNeed credential issuance.
func portalGroup(r *gin.Engine) {
	p := r.Group("/portal/provider")
	p.Use(app.LoginRequired(), roleRequired("provider"))

	p.GET("/patients", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		rows, err := models.ProviderBookings(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusOK, rows)
	})

	type issueForm struct {
		UserHandle  string `json:"user_handle" binding:"required"`
		Level       string `json:"level" binding:"required"`
		Basis       string `json:"basis" binding:"required"`
		ValidMonths int    `json:"valid_months"`
	}
	p.POST("/credentials", func(c *gin.Context) {
		provider := c.MustGet("user").(*models.User)
		var form issueForm
		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if form.ValidMonths == 0 {
			form.ValidMonths = 6
		}
		patient, err := models.GetUserByLogin(form.UserHandle)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "unknown handle"})
			return
		}
		t := &models.TreatmentCredential{
			UserID: patient.ID, ProviderUserID: provider.ID,
			Level: form.Level, Basis: form.Basis, ValidMonths: form.ValidMonths,
			Status: "CREATED",
		}
		var claimURL string
		if config.C.Demo.Enabled || config.C.Schemas.TreatmentNeed == "" {
			s := "DEMO"
			t.ShinCredentialID = &s
			t.Status = "DEMO"
		} else {
			cred, err := shin.IssueCredential(
				"Treatment Need Certificate",
				"Professional attestation that the holder needs mental-health support. No identity data, no session notes.",
				config.C.Schemas.TreatmentNeed,
				patient.Email, patient.Handle,
				[]map[string]any{
					{"name": "level", "value": form.Level},
					{"name": "basis", "value": form.Basis},
					{"name": "valid_months", "value": form.ValidMonths},
					{"name": "issuer_org", "value": "Moya provider network"},
				},
			)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("shin: %v", err)})
				return
			}
			t.ShinCredentialID = &cred.ID
			t.Status = cred.Status
			claimURL = shin.CredentialConnectURL(cred.ID)
		}
		if err := models.CreateTreatmentCredential(t); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"credential": t, "claim_url": claimURL})
	})
}

// Org console: studies, escrow funding, participants, completion + release.
func orgGroup(r *gin.Engine) {
	g := r.Group("/portal/org")
	g.Use(app.LoginRequired(), roleRequired("org"))

	g.GET("/escrow", func(c *gin.Context) {
		if !config.C.Payment.Enabled {
			c.JSON(http.StatusOK, gin.H{"enabled": false})
			return
		}
		var info struct {
			Address  string `json:"address"`
			Lovelace string `json:"lovelace"`
		}
		if err := app.ChainRunner("/wallets/org", gin.H{}, &info); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"enabled":  true,
			"address":  info.Address,
			"lovelace": info.Lovelace,
		})
	})

	g.GET("/studies", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		list, err := models.OrgStudies(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusOK, list)
	})

	type studyForm struct {
		TitleEn               string `json:"title_en" binding:"required"`
		TitleJa               string `json:"title_ja" binding:"required"`
		DescriptionEn         string `json:"description_en"`
		DescriptionJa         string `json:"description_ja"`
		RewardAda             int64  `json:"reward_ada" binding:"required"`
		TargetParticipants    int    `json:"target_participants" binding:"required"`
		RequiresTreatmentNeed bool   `json:"requires_treatment_need"`
		MinBand               string `json:"min_band"`
	}
	g.POST("/studies", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		var form studyForm
		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if form.MinBand == "" {
			form.MinBand = "minimal"
		}
		s := &models.Study{
			OrgUserID: user.ID,
			TitleEn:   form.TitleEn, TitleJa: form.TitleJa,
			DescriptionEn: form.DescriptionEn, DescriptionJa: form.DescriptionJa,
			RewardLovelace:     form.RewardAda * 1_000_000,
			TargetParticipants: form.TargetParticipants,
			RequiresTreatmentNeed: form.RequiresTreatmentNeed,
			MinBand:            form.MinBand,
		}
		if err := models.CreateStudy(s); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusCreated, s)
	})

	g.POST("/studies/:id/fund", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad id"})
			return
		}
		s, err := models.GetStudy(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		// Escrow is locked per participation at apply time (the validator binds
		// one recipient per box) — publishing just opens recruitment.
		_ = s
		models.SetStudyEscrow(id, "", "", "RECRUITING")
		c.JSON(http.StatusOK, gin.H{"status": "RECRUITING"})
	})

	g.GET("/studies/:id/participants", func(c *gin.Context) {
		id, _ := uuid.Parse(c.Param("id"))
		rows, err := models.StudyParticipations(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusOK, rows)
	})

	g.POST("/participations/:id/complete", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad id"})
			return
		}
		p, err := models.GetParticipation(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		s, _ := models.GetStudy(p.StudyID)
		if !config.C.Payment.Enabled || p.EscrowUtxo == nil {
			models.UpdateParticipation(id, "REWARDED", 100, nil, nil)
			c.JSON(http.StatusOK, gin.H{"status": "REWARDED", "note": "no on-chain escrow for this participation"})
			return
		}
		var out struct {
			TxHash string `json:"tx_hash"`
		}
		if err := app.ChainRunner("/escrow/release", gin.H{
			"study_id":       s.ID.String(),
			"escrow_utxo":    *p.EscrowUtxo,
			"reward_address": p.RewardAddress,
			"lovelace":       s.RewardLovelace,
		}, &out); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		tx := out.TxHash
		models.UpdateParticipation(id, "REWARDED", 100, nil, &tx)
		c.JSON(http.StatusOK, gin.H{"status": "REWARDED", "release_tx": tx})
	})
}
