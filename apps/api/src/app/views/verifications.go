package views

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/config"
	"github.com/socious-io/mental-health/api/src/shin"
)

// The web-app-v2 pattern: POST creates a verification (returns a connect URL
// the user opens/scans with Socious Wallet), GET polls until verified.
func verificationsGroup(r *gin.Engine) {
	g := r.Group("/credentials/verifications")
	g.Use(app.LoginRequired())

	g.POST("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		if user.IdentityVerified {
			c.JSON(http.StatusOK, gin.H{"verified": true})
			return
		}
		if config.C.Demo.Enabled {
			v, err := models.UpsertVerification(user.ID, "demo", "demo", "demo://verified")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
				return
			}
			c.JSON(http.StatusCreated, gin.H{"id": v.ID, "connect_url": v.ConnectURL, "demo": true})
			return
		}
		shinVID := config.C.Verification.ShinVerificationID
		if shinVID == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "verification not configured"})
			return
		}
		// Full server-side hand-off: create the per-user session on Shin and
		// fetch its OOB short link — the QR is scanned directly by the
		// Socious Wallet app (its scanner resolves short links via /fetch).
		ind, err := shin.CreateIndividual(shinVID, user.ID.String())
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "shin: " + err.Error()})
			return
		}
		shortURL, err := shin.IndividualConnect(ind.ID)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "shin connect: " + err.Error()})
			return
		}
		longURL, err := shin.ResolveShort(shortURL)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "shin fetch: " + err.Error()})
			return
		}
		walletURL, _, err := buildWalletConnectURL(longURL, ind.ID, c.Request.Host)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "connect rewrite: " + err.Error()})
			return
		}
		v, err := models.UpsertVerification(user.ID, shinVID, ind.ID, walletURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		qrURL := "https://" + c.Request.Host + "/wallet/qr/" + v.ID.String()
		c.JSON(http.StatusCreated, gin.H{"id": v.ID, "connect_url": qrURL})
	})

	g.GET("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		if user.IdentityVerified {
			c.JSON(http.StatusOK, gin.H{"verified": true})
			return
		}
		v, err := models.LatestVerification(user.ID)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"verified": false, "status": "NONE"})
			return
		}
		if config.C.Demo.Enabled {
			// Demo: a poll after a request auto-verifies (reviewer path without wallet)
			models.MarkUserVerified(user.ID)
			c.JSON(http.StatusOK, gin.H{"verified": true, "demo": true})
			return
		}
		if v.ShinIndividualID != nil && *v.ShinIndividualID != "" && *v.ShinIndividualID != "demo" {
			shin.IndividualVerify(*v.ShinIndividualID)
		}
		res, err := shin.CheckIndividual(*v.ShinVerificationID, user.ID.String())
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"verified": false, "status": v.Status})
			return
		}
		if res.Status == "VERIFIED" {
			models.MarkUserVerified(user.ID)
			c.JSON(http.StatusOK, gin.H{"verified": true})
			return
		}
		c.JSON(http.StatusOK, gin.H{"verified": false, "status": res.Status})
	})
}
