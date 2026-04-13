package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserHandler отвечает за административные операции над пользователями.
type UserHandler struct {
	db *gorm.DB
}

// NewUserHandler создаёт административный handler пользователей.
func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

// AdminUserResponse — DTO пользователя для административной панели.
type AdminUserResponse struct {
	ID                     uint            `json:"id"`
	FullName               string          `json:"fullName"`
	Organization           string          `json:"organization"`
	Email                  string          `json:"email"`
	AccessLevel            string          `json:"accessLevel"`
	IsSuperuser            bool            `json:"isSuperuser"`
	IsActive               bool            `json:"isActive"`
	RequirementFieldGrants map[string]bool `json:"requirementFieldGrants,omitempty"`
	CreatedAt              string          `json:"createdAt"`
}

// CreateUserRequest — создание нового пользователя.
type CreateUserRequest struct {
	FullName               string          `json:"fullName"`
	Organization           string          `json:"organization"`
	Email                  string          `json:"email"`
	Password               string          `json:"password"`
	AccessLevel            string          `json:"accessLevel"`
	IsActive               bool            `json:"isActive"`
	RequirementFieldGrants map[string]bool `json:"requirementFieldGrants"`
}

// UpdateUserRequest — обновление существующего пользователя без смены пароля.
type UpdateUserRequest struct {
	FullName               string          `json:"fullName"`
	Organization           string          `json:"organization"`
	Email                  string          `json:"email"`
	AccessLevel            string          `json:"accessLevel"`
	IsActive               bool            `json:"isActive"`
	RequirementFieldGrants map[string]bool `json:"requirementFieldGrants"`
}

func decodeUserGrantsJSON(raw string) map[string]bool {
	out := map[string]bool{}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "{}" {
		return out
	}
	_ = json.Unmarshal([]byte(raw), &out)
	return out
}

func encodeRequirementGrants(m map[string]bool) string {
	if len(m) == 0 {
		return "{}"
	}
	b, err := json.Marshal(m)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// mapAdminUser переводит модель пользователя в DTO для admin UI.
func mapAdminUser(user models.User) AdminUserResponse {
	return AdminUserResponse{
		ID:                     user.ID,
		FullName:               user.FullName,
		Organization:           user.Organization,
		Email:                  user.Email,
		AccessLevel:            user.AccessLevel,
		IsSuperuser:            user.IsSuperuser,
		IsActive:               user.IsActive,
		RequirementFieldGrants: decodeUserGrantsJSON(user.RequirementFieldGrants),
		CreatedAt:              user.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}

// ListUsers возвращает список пользователей.
func (h *UserHandler) ListUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Order("full_name asc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения пользователей"})
		return
	}

	result := make([]AdminUserResponse, 0, len(users))
	for _, user := range users {
		result = append(result, mapAdminUser(user))
	}

	c.JSON(http.StatusOK, result)
}

// CreateUser создаёт пользователя из административной панели.
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	fullName := strings.TrimSpace(req.FullName)
	organization := strings.TrimSpace(req.Organization)
	email := strings.TrimSpace(strings.ToLower(req.Email))
	password := req.Password
	accessLevel := strings.TrimSpace(req.AccessLevel)

	if fullName == "" || organization == "" || email == "" || password == "" || accessLevel == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните все обязательные поля"})
		return
	}

	if !isAllowedOrganization(organization) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректная организация"})
		return
	}

	if !isAllowedAccessLevel(accessLevel) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный уровень доступа"})
		return
	}

	if len(strings.TrimSpace(password)) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Пароль должен быть не короче 6 символов"})
		return
	}

	var existing models.User
	if err := h.db.Where("LOWER(email) = ?", email).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Пользователь с такой почтой уже существует"})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения пароля"})
		return
	}

	user := models.User{
		FullName:               fullName,
		Organization:           organization,
		Email:                  email,
		PasswordHash:           string(passwordHash),
		AccessLevel:            accessLevel,
		RequirementFieldGrants: encodeRequirementGrants(req.RequirementFieldGrants),
		IsActive:               req.IsActive,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания пользователя"})
		return
	}

	c.JSON(http.StatusCreated, mapAdminUser(user))
}

// UpdateUser обновляет пользователя из административной панели.
// ВАЖНО: пароль здесь НЕ меняется.
func (h *UserHandler) UpdateUser(c *gin.Context) {
	var user models.User
	if err := h.db.First(&user, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	fullName := strings.TrimSpace(req.FullName)
	organization := strings.TrimSpace(req.Organization)
	email := strings.TrimSpace(strings.ToLower(req.Email))
	accessLevel := strings.TrimSpace(req.AccessLevel)

	if fullName == "" || organization == "" || email == "" || accessLevel == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Заполните все обязательные поля"})
		return
	}

	if !isAllowedOrganization(organization) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректная организация"})
		return
	}

	if !isAllowedAccessLevel(accessLevel) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный уровень доступа"})
		return
	}

	var existing models.User
	if err := h.db.Where("LOWER(email) = ? AND id <> ?", email, user.ID).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Пользователь с такой почтой уже существует"})
		return
	}

	user.FullName = fullName
	user.Organization = organization
	user.Email = email
	user.AccessLevel = accessLevel
	user.IsActive = req.IsActive
	if req.RequirementFieldGrants != nil {
		user.RequirementFieldGrants = encodeRequirementGrants(req.RequirementFieldGrants)
	}

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления пользователя"})
		return
	}

	c.JSON(http.StatusOK, mapAdminUser(user))
}

// DeleteUser удаляет пользователя (нельзя удалить собственную учётную запись).
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный идентификатор"})
		return
	}

	rawActor, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
		return
	}
	actorID, ok := rawActor.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Не авторизован"})
		return
	}
	if actorID == uint(id) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Нельзя удалить собственную учётную запись"})
		return
	}

	var user models.User
	if err := h.db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	if err := h.db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка удаления пользователя"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь удалён"})
}
