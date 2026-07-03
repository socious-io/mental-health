package views

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/config"
	"github.com/socious-io/mental-health/api/src/shin"
)

type screeningForm struct {
	Answers []int `json:"answers" binding:"required"`
}

func screeningsGroup(r *gin.Engine) {
	g := r.Group("/screenings")
	g.Use(app.LoginRequired())

	g.POST("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		var form screeningForm
		if err := c.ShouldBindJSON(&form); err != nil || len(form.Answers) != 9 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "exactly 9 answers (0-3) required"})
			return
		}
		score, band, item9 := app.ScorePHQ9(form.Answers)
		// Raw answers are intentionally NOT persisted — only score + band (privacy ledger promise).
		s, err := models.CreateScreening(user.ID, score, band, item9)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		var claimURL string
		if config.C.Demo.Enabled || config.C.Schemas.ScreeningResult == "" {
			models.SetScreeningCredential(s.ID, "demo", "DEMO")
		} else {
			cred, err := shin.IssueCredential(
				"Screening Result",
				"Moya mental-health screening severity band (PHQ-9 aligned). Contains no raw answers.",
				config.C.Schemas.ScreeningResult,
				user.Email, user.Handle,
				[]map[string]any{
					{"name": "band", "value": band},
					{"name": "score", "value": score},
					{"name": "handle", "value": user.Handle},
				},
			)
			if err == nil {
				models.SetScreeningCredential(s.ID, cred.ID, cred.Status)
				claimURL = shin.CredentialConnectURL(cred.ID)
			} else {
				models.SetScreeningCredential(s.ID, "", fmt.Sprintf("ERROR: %v", err))
			}
		}
		c.JSON(http.StatusCreated, gin.H{
			"screening":  s,
			"crisis":     item9,
			"claim_url":  claimURL,
		})
	})

	g.GET("/latest", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		s, err := models.LatestScreening(user.ID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "no screening yet"})
			return
		}
		c.JSON(http.StatusOK, s)
	})
}
