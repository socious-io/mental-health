package views

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
)

var cardanoAddrRe = regexp.MustCompile(`^addr(_test)?1[02-9ac-hj-np-z]{40,110}$`)

func usersGroup(r *gin.Engine) {
	g := r.Group("/users")
	g.Use(app.LoginRequired())

	// Optional self-custody payout: rewards release to this address instead of
	// a platform-custodial wallet. Cardano bech32 payment address only.
	g.PATCH("/me/wallet", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		var form struct {
			Address string `json:"address"`
		}
		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		form.Address = strings.TrimSpace(form.Address)
		if form.Address == "" {
			if err := models.SetUserCardanoAddress(user.ID, nil); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"cardano_address": nil})
			return
		}
		if !cardanoAddrRe.MatchString(form.Address) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid Cardano address (expected a bech32 addr… / addr_test… payment address)"})
			return
		}
		if err := models.SetUserCardanoAddress(user.ID, &form.Address); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"cardano_address": form.Address})
	})

	
	g.GET("/me", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		c.JSON(http.StatusOK, user)
	})
}
