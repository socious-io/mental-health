package views

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/config"
	"github.com/socious-io/mental-health/api/src/shin"
)

// One-time eligibility credential (MoyaOver18). The verification gate can only
// be passed by a wallet holding this credential, so users claim it first.
// Eligibility source at MVP scope = explicit self-attestation (documented in
// the README as the pluggable slot for a production ID-verification vendor).
func eligibilityGroup(r *gin.Engine) {
	g := r.Group("/credentials/over18")
	g.Use(app.LoginRequired())

	g.POST("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		var form struct {
			Attest bool `json:"attest"`
		}
		if err := c.ShouldBindJSON(&form); err != nil || !form.Attest {
			c.JSON(http.StatusBadRequest, gin.H{"error": "attestation required"})
			return
		}
		if user.Over18CredentialID != nil && *user.Over18CredentialID != "" {
			c.JSON(http.StatusOK, gin.H{"claim_url": shin.CredentialConnectURL(*user.Over18CredentialID)})
			return
		}
		if config.C.Demo.Enabled || config.C.Schemas.Over18 == "" {
			models.SetOver18Credential(user.ID, "demo")
			c.JSON(http.StatusCreated, gin.H{"claim_url": "", "demo": true})
			return
		}
		cred, err := shin.IssueCredential(
			"Moya Eligibility (Over 18)",
			"Attests the holder is over 18. Contains no identity data.",
			config.C.Schemas.Over18,
			user.Email, user.Handle,
			[]map[string]any{
				{"name": "over_18", "value": true},
				{"name": "method", "value": "self-attestation (MVP)"},
				{"name": "issued_date", "value": time.Now().Format(time.RFC3339)},
			},
		)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		models.SetOver18Credential(user.ID, cred.ID)
		c.JSON(http.StatusCreated, gin.H{"claim_url": shin.CredentialConnectURL(cred.ID)})
	})

	g.GET("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		if user.Over18CredentialID == nil || *user.Over18CredentialID == "" {
			c.JSON(http.StatusOK, gin.H{"exists": false})
			return
		}
		out := gin.H{"exists": true, "claim_url": shin.CredentialConnectURL(*user.Over18CredentialID)}
		if cred, err := shin.GetCredential(*user.Over18CredentialID); err == nil {
			out["status"] = cred.Status
		}
		c.JSON(http.StatusOK, out)
	})
}
