package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type DictionaryHandler struct {
	db *gorm.DB
}

func NewDictionaryHandler(db *gorm.DB) *DictionaryHandler {
	return &DictionaryHandler{db: db}
}

type CreateQueueRequest struct {
	Number int `json:"number"`
}

func (h *DictionaryHandler) SearchAuthors(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	var items []models.AuthorDictionary
	query := h.db.Where("is_active = ?", true).Order("full_name asc").Limit(10)

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("full_name ILIKE ?", like)
	}

	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения справочника ФИО"})
		return
	}

	result := make([]string, 0, len(items))
	for _, item := range items {
		result = append(result, item.FullName)
	}

	c.JSON(http.StatusOK, result)
}

func (h *DictionaryHandler) SearchTZPoints(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	var items []models.TZPoint
	query := h.db.Order("id desc").Limit(10)

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("code ILIKE ? OR text ILIKE ?", like, like)
	}

	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения пунктов ТЗ"})
		return
	}

	result := make([]string, 0, len(items))
	for _, item := range items {
		line := strings.TrimSpace(item.Code)
		if strings.TrimSpace(item.Text) != "" {
			if line != "" {
				line += " — "
			}
			line += strings.TrimSpace(item.Text)
		}
		if line != "" {
			result = append(result, line)
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *DictionaryHandler) ListQueues(c *gin.Context) {
	var items []models.QueueDictionary

	if err := h.db.
		Where("is_active = ?", true).
		Order("number asc").
		Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения очередей"})
		return
	}

	c.JSON(http.StatusOK, items)
}

func (h *DictionaryHandler) CreateQueue(c *gin.Context) {
	var req CreateQueueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	if req.Number <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Номер очереди должен быть больше 0"})
		return
	}

	var existing models.QueueDictionary
	err := h.db.Where("number = ?", req.Number).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки очереди"})
		return
	}

	item := models.QueueDictionary{
		Number:   req.Number,
		Name:     strconv.Itoa(req.Number) + " очередь",
		IsActive: true,
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания очереди"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func normalizeDictionaryHeader(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, "\n", " ")
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.Join(strings.Fields(value), " ")
	return value
}

func getDictionaryCell(row []string, headerMap map[string]int, keys ...string) string {
	for _, key := range keys {
		if idx, ok := headerMap[normalizeDictionaryHeader(key)]; ok {
			if idx >= 0 && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
	}
	return ""
}

func (h *DictionaryHandler) ImportTZPoints(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файл не передан"})
		return
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
		headerMap[normalizeDictionaryHeader(col)] = i
	}

	result := ImportResult{
		Errors: make([]string, 0),
	}

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		lineNumber := i + 1

		if isRowEmpty(row) {
			continue
		}

		code := getDictionaryCell(row, headerMap,
			"Код",
			"Номер пункта ТЗ",
			"Пункт ТЗ",
		)

		text := getDictionaryCell(row, headerMap,
			"Текст",
			"Наименование",
			"Описание",
		)

		if code == "" && text == "" {
			continue
		}

		if code != "" {
			var existing models.TZPoint
			err := h.db.Where("code = ?", code).First(&existing).Error
			if err == nil {
				existing.Text = text
				if err := h.db.Save(&existing).Error; err != nil {
					result.Failed++
					result.Errors = append(result.Errors, "Строка "+strconv.Itoa(lineNumber)+": ошибка обновления пункта ТЗ")
					continue
				}
				result.Updated++
				continue
			}
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				result.Failed++
				result.Errors = append(result.Errors, "Строка "+strconv.Itoa(lineNumber)+": ошибка поиска пункта ТЗ")
				continue
			}
		}

		item := models.TZPoint{
			Code: code,
			Text: text,
		}

		if err := h.db.Create(&item).Error; err != nil {
			result.Failed++
			result.Errors = append(result.Errors, "Строка "+strconv.Itoa(lineNumber)+": ошибка создания пункта ТЗ")
			continue
		}

		result.Created++
	}

	c.JSON(http.StatusOK, result)
}

func (h *DictionaryHandler) SearchContracts(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	var items []models.ContractDictionary
	query := h.db.Where("is_active = ?", true).Order("name asc").Limit(20)

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ?", like)
	}

	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения справочника ГК"})
		return
	}

	result := make([]string, 0, len(items))
	for _, item := range items {
		result = append(result, item.Name)
	}

	c.JSON(http.StatusOK, result)
}

// contractListRow — элемент списка ГК с агрегатами для UI (сайдбар).
type contractListRow struct {
	ID                   uint      `json:"id"`
	Name                 string    `json:"name"`
	Number               string    `json:"number"`
	ShortName            string    `json:"shortName"`
	UseShortNameInTaskID bool      `json:"useShortNameInTaskId"`
	Description          string    `json:"description"`
	IsActive             bool      `json:"isActive"`
	CreatedAt            time.Time `json:"createdAt"`
	StagesCount          int64     `json:"stagesCount"`
	FunctionsCount       int64     `json:"functionsCount"`
}

func (h *DictionaryHandler) ListContracts(c *gin.Context) {
	var items []models.ContractDictionary
	if err := h.db.Order("name asc").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения ГК"})
		return
	}

	if len(items) == 0 {
		c.JSON(http.StatusOK, []contractListRow{})
		return
	}

	ids := make([]uint, len(items))
	for i := range items {
		ids[i] = items[i].ID
	}

	stageMap := make(map[uint]int64, len(ids))
	var stageAgg []struct {
		ContractID uint  `gorm:"column:contract_id"`
		N          int64 `gorm:"column:n"`
	}
	if err := h.db.Model(&models.ContractStage{}).
		Select("contract_id, COUNT(*)::bigint AS n").
		Where("contract_id IN ?", ids).
		Group("contract_id").
		Find(&stageAgg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения этапов ГК"})
		return
	}
	for _, r := range stageAgg {
		stageMap[r.ContractID] = r.N
	}

	fnMap := make(map[uint]int64, len(ids))
	var fnAgg []struct {
		ContractID uint  `gorm:"column:contract_id"`
		N          int64 `gorm:"column:n"`
	}
	if err := h.db.Table("contract_tz_functions AS f").
		Select("s.contract_id, COUNT(*)::bigint AS n").
		Joins("INNER JOIN contract_stages AS s ON s.id = f.contract_stage_id").
		Where("s.contract_id IN ?", ids).
		Group("s.contract_id").
		Find(&fnAgg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения функций ГК"})
		return
	}
	for _, r := range fnAgg {
		fnMap[r.ContractID] = r.N
	}

	out := make([]contractListRow, 0, len(items))
	for _, c := range items {
		out = append(out, contractListRow{
			ID:                   c.ID,
			Name:                 c.Name,
			Number:               c.Number,
			ShortName:            c.ShortName,
			UseShortNameInTaskID: c.UseShortNameInTaskID,
			Description:          c.Description,
			IsActive:             c.IsActive,
			CreatedAt:            c.CreatedAt,
			StagesCount:          stageMap[c.ID],
			FunctionsCount:       fnMap[c.ID],
		})
	}

	c.JSON(http.StatusOK, out)
}
