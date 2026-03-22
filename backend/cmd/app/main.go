package main

import (
	"log"
	"net/http"
	"time"

	"requirements-app/backend/internal/config"
	"requirements-app/backend/internal/db"
	"requirements-app/backend/internal/handlers"
	"requirements-app/backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database, err := db.NewPostgres(cfg)
	if err != nil {
		log.Fatal("db connection error: ", err)
	}

	authHandler := handlers.NewAuthHandler(cfg)
	requirementHandler := handlers.NewRequirementHandler(database)
	dictionaryHandler := handlers.NewDictionaryHandler(database)

	r := gin.Default()

	allowedOrigins := []string{"http://localhost:5173"}
	if cfg.FrontendOrigin != "" && cfg.FrontendOrigin != "http://localhost:5173" {
		allowedOrigins = append(allowedOrigins, cfg.FrontendOrigin)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-User-Name",
			"X-User-Org",
		},
		ExposeHeaders: []string{
			"Content-Length",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	r.POST("/api/auth/login", authHandler.Login)

	api := r.Group("/api")
	api.Use(middleware.SimpleAuthMiddleware())
	{
		api.GET("/requirements", requirementHandler.List)
		api.GET("/requirements/:id", requirementHandler.GetByID)
		api.POST("/requirements", requirementHandler.Create)
		api.PUT("/requirements/:id", requirementHandler.Update)
		api.POST("/requirements/:id/comments", requirementHandler.AddComment)
		api.POST("/requirements/:id/archive", requirementHandler.Archive)
		api.POST("/requirements/:id/restore", requirementHandler.Restore)

		api.GET("/authors", dictionaryHandler.SearchAuthors)
		api.GET("/tz-points", dictionaryHandler.SearchTZPoints)

		api.GET("/queues", dictionaryHandler.ListQueues)
		api.POST("/queues", dictionaryHandler.CreateQueue)

		api.POST("/import/requirements", requirementHandler.ImportRequirements)
		api.POST("/import/tz-points", dictionaryHandler.ImportTZPoints)

		api.GET("/export/requirements", requirementHandler.ExportRequirements)

	}

	log.Printf("backend started on :%s", cfg.AppPort)
	if err := r.Run(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}
