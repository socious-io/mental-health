package views

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
)

type bookingForm struct {
	ProviderID  string          `json:"provider_id" binding:"required"`
	Preferences json.RawMessage `json:"preferences"`
}

func bookingsGroup(r *gin.Engine) {
	g := r.Group("/bookings")
	g.Use(app.LoginRequired())

	g.POST("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		if !user.IdentityVerified {
			c.JSON(http.StatusForbidden, gin.H{"error": "verify your account first"})
			return
		}
		var form bookingForm
		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		pid, err := uuid.Parse(form.ProviderID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bad provider id"})
			return
		}
		s, err := models.LatestScreening(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "complete a screening first"})
			return
		}
		if form.Preferences == nil {
			form.Preferences = json.RawMessage(`{}`)
		}
		b, err := models.CreateBooking(user.ID, pid, s.Band, form.Preferences)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusCreated, b)
	})

	g.GET("", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		list, err := models.UserBookings(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal"})
			return
		}
		c.JSON(http.StatusOK, list)
	})
}
