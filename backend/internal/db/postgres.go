// Package db — подключение к PostgreSQL, AutoMigrate и сиды (очереди, суперпользователь).
package db

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"requirements-app/backend/internal/config"
	"requirements-app/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// NewPostgres создаёт подключение к PostgreSQL, прогоняет миграции и сиды.
func NewPostgres(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBSSLMode,
	)

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	err = database.AutoMigrate(
		&models.Requirement{},
		&models.Comment{},
		&models.TZPoint{},
		&models.AuthorDictionary{},
		&models.QueueDictionary{},
		&models.ContractDictionary{},
		&models.ContractStage{},
		&models.ContractTZFunction{},
		&models.ContractAttachment{},
		&models.RequirementAttachmentLibrary{},
		&models.RequirementAttachment{},
		&models.User{},
	)
	if err != nil {
		return nil, err
	}

	// Разовое приведение устаревшего кода системы «Телефония».
	if res := database.Exec(`UPDATE requirements SET system_type = 'Телефония' WHERE system_type = 'telephony'`); res.Error != nil {
		return nil, res.Error
	}

	if err := seedDefaultQueues(database); err != nil {
		return nil, err
	}

	if err := seedSuperuser(database, cfg); err != nil {
		return nil, err
	}

	// Миграция данных: старый system_type «Телефония» → раздел + система 112.
	if res := database.Exec(`
		UPDATE requirements
		SET section_name = 'Телефония', system_type = '112'
		WHERE LOWER(TRIM(COALESCE(system_type, ''))) IN ('телефония', 'telephony')
		   OR TRIM(system_type) = 'Телефония'
	`); res.Error != nil {
		return nil, res.Error
	}
	_ = database.Exec(`UPDATE users SET requirement_field_grants = '{}'::jsonb WHERE requirement_field_grants IS NULL`)
	// Миграция порядкового номера: для старых записей, где номер ещё не выставлен.
	_ = database.Exec(`UPDATE requirements SET sequence_number = id WHERE COALESCE(sequence_number, 0) = 0`)

	log.Println("database connected and migrated")
	return database, nil
}

// seedDefaultQueues создаёт стандартные очереди, если их ещё нет.
func seedDefaultQueues(db *gorm.DB) error {
	defaults := []models.QueueDictionary{
		{Number: 0, Name: "Не определена", IsActive: true},
		{Number: 1, Name: "1 очередь", IsActive: true},
		{Number: 2, Name: "2 очередь", IsActive: true},
		{Number: 3, Name: "3 очередь", IsActive: true},
	}

	for _, item := range defaults {
		var existing models.QueueDictionary
		err := db.Where("number = ?", item.Number).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Create(&item).Error; err != nil {
			return err
		}
	}

	return nil
}

// seedSuperuser создаёт стартового суперпользователя.
func seedSuperuser(db *gorm.DB, cfg *config.Config) error {
	email := strings.TrimSpace(strings.ToLower(cfg.SuperuserEmail))
	if email == "" {
		return nil
	}

	var existing models.User
	err := db.Where("LOWER(email) = ?", email).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(cfg.SuperuserPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := models.User{
		FullName:     cfg.SuperuserFullName,
		Organization: cfg.SuperuserOrganization,
		Email:        email,
		PasswordHash: string(passwordHash),
		AccessLevel:  "edit",
		IsSuperuser:  true,
		IsActive:     true,
	}

	return db.Create(&user).Error
}
