package config

import (
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
	return nil
}
