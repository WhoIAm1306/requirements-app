package middleware

import (
	"encoding/base64"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

func decodeHeaderValue(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	// Сначала пробуем base64
	if decoded, err := base64.StdEncoding.DecodeString(value); err == nil {
		return strings.TrimSpace(string(decoded))
	}

	// Фолбэк на старый вариант через QueryUnescape
	if decoded, err := url.QueryUnescape(value); err == nil {
		return strings.TrimSpace(decoded)
	}

	return value
}

func SimpleAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userName := decodeHeaderValue(c.GetHeader("X-User-Name"))
		userOrg := decodeHeaderValue(c.GetHeader("X-User-Org"))

		if userName == "" || userOrg == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
			c.Abort()
			return
		}

		c.Set("userName", userName)
		c.Set("userOrg", userOrg)
		c.Next()
	}
}
