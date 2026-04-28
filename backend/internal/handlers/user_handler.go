package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
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
	GKDirectoryGrants      map[string]bool `json:"gkDirectoryGrants,omitempty"`
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
	GKDirectoryGrants      map[string]bool `json:"gkDirectoryGrants"`
}

// UpdateUserRequest — обновление существующего пользователя без смены пароля.
type UpdateUserRequest struct {
	FullName               string          `json:"fullName"`
	Organization           string          `json:"organization"`
	Email                  string          `json:"email"`
	AccessLevel            string          `json:"accessLevel"`
	IsActive               bool            `json:"isActive"`
	RequirementFieldGrants map[string]bool `json:"requirementFieldGrants"`
	GKDirectoryGrants      map[string]bool `json:"gkDirectoryGrants"`
}

type UserImportResult struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors"`
}

type JiraAPIConfigResponse struct {
	UserEmail      string `json:"userEmail"`
	HasToken       bool   `json:"hasToken"`
	HasBearerToken bool   `json:"hasBearerToken"`
	PreferredAuth  string `json:"preferredAuth"`
}

type SaveJiraAPIConfigRequest struct {
	UserEmail     string `json:"userEmail"`
	APIToken      string `json:"apiToken"`
	BearerToken   string `json:"bearerToken"`
	PreferredAuth string `json:"preferredAuth"`
}

const jiraAPISettingsStorageKey = "jira_api_credentials"

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

func parseImportBool(value string) bool {
	v := strings.ToLower(strings.TrimSpace(value))
	switch v {
	case "1", "true", "да", "yes", "y":
		return true
	default:
		return false
	}
}

func parseCSVGrants(value string, allowed map[string]struct{}) map[string]bool {
	result := map[string]bool{}
	for _, part := range strings.Split(value, ",") {
		key := strings.TrimSpace(part)
		if key == "" {
			continue
		}
		if _, ok := allowed[key]; ok {
			result[key] = true
		}
	}
	return result
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
		GKDirectoryGrants:      decodeUserGrantsJSON(user.GKDirectoryGrants),
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
		GKDirectoryGrants:      encodeRequirementGrants(req.GKDirectoryGrants),
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
	if req.GKDirectoryGrants != nil {
		user.GKDirectoryGrants = encodeRequirementGrants(req.GKDirectoryGrants)
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

// ExportUsers выгружает пользователей и права в Excel.
func (h *UserHandler) ExportUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Order("full_name asc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения пользователей"})
		return
	}

	file := excelize.NewFile()
	const sheet = "Пользователи"
	file.SetSheetName(file.GetSheetName(0), sheet)

	headers := []string{
		"ФИО",
		"Организация",
		"Почта",
		"Уровень доступа",
		"Суперпользователь",
		"Активен",
		"Гранты карточки (CSV)",
		"Гранты ГК (CSV)",
		"Дата создания",
	}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = file.SetCellValue(sheet, cell, h)
	}

	for i, u := range users {
		row := i + 2
		reqGrants := decodeUserGrantsJSON(u.RequirementFieldGrants)
		gkGrants := decodeUserGrantsJSON(u.GKDirectoryGrants)
		reqKeys := make([]string, 0, len(reqGrants))
		for k, v := range reqGrants {
			if v {
				reqKeys = append(reqKeys, k)
			}
		}
		gkKeys := make([]string, 0, len(gkGrants))
		for k, v := range gkGrants {
			if v {
				gkKeys = append(gkKeys, k)
			}
		}
		values := []any{
			u.FullName,
			u.Organization,
			u.Email,
			u.AccessLevel,
			u.IsSuperuser,
			u.IsActive,
			strings.Join(reqKeys, ","),
			strings.Join(gkKeys, ","),
			u.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		for col, v := range values {
			cell, _ := excelize.CoordinatesToCellName(col+1, row)
			_ = file.SetCellValue(sheet, cell, v)
		}
	}

	buf, err := file.WriteToBuffer()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка формирования Excel"})
		return
	}
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", `attachment; filename="users_export.xlsx"`)
	c.Header("File-Name", "users_export.xlsx")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// ImportUsersFromExcel добавляет новых пользователей из Excel.
func (h *UserHandler) ImportUsersFromExcel(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не передан файл"})
		return
	}
	src, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не удалось открыть файл"})
		return
	}
	defer src.Close()
	data, err := io.ReadAll(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не удалось прочитать файл"})
		return
	}
	xl, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не удалось прочитать Excel. Используйте .xlsx"})
		return
	}
	defer func() { _ = xl.Close() }()

	sheet := xl.GetSheetName(0)
	if strings.TrimSpace(sheet) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "В файле отсутствует лист"})
		return
	}
	rows, err := xl.GetRows(sheet)
	if err != nil || len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "В файле нет данных для импорта"})
		return
	}

	headerMap := map[string]int{}
	for i, h := range rows[0] {
		headerMap[strings.ToLower(strings.TrimSpace(h))] = i
	}
	requiredHeaders := []string{"фио", "организация", "почта", "пароль", "уровень доступа"}
	for _, h := range requiredHeaders {
		if _, ok := headerMap[h]; !ok {
			c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("Не найдена колонка «%s»", h)})
			return
		}
	}

	get := func(cols []string, row []string) string {
		for _, col := range cols {
			if idx, ok := headerMap[col]; ok && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
		return ""
	}

	result := UserImportResult{Errors: []string{}}
	allowedReq := map[string]struct{}{
		"comment": {}, "shortName": {}, "initiator": {}, "responsible": {}, "sectionName": {},
		"proposalText": {}, "problemComment": {}, "discussionSummary": {}, "implementationQueue": {},
		"noteText": {}, "completedAt": {}, "ditOutgoing": {}, "attachments": {}, "deleteRequirement": {},
	}
	allowedGK := map[string]struct{}{
		"gkContractEdit": {}, "gkStageEdit": {}, "gkFunctionEdit": {},
	}

	for i, row := range rows[1:] {
		line := i + 2
		fullName := get([]string{"фио"}, row)
		organization := get([]string{"организация"}, row)
		email := strings.ToLower(get([]string{"почта", "email"}, row))
		password := get([]string{"пароль", "password"}, row)
		accessLevel := get([]string{"уровень доступа", "access level"}, row)
		isSuperuser := parseImportBool(get([]string{"суперпользователь", "superuser"}, row))
		isActive := true
		if val := get([]string{"активен", "is active"}, row); val != "" {
			isActive = parseImportBool(val)
		}

		if fullName == "" || organization == "" || email == "" || password == "" || accessLevel == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: заполните ФИО/Организация/Почта/Пароль/Уровень доступа", line))
			continue
		}
		if len(password) < 6 {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пароль должен быть не короче 6 символов", line))
			continue
		}
		if !isAllowedOrganization(organization) {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: некорректная организация", line))
			continue
		}
		if !isAllowedAccessLevel(accessLevel) {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: некорректный уровень доступа", line))
			continue
		}

		var existing models.User
		if err := h.db.Where("LOWER(email) = ?", email).First(&existing).Error; err == nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пользователь с почтой %s уже существует", line, email))
			continue
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка хеширования пароля", line))
			continue
		}

		reqGrants := parseCSVGrants(get([]string{"гранты карточки (csv)", "гранты карточки"}, row), allowedReq)
		gkGrants := parseCSVGrants(get([]string{"гранты гк (csv)", "гранты гк"}, row), allowedGK)
		if accessLevel != "edit" && !isSuperuser {
			gkGrants = map[string]bool{}
		}
		if accessLevel == "read" {
			delete(reqGrants, "deleteRequirement")
		}

		user := models.User{
			FullName:               fullName,
			Organization:           organization,
			Email:                  email,
			PasswordHash:           string(passwordHash),
			AccessLevel:            accessLevel,
			IsSuperuser:            isSuperuser,
			IsActive:               isActive,
			RequirementFieldGrants: encodeRequirementGrants(reqGrants),
			GKDirectoryGrants:      encodeRequirementGrants(gkGrants),
		}
		if err := h.db.Create(&user).Error; err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка создания пользователя", line))
			continue
		}
		result.Created++
	}

	c.JSON(http.StatusOK, result)
}

// GetJiraAPIConfig — возвращает сохраненную конфигурацию Jira API (без токена).
func (h *UserHandler) GetJiraAPIConfig(c *gin.Context) {
	var setting models.AppSetting
	if err := h.db.Where("key = ?", jiraAPISettingsStorageKey).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, JiraAPIConfigResponse{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения Jira настроек"})
		return
	}

	var payload SaveJiraAPIConfigRequest
	if err := json.Unmarshal([]byte(setting.Value), &payload); err != nil {
		c.JSON(http.StatusOK, JiraAPIConfigResponse{})
		return
	}

	c.JSON(http.StatusOK, JiraAPIConfigResponse{
		UserEmail:      strings.TrimSpace(payload.UserEmail),
		HasToken:       strings.TrimSpace(payload.APIToken) != "",
		HasBearerToken: strings.TrimSpace(payload.BearerToken) != "",
		PreferredAuth:  strings.TrimSpace(payload.PreferredAuth),
	})
}

// SaveJiraAPIConfig — сохраняет глобальные Jira credentials для всех пользователей.
func (h *UserHandler) SaveJiraAPIConfig(c *gin.Context) {
	var req SaveJiraAPIConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	req.UserEmail = strings.TrimSpace(strings.ToLower(req.UserEmail))
	req.APIToken = strings.TrimSpace(req.APIToken)
	req.BearerToken = strings.TrimSpace(req.BearerToken)
	req.PreferredAuth = strings.TrimSpace(strings.ToLower(req.PreferredAuth))
	if req.PreferredAuth == "" {
		if req.BearerToken != "" {
			req.PreferredAuth = "bearer"
		} else {
			req.PreferredAuth = "basic"
		}
	}
	if req.PreferredAuth != "bearer" && req.PreferredAuth != "basic" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный тип авторизации Jira"})
		return
	}
	if req.PreferredAuth == "bearer" && req.BearerToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Укажите Bearer PAT Jira"})
		return
	}
	if req.PreferredAuth == "basic" && (req.UserEmail == "" || req.APIToken == "") {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Укажите логин/email и API token Jira"})
		return
	}

	raw, err := json.Marshal(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения Jira настроек"})
		return
	}

	var setting models.AppSetting
	if err := h.db.Where("key = ?", jiraAPISettingsStorageKey).First(&setting).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			item := models.AppSetting{
				Key:   jiraAPISettingsStorageKey,
				Value: string(raw),
			}
			if createErr := h.db.Create(&item).Error; createErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения Jira настроек"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения Jira настроек"})
			return
		}
	} else {
		setting.Value = string(raw)
		if saveErr := h.db.Save(&setting).Error; saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения Jira настроек"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jira API подключена"})
}
