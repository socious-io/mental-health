package views

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
)

func usersGroup(r *gin.Engine) {
	g := r.Group("/users")
	g.Use(app.LoginRequired())

	g.GET("/me", func(c *gin.Context) {
		user := c.MustGet("user").(*models.User)
		c.JSON(http.StatusOK, user)
	})
}
