package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"requirements-app/backend/internal/config"
	"requirements-app/backend/internal/db"
	"requirements-app/backend/internal/handlers"
	"requirements-app/backend/internal/middleware"
	"requirements-app/backend/internal/security"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Загружаем конфигурацию приложения.
	cfg := config.Load()

	// Подключаемся к базе данных.
	database, err := db.NewPostgres(cfg)
	if err != nil {
		log.Fatal("db connection error: ", err)
	}

	// Инициализируем JWT-сервис.
	jwtService := security.NewJWTService(cfg.JWTSecret)

	// Создаём handlers.
	authHandler := handlers.NewAuthHandler(database, jwtService)
	userHandler := handlers.NewUserHandler(database)
	requirementHandler := handlers.NewRequirementHandler(database)
	dictionaryHandler := handlers.NewDictionaryHandler(database)
	contractDirectoryHandler := handlers.NewContractDirectoryHandler(database)

	// Создаём gin router.
	r := gin.Default()

	// Разрешённые origin для фронтенда.
	allowedOrigins := []string{"http://localhost:5173"}
	if cfg.FrontendOrigin != "" && cfg.FrontendOrigin != "http://localhost:5173" {
		allowedOrigins = append(allowedOrigins, cfg.FrontendOrigin)
	}

	// Настраиваем CORS.
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health-check.
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// Общая группа API.
	api := r.Group("/api")

	// Публичный логин.
	api.POST("/auth/login", authHandler.Login)

	// Базовая JWT-авторизация.
	authMw := middleware.RequireAuth(jwtService, database)

	// Read-only маршруты доступны всем авторизованным пользователям.
	read := api.Group("")
	read.Use(authMw)
	{
		read.GET("/auth/me", authHandler.Me)
		read.POST("/auth/change-password", authHandler.ChangePassword)

		read.GET("/requirements", requirementHandler.List)
		read.GET("/requirements/:id", requirementHandler.GetByID)
		read.GET("/requirements/:id/gk-link", requirementHandler.GetGKLink)
		read.GET("/export/requirements", requirementHandler.ExportRequirements)

		read.GET("/authors", dictionaryHandler.SearchAuthors)
		read.GET("/tz-points", dictionaryHandler.SearchTZPoints)
		read.GET("/contracts", dictionaryHandler.ListContracts)
		read.GET("/contracts/search", dictionaryHandler.SearchContracts)
		read.GET("/contracts/:id", contractDirectoryHandler.GetContractDetails)
		read.GET("/contracts/:id/stages", contractDirectoryHandler.ListStages)
		read.GET("/contracts/:id/stages/:stageNumber/functions", contractDirectoryHandler.ListFunctionsForStage)
		read.GET("/contracts/:id/attachments", contractDirectoryHandler.ListContractAttachments)
		read.GET("/contracts/attachments/:attachmentId/download", contractDirectoryHandler.DownloadContractAttachment)
		read.GET("/queues", dictionaryHandler.ListQueues)
	}

	// Маршруты изменения данных доступны только edit-пользователю или суперпользователю.
	edit := api.Group("")
	edit.Use(authMw, middleware.RequireEditOrSuperuser())
	{
		edit.POST("/requirements", requirementHandler.Create)
		edit.PUT("/requirements/:id", requirementHandler.Update)
		edit.DELETE("/requirements/:id", requirementHandler.Delete)
		edit.POST("/requirements/:id/comments", requirementHandler.AddComment)
		edit.POST("/requirements/:id/archive", requirementHandler.Archive)
		edit.POST("/requirements/:id/restore", requirementHandler.Restore)

		edit.POST("/contracts", contractDirectoryHandler.CreateContract)
		edit.PUT("/contracts/:id", contractDirectoryHandler.UpdateContract)
		edit.POST("/contracts/:id/stages", contractDirectoryHandler.CreateStage)
		edit.POST("/contracts/:id/functions", contractDirectoryHandler.UpsertTZFunction)
		edit.POST("/contracts/:id/attachments", contractDirectoryHandler.UploadContractAttachments)

		edit.DELETE("/contracts/attachments/:attachmentId", contractDirectoryHandler.DeleteContractAttachment)
		edit.DELETE("/contracts/:id/functions/:functionId", contractDirectoryHandler.DeleteTZFunction)
		edit.DELETE("/contracts/:id/stages/:stageNumber", contractDirectoryHandler.DeleteStage)
		edit.DELETE("/contracts/:id", contractDirectoryHandler.DeleteContract)

		edit.POST("/queues", dictionaryHandler.CreateQueue)

		edit.POST("/import/requirements", requirementHandler.ImportRequirements)
		edit.POST("/import/tz-points", dictionaryHandler.ImportTZPoints)
		edit.POST("/import/gk-tz-functions", contractDirectoryHandler.ImportTZFunctionsFromExcel)
	}

	// Административные маршруты только для суперпользователя.
	// ВАЖНО: смена пароля другого пользователя тут больше НЕ доступна.
	admin := api.Group("/admin")
	admin.Use(authMw, middleware.RequireSuperuser())
	{
		admin.GET("/users", userHandler.ListUsers)
		admin.POST("/users", userHandler.CreateUser)
		admin.PUT("/users/:id", userHandler.UpdateUser)
	}

	// Раздача собранного фронтенда, если он существует.
	frontendDist := "./frontend-dist"

	if _, err := os.Stat(filepath.Join(frontendDist, "index.html")); err == nil {
		r.Static("/assets", filepath.Join(frontendDist, "assets"))

		faviconPath := filepath.Join(frontendDist, "favicon.ico")
		if _, err := os.Stat(faviconPath); err == nil {
			r.StaticFile("/favicon.ico", faviconPath)
		}

		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"message": "Маршрут не найден"})
				return
			}

			c.File(filepath.Join(frontendDist, "index.html"))
		})
	}

	log.Printf("backend started on :%s", cfg.AppPort)
	if err := r.Run(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}
