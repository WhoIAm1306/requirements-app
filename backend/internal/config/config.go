// Package config загружает переменные окружения и .env в структуру приложения.
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config хранит все переменные окружения приложения.
type Config struct {
	// Порт приложения.
	AppPort string

	// Разрешённый origin фронтенда для локальной разработки и кросс-доменных запросов.
	FrontendOrigin string

	// Секрет для подписи JWT.
	JWTSecret string

	// Параметры подключения к PostgreSQL.
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
	DBSSLMode  string

	// Начальные данные суперпользователя.
	SuperuserFullName     string
	SuperuserOrganization string
	SuperuserEmail        string
	SuperuserPassword     string
}

// Load читает .env и собирает итоговую конфигурацию.
func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		AppPort: getEnv("PORT", getEnv("APP_PORT", "8080")),

		FrontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
		JWTSecret:      getEnv("JWT_SECRET", "change-me-super-secret"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBName:     getEnv("DB_NAME", "requirements_db"),
		DBUser:     getEnv("DB_USER", "requirements_user"),
		DBPassword: getEnv("DB_PASSWORD", "requirements_pass"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		SuperuserFullName:     getEnv("SUPERUSER_FULL_NAME", "Системный администратор"),
		SuperuserOrganization: getEnv("SUPERUSER_ORGANIZATION", "ДИТ"),
		SuperuserEmail:        getEnv("SUPERUSER_EMAIL", "admin@example.com"),
		SuperuserPassword:     getEnv("SUPERUSER_PASSWORD", "Admin123456"),
	}

	log.Println("config loaded")
	return cfg
}

// getEnv возвращает значение переменной окружения или fallback.
func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
