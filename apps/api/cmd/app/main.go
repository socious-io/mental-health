package main

import (
	"fmt"
	"log"
	"os"

	"github.com/socious-io/mental-health/api/src/app"
	"github.com/socious-io/mental-health/api/src/app/models"
	"github.com/socious-io/mental-health/api/src/app/views"
	"github.com/socious-io/mental-health/api/src/config"
)

func main() {
	cfgPath := os.Getenv("CONFIG_PATH")
	if cfgPath == "" {
		cfgPath = "config.yml"
	}
	if err := config.Init(cfgPath); err != nil {
		log.Fatalf("config: %v", err)
	}
	if err := models.Migrate(config.C.Database.URL); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := models.Connect(config.C.Database.URL); err != nil {
		log.Fatalf("db: %v", err)
	}
	r := app.NewRouter()
	views.Init(r)
	log.Printf("moya-api listening on :%d", config.C.Port)
	if err := r.Run(fmt.Sprintf(":%d", config.C.Port)); err != nil {
		log.Fatal(err)
	}
}
