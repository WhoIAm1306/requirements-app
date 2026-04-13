// Package handlers — HTTP-обработчики Gin (аутентификация, предложения, справочники, ГК).
package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"requirements-app/backend/internal/models"
	"requirements-app/backend/internal/security"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthHandler отвечает за логин, профиль и смену пароля.
type AuthHandler struct {
	db         *gorm.DB
	jwtService *security.JWTService
}

// NewAuthHandler создаёт auth handler.
func NewAuthHandler(db *gorm.DB, jwtService *security.JWTService) *AuthHandler {
	return &AuthHandler{
		db:         db,
		jwtService: jwtService,
	}
}

// LoginRequest — вход по почте и паролю.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// UserProfileResponse — безопасное представление пользователя на фронт.
type UserProfileResponse struct {
	ID                     uint            `json:"id"`
	FullName               string          `json:"fullName"`
	Organization           string          `json:"organization"`
	Email                  string          `json:"email"`
	AccessLevel            string          `json:"accessLevel"`
	IsSuperuser            bool            `json:"isSuperuser"`
	IsActive               bool            `json:"isActive"`
	RequirementFieldGrants map[string]bool `json:"requirementFieldGrants,omitempty"`
}

// LoginResponse — ответ после логина.
type LoginResponse struct {
	AccessToken string              `json:"accessToken"`
	Profile     UserProfileResponse `json:"profile"`
}

// ChangePasswordRequest — запрос на смену собственного пароля.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// isAllowedOrganization проверяет допустимые организации.
func isAllowedOrganization(value string) bool {
	switch strings.TrimSpace(value) {
	case "ДИТ", "112", "101", "Танто-С":
		return true
	default:
		return false
	}
}

// isAllowedAccessLevel проверяет допустимый уровень доступа.
func isAllowedAccessLevel(value string) bool {
	switch strings.TrimSpace(value) {
	case "read", "edit":
		return true
	default:
		return false
	}
}

func decodeRequirementGrantsJSON(raw string) map[string]bool {
	out := map[string]bool{}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "{}" {
		return out
	}
	_ = json.Unmarshal([]byte(raw), &out)
	return out
}

// userToProfile переводит модель пользователя в безопасный DTO.
func userToProfile(user *models.User) UserProfileResponse {
	return UserProfileResponse{
		ID:                     user.ID,
		FullName:               user.FullName,
		Organization:           user.Organization,
		Email:                  user.Email,
		AccessLevel:            user.AccessLevel,
		IsSuperuser:            user.IsSuperuser,
		IsActive:               user.IsActive,
		RequirementFieldGrants: decodeRequirementGrantsJSON(user.RequirementFieldGrants),
	}
}

// Login выполняет вход по email и паролю.
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	password := req.Password

	if email == "" || password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Укажите почту и пароль"})
		return
	}

	var user models.User
	if err := h.db.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неверная почта или пароль"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"message": "Пользователь отключён"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Неверная почта или пароль"})
		return
	}

	token, err := h.jwtService.GenerateAccessToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка генерации токена"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		AccessToken: token,
		Profile:     userToProfile(&user),
	})
}

// Me возвращает текущий профиль из JWT-сессии.
func (h *AuthHandler) Me(c *gin.Context) {
	currentUser, ok := c.Get("currentUser")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
		return
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
		return
	}

	c.JSON(http.StatusOK, userToProfile(user))
}

// ChangePassword меняет пароль текущего пользователя.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	currentUser, ok := c.Get("currentUser")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
		return
	}

	user, ok := currentUser.(*models.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Текущий пароль указан неверно"})
		return
	}

	if len(strings.TrimSpace(req.NewPassword)) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Новый пароль должен быть не короче 6 символов"})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения пароля"})
		return
	}

	user.PasswordHash = string(passwordHash)
	if err := h.db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения пароля"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пароль успешно изменён"})
}
