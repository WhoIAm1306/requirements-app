package middleware

import (
	"net/http"
	"strings"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// UserReadMayComment — у пользователя read и в JSON-грантах comment=true.
func UserReadMayComment(u *models.User) bool {
	if u == nil || strings.TrimSpace(u.AccessLevel) != "read" {
		return false
	}
	return DecodeRequirementGrantsJSON(u.RequirementFieldGrants)["comment"]
}

// RequireCommentOrEdit — POST комментария: edit/superuser или read с грантом comment.
func RequireCommentOrEdit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}
		if strings.TrimSpace(c.GetString("accessLevel")) == "edit" {
			c.Next()
			return
		}
		raw, exists := c.Get("currentUser")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		u, isUser := raw.(*models.User)
		if !isUser || u == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		if UserReadMayComment(u) {
			c.Next()
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для добавления комментария"})
		c.Abort()
	}
}
