// Утилита: удалить все данные приложения из БД, кроме таблицы users.
// Запуск из каталога backend: go run ./cmd/purge
// Также удаляет каталог uploads/contracts (файлы вложений ГК).
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"requirements-app/backend/internal/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("db open: ", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("db sql: ", err)
	}
	defer sqlDB.Close()

	// Одна команда TRUNCATE … CASCADE: PostgreSQL учитывает FK между таблицами.
	// Отдельный TRUNCATE requirements без CASCADE даёт SQLSTATE 0A000, если таблица
	// всё ещё участвует в цепочке внешних ключей.
	const purgeSQL = `
TRUNCATE TABLE
	author_dictionaries,
	comments,
	contract_attachments,
	contract_dictionaries,
	contract_stages,
	contract_tz_functions,
	queue_dictionaries,
	requirements,
	tz_points
RESTART IDENTITY CASCADE`

	tx := db.Begin()
	if err := tx.Exec(purgeSQL).Error; err != nil {
		_ = tx.Rollback()
		log.Fatalf("очистка таблиц: %v", err)
	}
	if err := tx.Commit().Error; err != nil {
		log.Fatal("commit: ", err)
	}

	log.Println("готово: таблицы очищены, users сохранён")

	uploads := filepath.Join("uploads", "contracts")
	if err := os.RemoveAll(uploads); err != nil {
		log.Printf("предупреждение: не удалось удалить %s: %v", uploads, err)
	} else {
		log.Printf("готово: удалён каталог %s", uploads)
	}
}
