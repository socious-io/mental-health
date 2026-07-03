package views

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Init(r *gin.Engine) {
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong", "service": "moya-api"})
	})
	authGroup(r)
	usersGroup(r)
	verificationsGroup(r)
	screeningsGroup(r)
	providersGroup(r)
	bookingsGroup(r)
	portalGroup(r)
	orgGroup(r)
	studiesGroup(r)
}
