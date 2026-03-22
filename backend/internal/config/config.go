package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort     string
	AppPassword string

	DBHost         string
	DBPort         string
	DBName         string
	DBUser         string
	DBPassword     string
	DBSSLMode      string
	FrontendOrigin string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		AppPort:     getEnv("PORT", getEnv("APP_PORT", "8080")),
		AppPassword: getEnv("APP_PASSWORD", ""),

		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBName:         getEnv("DB_NAME", "requirements_db"),
		DBUser:         getEnv("DB_USER", "requirements_user"),
		DBPassword:     getEnv("DB_PASSWORD", "requirements_pass"),
		DBSSLMode:      getEnv("DB_SSLMODE", "disable"),
		FrontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
	}

	log.Println("config loaded")
	return cfg
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
