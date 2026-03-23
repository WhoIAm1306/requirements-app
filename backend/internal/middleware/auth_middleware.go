package middleware

import (
	"net/http"
	"strings"

	"requirements-app/backend/internal/models"
	"requirements-app/backend/internal/security"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// extractBearerToken достаёт токен из Authorization: Bearer ...
func extractBearerToken(header string) string {
	header = strings.TrimSpace(header)
	if header == "" {
		return ""
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 {
		return ""
	}

	if !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}

// RequireAuth валидирует JWT и кладёт пользователя в контекст.
func RequireAuth(jwtService *security.JWTService, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c.GetHeader("Authorization"))
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}

		claims, err := jwtService.ParseAccessToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Сессия недействительна"})
			c.Abort()
			return
		}

		var user models.User
		if err := db.First(&user, claims.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Пользователь не найден"})
			c.Abort()
			return
		}

		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"message": "Пользователь отключён"})
			c.Abort()
			return
		}

		// Совместимость с уже существующими handler'ами.
		c.Set("currentUser", &user)
		c.Set("userID", user.ID)
		c.Set("userName", user.FullName)
		c.Set("userEmail", user.Email)
		c.Set("userOrg", user.Organization)
		c.Set("accessLevel", user.AccessLevel)
		c.Set("isSuperuser", user.IsSuperuser)

		c.Next()
	}
}

// RequireEditOrSuperuser пропускает только пользователей с правом редактирования или суперпользователя.
func RequireEditOrSuperuser() gin.HandlerFunc {
	return func(c *gin.Context) {
		accessLevel := strings.TrimSpace(c.GetString("accessLevel"))
		isSuperuser := c.GetBool("isSuperuser")

		if isSuperuser || accessLevel == "edit" {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для изменения данных"})
		c.Abort()
	}
}

// RequireSuperuser пропускает только суперпользователя.
func RequireSuperuser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"message": "Доступно только суперпользователю"})
		c.Abort()
	}
}
