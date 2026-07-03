package app

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/socious-io/mental-health/api/src/config"
)

func NewRouter() *gin.Engine {
	if config.C.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()
	corsCfg := cors.DefaultConfig()
	if len(config.C.Cors.Origins) > 0 {
		corsCfg.AllowOrigins = config.C.Cors.Origins
	} else {
		corsCfg.AllowAllOrigins = true
	}
	corsCfg.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(corsCfg))
	return r
}
