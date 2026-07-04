package views

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/shin"
)

// The Socious Wallet scanner resolves whatever URL it scans via GET {url}/fetch,
// and after accepting a connection it (a) polls the cloud agent using the LAST
// path segment of the callback URL as the connection id, then (b) GETs the
// callback. Shin's own callback URLs end in the literal "callback", which the
// wallet can never poll — so Moya serves the QR itself: same OOB invitation,
// callback rewritten to /wallet/cb/{individualID}/{connectionID}.
func walletGroup(r *gin.Engine) {
	g := r.Group("/wallet")

	g.GET("/qr/:id/fetch", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad id"})
			return
		}
		v, err := models.GetVerificationByID(id)
		if err != nil || v.ConnectURL == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"long_url": *v.ConnectURL})
	})

	g.GET("/qr/:id", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad id"})
			return
		}
		v, err := models.GetVerificationByID(id)
		if err != nil || v.ConnectURL == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.Redirect(http.StatusFound, *v.ConnectURL)
	})

	g.GET("/cb/:iid/:cid", func(c *gin.Context) {
		if c.Query("reject") != "" {
			c.JSON(http.StatusOK, gin.H{"message": "ok"})
			return
		}
		if err := shin.IndividualCallback(c.Param("iid")); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
}

// buildWalletConnectURL rewrites a Shin wallet-connect long URL so the wallet
// can complete the flow: keeps the _oob invitation, swaps the callback for
// Moya's relay whose last path segment is the agent connection id (what the
// wallet polls on the cloud agent).
func buildWalletConnectURL(longURL, individualID, apiHost string) (string, string, error) {
	u, err := url.Parse(longURL)
	if err != nil {
		return "", "", err
	}
	q := u.Query()
	oob := q.Get("_oob")
	if oob == "" {
		return "", "", fmt.Errorf("no _oob in connect url")
	}
	raw, err := base64.RawURLEncoding.DecodeString(oob)
	if err != nil {
		if raw2, err2 := base64.URLEncoding.DecodeString(oob); err2 == nil {
			raw = raw2
		} else {
			return "", "", fmt.Errorf("bad _oob encoding: %w", err)
		}
	}
	var inv struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &inv); err != nil || inv.ID == "" {
		return "", "", fmt.Errorf("cannot read invitation id")
	}
	q.Set("callback", fmt.Sprintf("https://%s/wallet/cb/%s/%s", apiHost, individualID, inv.ID))
	u.RawQuery = q.Encode()
	return u.String(), inv.ID, nil
}
