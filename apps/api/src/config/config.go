package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Env    string `yaml:"env"`
	Port   int    `yaml:"port"`
	Secret string `yaml:"secret"`
	Database struct {
		URL string `yaml:"url"`
	} `yaml:"database"`
	Cors struct {
		Origins []string `yaml:"origins"`
	} `yaml:"cors"`
	Shin struct {
		Host    string `yaml:"host"`
		Email   string `yaml:"email"`
		Password string `yaml:"password"`
		ApiKey  string `yaml:"apikey"`
		AppHost string `yaml:"apphost"`
	} `yaml:"shin"`
	Payment struct {
		Enabled bool `yaml:"enabled"`
	} `yaml:"payment"`
	Demo struct {
		Enabled bool `yaml:"enabled"`
	} `yaml:"demo"`
	Verification struct {
		ShinVerificationID string `yaml:"shin_verification_id"`
	} `yaml:"verification"`
	Schemas struct {
		Over18          string `yaml:"over18"`
		ScreeningResult string `yaml:"screening_result"`
		TreatmentNeed   string `yaml:"treatment_need"`
	} `yaml:"schemas"`
}

var C Config

func Init(path string) error {
	f, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := yaml.Unmarshal(f, &C); err != nil {
		return err
	}
	if C.Port == 0 {
		C.Port = 5070
	}
	// Demo mode auto-verifies accounts — never allowed in production unless
	// explicitly forced (reviewer sessions) via ALLOW_DEMO=true.
	if C.Env == "production" && C.Demo.Enabled && os.Getenv("ALLOW_DEMO") != "true" {
		return fmt.Errorf("refusing to start: demo.enabled=true in production (set ALLOW_DEMO=true to override)")
	}
	return nil
}
