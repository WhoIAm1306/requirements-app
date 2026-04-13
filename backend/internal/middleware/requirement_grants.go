package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// DecodeRequirementGrantsJSON разбирает JSON грантов из users.requirement_field_grants.
func DecodeRequirementGrantsJSON(raw string) map[string]bool {
	out := map[string]bool{}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "{}" {
		return out
	}
	_ = json.Unmarshal([]byte(raw), &out)
	return out
}

// UserHasRequirementGrant — истина, если у пользователя в грантах key=true.
func UserHasRequirementGrant(u *models.User, key string) bool {
	if u == nil || strings.TrimSpace(key) == "" {
		return false
	}
	return DecodeRequirementGrantsJSON(u.RequirementFieldGrants)[key]
}

// UserHasAnyRequirementPUTGrant — read-пользователь может вызывать PUT /requirements/:id,
// если есть хотя бы один грант на поле карточки (не только comment).
func UserHasAnyRequirementPUTGrant(u *models.User) bool {
	if u == nil || strings.TrimSpace(u.AccessLevel) != "read" {
		return false
	}
	for k, v := range DecodeRequirementGrantsJSON(u.RequirementFieldGrants) {
		if !v || strings.TrimSpace(k) == "" {
			continue
		}
		if k == "comment" {
			continue
		}
		return true
	}
	return false
}

// RequireEditOrSuperuserOrRequirementPUTGrants — полное редактирование или read с грантом на поля.
func RequireEditOrSuperuserOrRequirementPUTGrants() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}
		if strings.TrimSpace(c.GetString("accessLevel")) == "edit" {
			c.Next()
			return
		}
		raw, ok := c.Get("currentUser")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		u, ok := raw.(*models.User)
		if !ok || u == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		if UserHasAnyRequirementPUTGrant(u) {
			c.Next()
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для изменения предложения"})
		c.Abort()
	}
}

// RequireEditOrSuperuserOrAttachmentGrant — вложения: edit/superuser или грант attachments.
func RequireEditOrSuperuserOrAttachmentGrant() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("isSuperuser") {
			c.Next()
			return
		}
		if strings.TrimSpace(c.GetString("accessLevel")) == "edit" {
			c.Next()
			return
		}
		raw, ok := c.Get("currentUser")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		u, ok := raw.(*models.User)
		if !ok || u == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}
		if UserHasRequirementGrant(u, "attachments") {
			c.Next()
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": "Недостаточно прав для работы с вложениями"})
		c.Abort()
	}
}
