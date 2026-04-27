package handlers

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"requirements-app/backend/internal/config"
	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ContractDirectoryHandler struct {
	db              *gorm.DB
	jiraBaseURL     string
	jiraBearerToken string
	jiraUserEmail   string
	jiraAPIToken    string
	httpClient      *http.Client
}

func NewContractDirectoryHandler(db *gorm.DB, cfg *config.Config) *ContractDirectoryHandler {
	return &ContractDirectoryHandler{
		db:              db,
		jiraBaseURL:     strings.TrimRight(strings.TrimSpace(cfg.JiraBaseURL), "/"),
		jiraBearerToken: strings.TrimSpace(cfg.JiraBearerToken),
		jiraUserEmail:   strings.TrimSpace(cfg.JiraUserEmail),
		jiraAPIToken:    strings.TrimSpace(cfg.JiraAPIToken),
		httpClient:      &http.Client{Timeout: 12 * time.Second},
	}
}

type CreateContractRequest struct {
	Name                 string `json:"name"`
	ShortName            string `json:"shortName"`
	UseShortNameInTaskID bool   `json:"useShortNameInTaskId"`
	Description          string `json:"description"`
}

type UpdateContractRequest struct {
	Name                 string `json:"name"`
	ShortName            string `json:"shortName"`
	UseShortNameInTaskID bool   `json:"useShortNameInTaskId"`
	Description          string `json:"description"`
	// Если задано — смена признака «в архиве» (is_active в БД).
	IsActive *bool `json:"isActive,omitempty"`
}

type ContractStageRequest struct {
	StageNumber int    `json:"stageNumber"`
	StageName   string `json:"stageName"`
}

type UpdateContractStageRequest struct {
	StageName string `json:"stageName"`
}

type ContractTZFunctionRequest struct {
	StageNumber        int      `json:"stageNumber"`
	FunctionName       string   `json:"functionName"`
	NMCKFunctionNumber string   `json:"nmckFunctionNumber"`
	TZSectionNumber    string   `json:"tzSectionNumber"`
	JiraLink           string   `json:"jiraLink"`
	ConfluenceLinks    []string `json:"confluenceLinks"`
	JiraEpicLinks      []string `json:"jiraEpicLinks"`
}

type FunctionRequirementsRequest struct {
	RequirementIDs []uint `json:"requirementIds"`
}

type JiraEpicPreviewRequest struct {
	Links []string `json:"links"`
}

type JiraEpicStatusItem struct {
	Link           string `json:"link"`
	EpicKey        string `json:"epicKey"`
	Summary        string `json:"summary"`
	Status         string `json:"status"`
	StatusCategory string `json:"statusCategory"`
	SyncStatus     string `json:"syncStatus"`
	Error          string `json:"error,omitempty"`
}

type JiraEpicStatusesFunctionItem struct {
	FunctionID uint                 `json:"functionId"`
	Epics      []JiraEpicStatusItem `json:"epics"`
}

type GKImportResult struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors"`
}

func normalizeContractExcelHeader(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, "\n", " ")
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.Join(strings.Fields(value), " ")
	return value
}

func getContractExcelCell(row []string, headerMap map[string]int, keys ...string) string {
	for _, key := range keys {
		if idx, ok := headerMap[normalizeContractExcelHeader(key)]; ok {
			if idx >= 0 && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
	}
	return ""
}

func extractIntFromAny(value string) (int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, fmt.Errorf("пустое значение")
	}

	// Ищем последовательность цифр в любом тексте (например, "этап 1").
	var b strings.Builder
	for _, r := range value {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	s := strings.TrimSpace(b.String())
	if s == "" {
		return 0, fmt.Errorf("не удалось извлечь число")
	}
	return strconv.Atoi(s)
}

func normalizeLinks(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, raw := range values {
		v := strings.TrimSpace(raw)
		if v == "" {
			continue
		}
		key := strings.ToLower(v)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, v)
	}
	return out
}

func standardStageName(stageNumber int) string {
	return fmt.Sprintf("Этап %d", stageNumber)
}

func (h *ContractDirectoryHandler) ensureContractExists(contractName string) (*models.ContractDictionary, error) {
	contractName = strings.TrimSpace(contractName)
	if contractName == "" {
		return nil, nil
	}

	var existing models.ContractDictionary
	err := h.db.Where("LOWER(name) = LOWER(?)", contractName).First(&existing).Error
	if err == nil {
		if existing.Name != contractName {
			existing.Name = contractName
			if err := h.db.Save(&existing).Error; err != nil {
				return nil, err
			}
		}
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	item := models.ContractDictionary{
		Name:        contractName,
		Description: "",
		IsActive:    true,
	}
	if err := h.db.Create(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (h *ContractDirectoryHandler) ensureContractStageExists(contractID uint, stageNumber int, stageName string) (*models.ContractStage, error) {
	if stageNumber <= 0 {
		return nil, fmt.Errorf("stageNumber должен быть > 0")
	}
	if strings.TrimSpace(stageName) == "" {
		stageName = standardStageName(stageNumber)
	}

	var existing models.ContractStage
	err := h.db.Where("contract_id = ? AND stage_number = ?", contractID, stageNumber).First(&existing).Error
	if err == nil {
		// При необходимости обновим отображаемое имя этапа.
		if existing.StageName != stageName {
			existing.StageName = stageName
			if err := h.db.Save(&existing).Error; err != nil {
				return nil, err
			}
		}
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	item := models.ContractStage{
		ContractID:  contractID,
		StageNumber: stageNumber,
		StageName:   stageName,
	}
	if err := h.db.Create(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

// GET /api/contracts/:id
func (h *ContractDirectoryHandler) GetContractDetails(c *gin.Context) {
	var contract models.ContractDictionary
	if err := h.db.First(&contract, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "ГК не найден"})
		return
	}

	var stages []models.ContractStage
	if err := h.db.
		Where("contract_id = ?", contract.ID).
		Order("stage_number asc").
		Preload("Functions", func(db *gorm.DB) *gorm.DB {
			return db.Order("nmck_function_number asc")
		}).
		Find(&stages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения этапов ГК"})
		return
	}

	// Возвращаем timestamp в виде ISO-строки.
	type contractDTO struct {
		ID                   uint                   `json:"id"`
		Name                 string                 `json:"name"`
		ShortName            string                 `json:"shortName"`
		UseShortNameInTaskID bool                   `json:"useShortNameInTaskId"`
		Description          string                 `json:"description"`
		IsActive             bool                   `json:"isActive"`
		CreatedAt            string                 `json:"createdAt"`
		Stages               []models.ContractStage `json:"stages"`
	}

	c.JSON(http.StatusOK, contractDTO{
		ID:                   contract.ID,
		Name:                 contract.Name,
		ShortName:            contract.ShortName,
		UseShortNameInTaskID: contract.UseShortNameInTaskID,
		Description:          contract.Description,
		IsActive:             contract.IsActive,
		CreatedAt:            contract.CreatedAt.Format("2006-01-02 15:04:05"),
		Stages:               stages,
	})
}

// POST /api/contracts
func (h *ContractDirectoryHandler) CreateContract(c *gin.Context) {
	var req CreateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Наименование ГК обязательно"})
		return
	}

	existing, err := h.ensureContractExists(req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания ГК"})
		return
	}

	// If exists - обновляем описание и поля краткого наименования.
	if existing != nil {
		existing.Description = strings.TrimSpace(req.Description)
		existing.ShortName = strings.TrimSpace(req.ShortName)
		existing.UseShortNameInTaskID = req.UseShortNameInTaskID
		if err := h.db.Save(existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления ГК"})
			return
		}
		c.JSON(http.StatusOK, existing)
		return
	}

	item := models.ContractDictionary{
		Name:                 req.Name,
		ShortName:            strings.TrimSpace(req.ShortName),
		UseShortNameInTaskID: req.UseShortNameInTaskID,
		Description:          strings.TrimSpace(req.Description),
		IsActive:             true,
	}
	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания ГК"})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// PUT /api/contracts/:id
func (h *ContractDirectoryHandler) UpdateContract(c *gin.Context) {
	var req UpdateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	var contract models.ContractDictionary
	if err := h.db.First(&contract, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "ГК не найден"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Наименование ГК обязательно"})
		return
	}

	contract.Name = req.Name
	contract.ShortName = strings.TrimSpace(req.ShortName)
	contract.UseShortNameInTaskID = req.UseShortNameInTaskID
	contract.Description = strings.TrimSpace(req.Description)
	if req.IsActive != nil {
		contract.IsActive = *req.IsActive
	}

	if err := h.db.Save(&contract).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления ГК"})
		return
	}

	c.JSON(http.StatusOK, contract)
}

// POST /api/contracts/:id/stages
func (h *ContractDirectoryHandler) CreateStage(c *gin.Context) {
	var req ContractStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	if req.StageNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Номер этапа должен быть > 0"})
		return
	}

	var contract models.ContractDictionary
	if err := h.db.First(&contract, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "ГК не найден"})
		return
	}

	stage, err := h.ensureContractStageExists(contract.ID, req.StageNumber, req.StageName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания этапа"})
		return
	}

	c.JSON(http.StatusOK, stage)
}

// PUT /api/contracts/:id/stages/:stageNumber
func (h *ContractDirectoryHandler) UpdateStage(c *gin.Context) {
	var req UpdateContractStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	contractIDStr := strings.TrimSpace(c.Param("id"))
	contractID64, err := strconv.ParseUint(contractIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	stageNumber, err := extractIntFromAny(c.Param("stageNumber"))
	if err != nil || stageNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный номер этапа"})
		return
	}

	var stage models.ContractStage
	if err := h.db.
		Where("contract_id = ? AND stage_number = ?", uint(contractID64), stageNumber).
		First(&stage).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Этап не найден"})
		return
	}

	name := strings.TrimSpace(req.StageName)
	if name == "" {
		name = standardStageName(stage.StageNumber)
	}
	stage.StageName = name
	if err := h.db.Save(&stage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления этапа"})
		return
	}

	c.JSON(http.StatusOK, stage)
}

// POST /api/contracts/:id/functions
func (h *ContractDirectoryHandler) UpsertTZFunction(c *gin.Context) {
	var req ContractTZFunctionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	req.FunctionName = strings.TrimSpace(req.FunctionName)
	req.TZSectionNumber = strings.TrimSpace(req.TZSectionNumber)
	if req.StageNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Этап должен быть > 0"})
		return
	}
	if req.FunctionName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Наименование функции обязательно"})
		return
	}
	req.NMCKFunctionNumber = strings.TrimSpace(req.NMCKFunctionNumber)
	req.ConfluenceLinks = normalizeLinks(req.ConfluenceLinks)
	req.JiraEpicLinks = normalizeLinks(req.JiraEpicLinks)
	if req.NMCKFunctionNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Номер функции по НМЦК обязателен"})
		return
	}
	if req.TZSectionNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Номер раздела по ТЗ обязателен"})
		return
	}

	var contract models.ContractDictionary
	if err := h.db.First(&contract, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "ГК не найден"})
		return
	}

	stage, err := h.ensureContractStageExists(contract.ID, req.StageNumber, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания этапа"})
		return
	}

	var existing models.ContractTZFunction
	err = h.db.
		Where("contract_stage_id = ? AND nmck_function_number = ? AND tz_section_number = ?", stage.ID, req.NMCKFunctionNumber, req.TZSectionNumber).
		First(&existing).Error
	if err == nil {
		existing.FunctionName = req.FunctionName
		existing.JiraLink = strings.TrimSpace(req.JiraLink)
		existing.ConfluenceLinks = req.ConfluenceLinks
		existing.JiraEpicLinks = req.JiraEpicLinks
		if err := h.db.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления функции"})
			return
		}
		c.JSON(http.StatusOK, existing)
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка поиска функции"})
		return
	}

	item := models.ContractTZFunction{
		ContractID:         contract.ID,
		ContractStageID:    stage.ID,
		FunctionName:       req.FunctionName,
		NMCKFunctionNumber: req.NMCKFunctionNumber,
		TZSectionNumber:    req.TZSectionNumber,
		JiraLink:           strings.TrimSpace(req.JiraLink),
		ConfluenceLinks:    req.ConfluenceLinks,
		JiraEpicLinks:      req.JiraEpicLinks,
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания функции"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *ContractDirectoryHandler) ImportTZFunctionsFromExcel(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файл не передан"})
		return
	}

	contractIDStr := strings.TrimSpace(c.PostForm("contractId"))
	var contractID uint
	if contractIDStr != "" {
		n, err := strconv.ParseUint(contractIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
			return
		}
		contractID = uint(n)
	}

	// Validate provided contractId (optional).
	if contractID > 0 {
		var tmp models.ContractDictionary
		if err := h.db.First(&tmp, contractID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "contractId не найден"})
			return
		}
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не удалось открыть файл"})
		return
	}
	defer src.Close()

	xl, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не удалось прочитать Excel. Используйте .xlsx"})
		return
	}
	defer func() { _ = xl.Close() }()

	sheets := xl.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "В Excel нет листов"})
		return
	}

	rows, err := xl.GetRows(sheets[0])
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Не удалось прочитать строки Excel"})
		return
	}

	if len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файл пустой или содержит только заголовки"})
		return
	}

	headerMap := map[string]int{}
	for i, col := range rows[0] {
		headerMap[normalizeContractExcelHeader(col)] = i
	}

	result := GKImportResult{Errors: make([]string, 0)}

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		lineNumber := i + 1

		// Skip empty row.
		isEmpty := true
		for _, cell := range row {
			if strings.TrimSpace(cell) != "" {
				isEmpty = false
				break
			}
		}
		if isEmpty {
			continue
		}

		contractName := ""
		if contractID == 0 {
			contractName = getContractExcelCell(row, headerMap,
				"ГК",
				"Контракт",
				"Государственный контракт",
				"Наименование ГК",
			)
			if strings.TrimSpace(contractName) == "" {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пустое ГК", lineNumber))
				continue
			}
		}

		stageNumberStr := getContractExcelCell(row, headerMap,
			"Этап",
			"Номер этапа",
			"Этап №",
		)
		stageNumber, err := extractIntFromAny(stageNumberStr)
		if err != nil || stageNumber <= 0 {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: некорректный Этап", lineNumber))
			continue
		}

		functionName := getContractExcelCell(row, headerMap,
			"Наименование функции",
			"Функция",
			"Наименование",
		)
		functionName = strings.TrimSpace(functionName)
		if functionName == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пустое Наименование функции", lineNumber))
			continue
		}

		nmckNumberStr := getContractExcelCell(row, headerMap,
			"Номер функции по НМЦК",
			"НМЦК",
			"Номер функции",
		)
		nmckNumber := strings.TrimSpace(nmckNumberStr)
		if nmckNumber == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пустой Номер функции по НМЦК", lineNumber))
			continue
		}

		tzSectionNumber := getContractExcelCell(row, headerMap,
			"Номер раздела по ТЗ",
			"Номер раздела ТЗ",
			"Раздел по ТЗ",
			"Номер раздела",
		)
		tzSectionNumber = strings.TrimSpace(tzSectionNumber)
		if tzSectionNumber == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пустой Номер раздела по ТЗ", lineNumber))
			continue
		}

		contract, err := func() (*models.ContractDictionary, error) {
			if contractID > 0 {
				var c models.ContractDictionary
				if err := h.db.First(&c, contractID).Error; err != nil {
					return nil, err
				}
				return &c, nil
			}
			return h.ensureContractExists(contractName)
		}()
		if err != nil || contract == nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка сохранения ГК", lineNumber))
			continue
		}

		stage, err := h.ensureContractStageExists(contract.ID, stageNumber, "")
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка сохранения этапа", lineNumber))
			continue
		}

		var existing models.ContractTZFunction
		err = h.db.
			Where("contract_stage_id = ? AND nmck_function_number = ? AND tz_section_number = ?", stage.ID, nmckNumber, tzSectionNumber).
			First(&existing).Error
		if err == nil {
			existing.FunctionName = functionName
			existing.JiraLink = strings.TrimSpace(getContractExcelCell(row, headerMap,
				"Ссылка jira",
				"ссылка jira",
				"jira",
				"Jira",
				"Ссылка на jira",
			))
			if err := h.db.Save(&existing).Error; err != nil {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка обновления функции", lineNumber))
				continue
			}
			result.Updated++
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка поиска функции", lineNumber))
			continue
		}

		jiraLink := strings.TrimSpace(getContractExcelCell(row, headerMap,
			"Ссылка jira",
			"ссылка jira",
			"jira",
			"Jira",
			"Ссылка на jira",
		))

		item := models.ContractTZFunction{
			ContractID:         contract.ID,
			ContractStageID:    stage.ID,
			FunctionName:       functionName,
			NMCKFunctionNumber: nmckNumber,
			TZSectionNumber:    tzSectionNumber,
			JiraLink:           jiraLink,
		}

		if err := h.db.Create(&item).Error; err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка создания функции", lineNumber))
			continue
		}
		result.Created++
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/contracts/:id/stages
func (h *ContractDirectoryHandler) ListStages(c *gin.Context) {
	var stages []models.ContractStage
	if err := h.db.
		Where("contract_id = ?", c.Param("id")).
		Order("stage_number asc").
		Find(&stages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения этапов ГК"})
		return
	}
	c.JSON(http.StatusOK, stages)
}

// GET /api/contracts/:id/stages/:stageNumber/functions
func (h *ContractDirectoryHandler) ListFunctionsForStage(c *gin.Context) {
	contractIDStr := strings.TrimSpace(c.Param("id"))
	stageNumberStr := strings.TrimSpace(c.Param("stageNumber"))

	contractID64, err := strconv.ParseUint(contractIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	stageNumber, err := extractIntFromAny(stageNumberStr)
	if err != nil || stageNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный номер этапа"})
		return
	}

	var stage models.ContractStage
	if err := h.db.
		Where("contract_id = ? AND stage_number = ?", uint(contractID64), stageNumber).
		First(&stage).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Этап не найден"})
		return
	}

	var functions []models.ContractTZFunction
	if err := h.db.
		Where("contract_stage_id = ?", stage.ID).
		Order("id asc").
		Find(&functions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения функций ТЗ"})
		return
	}

	c.JSON(http.StatusOK, functions)
}

func (h *ContractDirectoryHandler) functionByContractAndID(contractID uint, functionID uint) (*models.ContractTZFunction, error) {
	var fn models.ContractTZFunction
	if err := h.db.First(&fn, functionID).Error; err != nil {
		return nil, err
	}
	if fn.ContractID != contractID {
		return nil, gorm.ErrRecordNotFound
	}
	return &fn, nil
}

var jiraEpicKeyRegex = regexp.MustCompile(`[A-Z][A-Z0-9]+-\d+`)

func extractJiraEpicKey(value string) string {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return ""
	}
	up := strings.ToUpper(raw)
	if jiraEpicKeyRegex.MatchString(up) {
		return jiraEpicKeyRegex.FindString(up)
	}
	return ""
}

func normalizeJiraEpicLinks(fn models.ContractTZFunction) []string {
	links := make([]string, 0, len(fn.JiraEpicLinks)+1)
	links = append(links, normalizeLinks(fn.JiraEpicLinks)...)
	legacy := strings.TrimSpace(fn.JiraLink)
	if legacy != "" {
		links = append(links, legacy)
	}
	return normalizeLinks(links)
}

type jiraIssueResponse struct {
	Fields struct {
		Summary string `json:"summary"`
		Status  struct {
			Name           string `json:"name"`
			StatusCategory struct {
				Name string `json:"name"`
			} `json:"statusCategory"`
		} `json:"status"`
	} `json:"fields"`
}

func (h *ContractDirectoryHandler) fetchJiraEpicIssue(epicKey string) (*jiraIssueResponse, error) {
	if h.jiraBaseURL == "" {
		return nil, fmt.Errorf("не задан JIRA_BASE_URL")
	}
	url := fmt.Sprintf("%s/rest/api/2/issue/%s?fields=summary,status", h.jiraBaseURL, epicKey)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	if h.jiraBearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+h.jiraBearerToken)
	} else if h.jiraUserEmail != "" && h.jiraAPIToken != "" {
		token := base64.StdEncoding.EncodeToString([]byte(h.jiraUserEmail + ":" + h.jiraAPIToken))
		req.Header.Set("Authorization", "Basic "+token)
	} else {
		return nil, fmt.Errorf("не заданы креды Jira")
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jira вернула статус %d", resp.StatusCode)
	}

	var out jiraIssueResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (h *ContractDirectoryHandler) buildJiraEpicStatusByLink(link string) JiraEpicStatusItem {
	cleanLink := strings.TrimSpace(link)
	key := extractJiraEpicKey(cleanLink)
	if key == "" {
		return JiraEpicStatusItem{
			Link:       cleanLink,
			SyncStatus: "error",
			Error:      "Не удалось извлечь key эпика из ссылки",
		}
	}
	issue, err := h.fetchJiraEpicIssue(key)
	if err != nil {
		return JiraEpicStatusItem{
			Link:       cleanLink,
			EpicKey:    key,
			SyncStatus: "error",
			Error:      err.Error(),
		}
	}
	return JiraEpicStatusItem{
		Link:           cleanLink,
		EpicKey:        key,
		Summary:        strings.TrimSpace(issue.Fields.Summary),
		Status:         strings.TrimSpace(issue.Fields.Status.Name),
		StatusCategory: strings.TrimSpace(issue.Fields.Status.StatusCategory.Name),
		SyncStatus:     "synced",
	}
}

// POST /api/contracts/jira-epic-status-preview
func (h *ContractDirectoryHandler) PreviewJiraEpicStatuses(c *gin.Context) {
	var req JiraEpicPreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}
	links := normalizeLinks(req.Links)
	if len(links) == 0 {
		c.JSON(http.StatusOK, gin.H{"items": []JiraEpicStatusItem{}})
		return
	}
	items := make([]JiraEpicStatusItem, 0, len(links))
	for _, link := range links {
		items = append(items, h.buildJiraEpicStatusByLink(link))
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// GET /api/contracts/:id/stages/:stageNumber/functions/jira-epic-statuses
func (h *ContractDirectoryHandler) GetJiraEpicStatusesForStageFunctions(c *gin.Context) {
	contractID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	stageNumber, err := extractIntFromAny(strings.TrimSpace(c.Param("stageNumber")))
	if err != nil || stageNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный номер этапа"})
		return
	}

	var stage models.ContractStage
	if err := h.db.
		Where("contract_id = ? AND stage_number = ?", uint(contractID64), stageNumber).
		First(&stage).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Этап не найден"})
		return
	}

	var functions []models.ContractTZFunction
	if err := h.db.
		Where("contract_stage_id = ?", stage.ID).
		Order("id asc").
		Find(&functions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения функций ТЗ"})
		return
	}

	out := make([]JiraEpicStatusesFunctionItem, 0, len(functions))
	for _, fn := range functions {
		item := JiraEpicStatusesFunctionItem{
			FunctionID: fn.ID,
			Epics:      make([]JiraEpicStatusItem, 0),
		}
		for _, link := range normalizeJiraEpicLinks(fn) {
			item.Epics = append(item.Epics, h.buildJiraEpicStatusByLink(link))
		}
		out = append(out, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"items": out,
	})
}

// GET /api/contracts/:id/functions/:functionId/requirements
func (h *ContractDirectoryHandler) ListFunctionRequirements(c *gin.Context) {
	contractID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	functionID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("functionId")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный functionId"})
		return
	}
	if _, err := h.functionByContractAndID(uint(contractID64), uint(functionID64)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Функция ТЗ не найдена"})
		return
	}

	var items []models.Requirement
	if err := h.db.
		Where("contract_tz_function_id = ?", uint(functionID64)).
		Order("updated_at desc").
		Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения связанных предложений"})
		return
	}
	c.JSON(http.StatusOK, items)
}

// POST /api/contracts/:id/functions/:functionId/requirements/bind
func (h *ContractDirectoryHandler) BindRequirementsToFunction(c *gin.Context) {
	contractID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	functionID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("functionId")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный functionId"})
		return
	}
	var req FunctionRequirementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}
	if len(req.RequirementIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Список предложений пуст"})
		return
	}

	fn, err := h.functionByContractAndID(uint(contractID64), uint(functionID64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Функция ТЗ не найдена"})
		return
	}
	var contract models.ContractDictionary
	if err := h.db.First(&contract, fn.ContractID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "ГК не найдена"})
		return
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")
	res := h.db.Model(&models.Requirement{}).
		Where("id IN ?", req.RequirementIDs).
		Updates(map[string]interface{}{
			"contract_name":           contract.Name,
			"contract_tz_function_id": fn.ID,
			"tz_point_text":           strings.TrimSpace(fn.TZSectionNumber),
			"nmck_point_text":         strings.TrimSpace(fn.NMCKFunctionNumber),
			"last_edited_by":          userName,
			"last_edited_org":         userOrg,
		})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка привязки предложений"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": res.RowsAffected})
}

// POST /api/contracts/:id/functions/:functionId/requirements/unbind
func (h *ContractDirectoryHandler) UnbindRequirementsFromFunction(c *gin.Context) {
	contractID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	functionID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("functionId")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный functionId"})
		return
	}
	var req FunctionRequirementsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}
	if len(req.RequirementIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Список предложений пуст"})
		return
	}

	fn, err := h.functionByContractAndID(uint(contractID64), uint(functionID64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Функция ТЗ не найдена"})
		return
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")
	res := h.db.Model(&models.Requirement{}).
		Where("id IN ?", req.RequirementIDs).
		Where("contract_tz_function_id = ?", fn.ID).
		Updates(map[string]interface{}{
			"contract_name":           "",
			"contract_tz_function_id": nil,
			"tz_point_text":           "",
			"nmck_point_text":         "",
			"last_edited_by":          userName,
			"last_edited_org":         userOrg,
		})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка отвязки предложений"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": res.RowsAffected})
}

type ContractAttachmentItem struct {
	ID               uint      `json:"id"`
	ContractID       uint      `json:"contractId"`
	Type             string    `json:"type"`
	OriginalFileName string    `json:"originalFileName"`
	CreatedAt        time.Time `json:"createdAt"`
}

// GET /api/contracts/:id/attachments
func (h *ContractDirectoryHandler) ListContractAttachments(c *gin.Context) {
	var attachments []models.ContractAttachment
	if err := h.db.
		Where("contract_id = ?", c.Param("id")).
		Order("created_at desc").
		Find(&attachments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения вложений"})
		return
	}

	// Сокращаем ответ, чтобы фронту не приходилось скрывать лишнее.
	out := make([]ContractAttachmentItem, 0, len(attachments))
	for _, a := range attachments {
		out = append(out, ContractAttachmentItem{
			ID:               a.ID,
			ContractID:       a.ContractID,
			Type:             a.Type,
			OriginalFileName: a.OriginalFileName,
			CreatedAt:        a.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, out)
}

func isAllowedContractAttachmentExt(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".docx", ".xls", ".xlsx", ".xlsm", ".doc", ".pdf", ".msg", ".pst":
		return true
	default:
		return false
	}
}

// POST /api/contracts/:id/attachments
func (h *ContractDirectoryHandler) UploadContractAttachments(c *gin.Context) {
	contractIDStr := strings.TrimSpace(c.Param("id"))
	contractID64, err := strconv.ParseUint(contractIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}

	attachmentType := strings.TrimSpace(c.PostForm("type")) // tz / nmck
	if attachmentType != "tz" && attachmentType != "nmck" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный тип вложения"})
		return
	}

	// Gin collects multipart in memory/spool; we just write the file to disk.
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файлы не переданы"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		// fallback: support single file key
		files = form.File["file"]
	}
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файлы не переданы"})
		return
	}

	// Ensure target directory exists.
	baseDir := filepath.Join(".", "uploads", "contracts", contractIDStr, attachmentType)
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать директорию для файлов"})
		return
	}

	created := 0
	for _, fh := range files {
		if fh == nil {
			continue
		}
		if !isAllowedContractAttachmentExt(fh.Filename) {
			// Skip silently? Prefer fail-fast with explicit error.
			c.JSON(http.StatusBadRequest, gin.H{"message": "Неподдерживаемое расширение файла: " + fh.Filename})
			return
		}

		ext := filepath.Ext(fh.Filename)
		original := filepath.Base(fh.Filename)
		storedName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), strings.TrimSuffix(original, ext), ext)
		storedPath := filepath.Join(baseDir, storedName)

		// Store file to disk.
		src, err := fh.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось прочитать файл: " + original})
			return
		}

		dst, err := os.Create(storedPath)
		if err != nil {
			_ = src.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось сохранить файл: " + original})
			return
		}

		_, copyErr := io.Copy(dst, src)
		_ = dst.Close()
		_ = src.Close()
		if copyErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка записи файла: " + original})
			return
		}

		contentType := fh.Header.Get("Content-Type")
		if strings.TrimSpace(contentType) == "" {
			contentType = "application/octet-stream"
		}

		attachment := models.ContractAttachment{
			ContractID:       uint(contractID64),
			Type:             attachmentType,
			OriginalFileName: original,
			StoredFileName:   storedName,
			ContentType:      contentType,
			FilePath:         storedPath,
		}
		if err := h.db.Create(&attachment).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения записи вложения"})
			return
		}

		created++
	}

	c.JSON(http.StatusOK, gin.H{
		"created": created,
	})
}

// GET /api/contracts/attachments/:attachmentId/download
func (h *ContractDirectoryHandler) DownloadContractAttachment(c *gin.Context) {
	attachmentIDStr := strings.TrimSpace(c.Param("attachmentId"))
	attachmentID64, err := strconv.ParseUint(attachmentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный attachmentId"})
		return
	}

	var a models.ContractAttachment
	if err := h.db.First(&a, uint(attachmentID64)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Вложение не найдено"})
		return
	}

	if strings.TrimSpace(a.FilePath) == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Файл не найден на сервере"})
		return
	}

	// Set download headers.
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", a.OriginalFileName))
	if a.ContentType != "" {
		c.Header("Content-Type", a.ContentType)
	}

	c.File(a.FilePath)
}

// deleteAttachmentFile удаляет файл с диска; ошибки отсутствия файла игнорируются.
func deleteAttachmentFile(path string) {
	if strings.TrimSpace(path) == "" {
		return
	}
	_ = os.Remove(path)
}

// DELETE /api/contracts/:id
func (h *ContractDirectoryHandler) DeleteContract(c *gin.Context) {
	var contract models.ContractDictionary
	if err := h.db.First(&contract, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "ГК не найден"})
		return
	}

	contractID := contract.ID

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var fnIDs []uint
		if err := tx.Model(&models.ContractTZFunction{}).
			Where("contract_id = ?", contractID).
			Pluck("id", &fnIDs).Error; err != nil {
			return err
		}
		if len(fnIDs) > 0 {
			if err := tx.Model(&models.Requirement{}).
				Where("contract_tz_function_id IN ?", fnIDs).
				Update("contract_tz_function_id", nil).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("contract_id = ?", contractID).Delete(&models.ContractTZFunction{}).Error; err != nil {
			return err
		}
		if err := tx.Where("contract_id = ?", contractID).Delete(&models.ContractStage{}).Error; err != nil {
			return err
		}

		var attachments []models.ContractAttachment
		if err := tx.Where("contract_id = ?", contractID).Find(&attachments).Error; err != nil {
			return err
		}
		for _, a := range attachments {
			deleteAttachmentFile(a.FilePath)
		}
		if err := tx.Where("contract_id = ?", contractID).Delete(&models.ContractAttachment{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&contract).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить ГК"})
		return
	}

	baseDir := filepath.Join(".", "uploads", "contracts", fmt.Sprintf("%d", contractID))
	_ = os.RemoveAll(baseDir)

	c.JSON(http.StatusOK, gin.H{"message": "ГК удалён"})
}

// DELETE /api/contracts/:id/stages/:stageNumber
func (h *ContractDirectoryHandler) DeleteStage(c *gin.Context) {
	contractIDStr := strings.TrimSpace(c.Param("id"))
	contractID64, err := strconv.ParseUint(contractIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	stageNumber, err := extractIntFromAny(c.Param("stageNumber"))
	if err != nil || stageNumber <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный номер этапа"})
		return
	}

	var stage models.ContractStage
	if err := h.db.
		Where("contract_id = ? AND stage_number = ?", uint(contractID64), stageNumber).
		First(&stage).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Этап не найден"})
		return
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		var fnIDs []uint
		if err := tx.Model(&models.ContractTZFunction{}).
			Where("contract_stage_id = ?", stage.ID).
			Pluck("id", &fnIDs).Error; err != nil {
			return err
		}
		if len(fnIDs) > 0 {
			if err := tx.Model(&models.Requirement{}).
				Where("contract_tz_function_id IN ?", fnIDs).
				Update("contract_tz_function_id", nil).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("contract_stage_id = ?", stage.ID).Delete(&models.ContractTZFunction{}).Error; err != nil {
			return err
		}
		return tx.Delete(&stage).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить этап"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Этап удалён"})
}

// DELETE /api/contracts/:id/functions/:functionId
func (h *ContractDirectoryHandler) DeleteTZFunction(c *gin.Context) {
	contractIDStr := strings.TrimSpace(c.Param("id"))
	contractID64, err := strconv.ParseUint(contractIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный contractId"})
		return
	}
	fnID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("functionId")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный functionId"})
		return
	}

	var fn models.ContractTZFunction
	if err := h.db.First(&fn, uint(fnID64)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Функция ТЗ не найдена"})
		return
	}
	if fn.ContractID != uint(contractID64) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Функция не принадлежит этой ГК"})
		return
	}

	if err := h.db.Model(&models.Requirement{}).
		Where("contract_tz_function_id = ?", fn.ID).
		Update("contract_tz_function_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить ссылки в предложениях"})
		return
	}

	if err := h.db.Delete(&fn).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить функцию ТЗ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Функция ТЗ удалена"})
}

// DELETE /api/contracts/attachments/:attachmentId
func (h *ContractDirectoryHandler) DeleteContractAttachment(c *gin.Context) {
	attachmentIDStr := strings.TrimSpace(c.Param("attachmentId"))
	attachmentID64, err := strconv.ParseUint(attachmentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный attachmentId"})
		return
	}

	var a models.ContractAttachment
	if err := h.db.First(&a, uint(attachmentID64)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Вложение не найдено"})
		return
	}

	deleteAttachmentFile(a.FilePath)

	if err := h.db.Delete(&a).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить вложение"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Вложение удалено"})
}
