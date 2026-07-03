package views

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
)

var handleRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{2,29}$`)

type registerForm struct {
	Handle   string `json:"handle" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Locale   string `json:"locale"`
}

type loginForm struct {
	Login    string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func authGroup(r *gin.Engine) {
	g := r.Group("/auth")

	g.POST("/register", func(c *gin.Context) {
		var form registerForm
		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		form.Handle = strings.ToLower(strings.TrimSpace(form.Handle))
		if !handleRe.MatchString(form.Handle) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid handle: use 3-30 chars, a-z 0-9 and dashes"})
			return
		}
		if form.Locale != "ja" {
			form.Locale = "en"
		}
		hash, err := app.HashPassword(form.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}
		user, err := models.CreateUser(form.Handle, strings.ToLower(form.Email), hash, form.Locale)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "handle or email already taken"})
			return
		}
		token, _ := app.GenerateToken(user.ID)
		c.JSON(http.StatusCreated, gin.H{"access_token": token, "user": user})
	})

	g.POST("/login", func(c *gin.Context) {
		var form loginForm
		if err := c.ShouldBindJSON(&form); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		user, err := models.GetUserByLogin(strings.ToLower(strings.TrimSpace(form.Login)))
		if err != nil || !app.CheckPassword(user.PasswordHash, form.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		token, _ := app.GenerateToken(user.ID)
		c.JSON(http.StatusOK, gin.H{"access_token": token, "user": user})
	})
}
