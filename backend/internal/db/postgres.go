package db

import (
	"fmt"
	"log"

	"requirements-app/backend/internal/config"
	"requirements-app/backend/internal/models"

	"errors"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

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
	)
	if err != nil {
		return nil, err
	}

	if err := seedDefaultQueues(database); err != nil {
		return nil, err
	}

	log.Println("database connected and migrated")
	return database, nil
}

func seedDefaultQueues(db *gorm.DB) error {
	defaults := []models.QueueDictionary{
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
