package middleware

import (
	"net/http"
	"strings"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// UserHasGKDirectoryGrant — истина, если у пользователя в users.gk_directory_grants key=true.
func UserHasGKDirectoryGrant(u *models.User, key string) bool {
	if u == nil || strings.TrimSpace(key) == "" {
		return false
	}
	return DecodeRequirementGrantsJSON(u.GKDirectoryGrants)[key]
}

func currentUserFromContext(c *gin.Context) (*models.User, bool) {
	raw, ok := c.Get("currentUser")
	if !ok {
		return nil, false
	}
	u, ok := raw.(*models.User)
	if !ok || u == nil {
		return nil, false
	}
	return u, true
}

// RequireGKContractEditOrSuperuser — редактирование карточки ГК: superuser или грант gkContractEdit.
func RequireGKContractEditOrSuperuser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}
		u, ok := currentUserFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		if strings.TrimSpace(u.AccessLevel) != "edit" {
			c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для редактирования ГК"})
			c.Abort()
			return
		}
		if UserHasGKDirectoryGrant(u, "gkContractEdit") {
			c.Next()
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для редактирования ГК"})
		c.Abort()
	}
}

// RequireGKStageEditOrSuperuser — редактирование этапов: superuser или грант gkStageEdit.
func RequireGKStageEditOrSuperuser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}
		u, ok := currentUserFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		if strings.TrimSpace(u.AccessLevel) != "edit" {
			c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для редактирования этапов ГК"})
			c.Abort()
			return
		}
		if UserHasGKDirectoryGrant(u, "gkStageEdit") {
			c.Next()
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для редактирования этапов ГК"})
		c.Abort()
	}
}

// RequireGKFunctionEditOrSuperuser — редактирование функций: superuser или грант gkFunctionEdit.
func RequireGKFunctionEditOrSuperuser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}
		u, ok := currentUserFromContext(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		if strings.TrimSpace(u.AccessLevel) != "edit" {
			c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для редактирования функций ГК"})
			c.Abort()
			return
		}
		if UserHasGKDirectoryGrant(u, "gkFunctionEdit") {
			c.Next()
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для редактирования функций ГК"})
		c.Abort()
	}
}
