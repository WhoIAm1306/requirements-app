package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"requirements-app/backend/internal/config"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type LoginRequest struct {
	FullName     string `json:"fullName"`
	Organization string `json:"organization"`
	Password     string `json:"password"`
}

type LoginResponse struct {
	Token        string `json:"token"`
	FullName     string `json:"fullName"`
	Organization string `json:"organization"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	req.FullName = strings.TrimSpace(req.FullName)
	req.Organization = strings.TrimSpace(req.Organization)

	if req.FullName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Укажите ФИО"})
		return
	}

	if req.Organization != "ДИТ" &&
		req.Organization != "112" &&
		req.Organization != "101" &&
		req.Organization != "Танто-С" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Укажите организацию"})
		return
	}

	if req.Password != h.cfg.AppPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неверный пароль"})
		return
	}

	raw := req.FullName + "|" + req.Organization + "|" + time.Now().Format(time.RFC3339Nano)
	hash := sha256.Sum256([]byte(raw))
	token := hex.EncodeToString(hash[:])

	c.JSON(http.StatusOK, LoginResponse{
		Token:        token,
		FullName:     req.FullName,
		Organization: req.Organization,
	})
}
