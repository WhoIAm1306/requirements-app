package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"requirements-app/backend/internal/models"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type RequirementHandler struct {
	db *gorm.DB
}

func NewRequirementHandler(db *gorm.DB) *RequirementHandler {
	return &RequirementHandler{db: db}
}

// applyRequirementTextSearch накладывает текстовый поиск по полям карточки.
// Условия OR должны быть в скобках: иначе в SQL приоритет AND выше OR, и фильтры
// (очередь, статус, система и т.д.) перестают сужать совпадения по полям initiator / proposal_text.
func applyRequirementTextSearch(db *gorm.DB, rawSearch string) *gorm.DB {
	search := strings.TrimSpace(rawSearch)
	if search == "" {
		return db
	}
	like := "%" + search + "%"
	return db.Where(`(
		task_identifier ILIKE ? OR
		short_name ILIKE ? OR
		initiator ILIKE ? OR
		responsible_person ILIKE ? OR
		proposal_text ILIKE ?
	)`, like, like, like, like, like)
}

type CreateRequirementRequest struct {
	ShortName           string `json:"shortName"`
	Initiator           string `json:"initiator"`
	ResponsiblePerson   string `json:"responsiblePerson"`
	SectionName         string `json:"sectionName"`
	ProposalText        string `json:"proposalText"`
	ProblemComment      string `json:"problemComment"`
	DiscussionSummary   string `json:"discussionSummary"`
	ImplementationQueue string `json:"implementationQueue"`
	NoteText            string `json:"noteText"`
	TZPointText         string `json:"tzPointText"`
	NmckPointText       string `json:"nmckPointText"`
	StatusText          string `json:"statusText"`
	SystemType          string `json:"systemType"`
	ContractName        string `json:"contractName"`
	ContractTZFunctionID *uint  `json:"contractTZFunctionId"`
	// TaskIdentifier — необязательно; если пусто, сгенерируется автоматически.
	TaskIdentifier string `json:"taskIdentifier,omitempty"`
}

type UpdateRequirementRequest struct {
	ShortName           string `json:"shortName"`
	Initiator           string `json:"initiator"`
	ResponsiblePerson   string `json:"responsiblePerson"`
	SectionName         string `json:"sectionName"`
	ProposalText        string `json:"proposalText"`
	ProblemComment      string `json:"problemComment"`
	DiscussionSummary   string `json:"discussionSummary"`
	ImplementationQueue string `json:"implementationQueue"`
	NoteText            string `json:"noteText"`
	TZPointText         string `json:"tzPointText"`
	NmckPointText       string `json:"nmckPointText"`
	StatusText          string `json:"statusText"`
	SystemType          string `json:"systemType"`
	ContractName        string `json:"contractName"`
	ContractTZFunctionID *uint  `json:"contractTZFunctionId"`
	// TaskIdentifier — если передан, обновляет идентификатор (уникальность проверяется).
	TaskIdentifier *string `json:"taskIdentifier,omitempty"`
}

type AddCommentRequest struct {
	CommentText string `json:"commentText"`
}

type ImportResult struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors"`
}

func extractQueueNumber(value string) (int, error) {
	re := regexp.MustCompile(`\d+`)
	match := re.FindString(value)
	if match == "" {
		return 0, fmt.Errorf("не удалось определить номер очереди")
	}

	num, err := strconv.Atoi(match)
	if err != nil {
		return 0, err
	}

	return num, nil
}

func slugifyGKShortNameForTaskID(s string) string {
	s = strings.TrimSpace(s)
	var b strings.Builder
	for _, r := range s {
		if r == ' ' || r == '.' || r == '_' || r == '\t' || r == '\n' {
			continue
		}
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	out := b.String()
	runes := []rune(out)
	if len(runes) > 40 {
		out = string(runes[:40])
	}
	return out
}

func (h *RequirementHandler) ensureTaskIdentifierUnique(taskID string, excludeID uint) error {
	taskID = strings.TrimSpace(taskID)
	if taskID == "" {
		return fmt.Errorf("пустой идентификатор")
	}
	q := h.db.Model(&models.Requirement{}).Where("task_identifier = ?", taskID)
	if excludeID > 0 {
		q = q.Where("id <> ?", excludeID)
	}
	var n int64
	if err := q.Count(&n).Error; err != nil {
		return err
	}
	if n > 0 {
		return fmt.Errorf("идентификатор уже занят")
	}
	return nil
}

// generateTaskIdentifier формирует ПОВ… с учётом ГК или в старом формате ПОВ{очередь}.{n}.
func (h *RequirementHandler) generateTaskIdentifier(queueName, contractName string, excludeID uint) (string, error) {
	queueNumber, err := extractQueueNumber(queueName)
	if err != nil {
		return "", err
	}

	contractName = strings.TrimSpace(contractName)
	var slug string
	useExtended := false
	if contractName != "" {
		var co models.ContractDictionary
		if err := h.db.Where("LOWER(name) = LOWER(?)", contractName).First(&co).Error; err == nil {
			if co.UseShortNameInTaskID {
				slug = slugifyGKShortNameForTaskID(co.ShortName)
				if slug != "" {
					useExtended = true
				}
			}
		}
	}

	var items []models.Requirement
	query := h.db.
		Where("implementation_queue = ?", queueName).
		Order("id asc")
	if excludeID > 0 {
		query = query.Where("id <> ?", excludeID)
	}
	if err := query.Find(&items).Error; err != nil {
		return "", err
	}

	maxOrder := 0
	var re *regexp.Regexp
	if useExtended {
		re = regexp.MustCompile(fmt.Sprintf(`^ПОВ\.%s\.%d\.(\d+)$`, regexp.QuoteMeta(slug), queueNumber))
	} else {
		re = regexp.MustCompile(fmt.Sprintf(`^ПОВ%d\.(\d+)$`, queueNumber))
	}

	for _, item := range items {
		matches := re.FindStringSubmatch(strings.TrimSpace(item.TaskIdentifier))
		if len(matches) != 2 {
			continue
		}
		n, err := strconv.Atoi(matches[1])
		if err != nil {
			continue
		}
		if n > maxOrder {
			maxOrder = n
		}
	}

	if useExtended {
		return fmt.Sprintf("ПОВ.%s.%d.%d", slug, queueNumber, maxOrder+1), nil
	}
	return fmt.Sprintf("ПОВ%d.%d", queueNumber, maxOrder+1), nil
}

// requirementListRow — ответ списка с полями ГК для подписи в таблице.
type requirementListRow struct {
	models.Requirement
	ContractShortName            string `json:"contractShortName,omitempty"`
	ContractUseShortNameInTaskID bool `json:"contractUseShortNameInTaskId,omitempty"`
}

func (h *RequirementHandler) List(c *gin.Context) {
	var items []models.Requirement

	query := h.db.Order("id desc")

	archivedOnly := strings.TrimSpace(c.Query("archivedOnly")) == "true"
	includeArchivedParam := strings.TrimSpace(c.Query("includeArchived")) == "true"
	if archivedOnly {
		query = query.Where("is_archived = ?", true)
	} else if !includeArchivedParam {
		query = query.Where("is_archived = ?", false)
	}

	systemType := strings.TrimSpace(c.Query("systemType"))
	if systemType != "" {
		query = query.Where("system_type = ?", systemType)
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" {
		query = query.Where("status_text = ?", status)
	}

	queue := strings.TrimSpace(c.Query("implementationQueue"))
	if queue != "" {
		query = query.Where("implementation_queue = ?", queue)
	}

	query = applyRequirementTextSearch(query, c.Query("search"))

	if strings.TrimSpace(c.Query("noFunction")) == "true" {
		query = query.Where("contract_tz_function_id IS NULL")
	}

	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения предложений"})
		return
	}

	lowerKeys := make([]string, 0)
	seen := map[string]struct{}{}
	for _, it := range items {
		k := strings.ToLower(strings.TrimSpace(it.ContractName))
		if k == "" {
			continue
		}
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		lowerKeys = append(lowerKeys, k)
	}

	byLower := map[string]models.ContractDictionary{}
	if len(lowerKeys) > 0 {
		var contracts []models.ContractDictionary
		if err := h.db.Where("LOWER(TRIM(name)) IN ?", lowerKeys).Find(&contracts).Error; err == nil {
			for _, co := range contracts {
				byLower[strings.ToLower(strings.TrimSpace(co.Name))] = co
			}
		}
	}

	out := make([]requirementListRow, 0, len(items))
	for _, it := range items {
		row := requirementListRow{Requirement: it}
		k := strings.ToLower(strings.TrimSpace(it.ContractName))
		if co, ok := byLower[k]; ok {
			row.ContractShortName = co.ShortName
			row.ContractUseShortNameInTaskID = co.UseShortNameInTaskID
		}
		out = append(out, row)
	}

	c.JSON(http.StatusOK, out)
}

func (h *RequirementHandler) GetByID(c *gin.Context) {
	var item models.Requirement

	if err := h.db.Preload("Comments", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at asc")
	}).First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *RequirementHandler) Create(c *gin.Context) {
	var req CreateRequirementRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	contractName := strings.TrimSpace(req.ContractName)
	if err := h.ensureContractExists(contractName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения ГК"})
		return
	}

	// Если пользователь выбрал функцию ТЗ — формируем Пункт ТЗ из неё.
	var selectedFunction *models.ContractTZFunction
	if req.ContractTZFunctionID != nil {
		var contract models.ContractDictionary
		if err := h.db.Where("LOWER(name) = LOWER(?)", contractName).First(&contract).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения ГК"})
			return
		}

		var fn models.ContractTZFunction
		if err := h.db.First(&fn, *req.ContractTZFunctionID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректная выбранная функция ТЗ"})
			return
		}
		if fn.ContractID != contract.ID {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Функция ТЗ не принадлежит выбранной ГК"})
			return
		}
		selectedFunction = &fn
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	if strings.TrimSpace(req.ShortName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Краткое наименование обязательно"})
		return
	}

	if strings.TrimSpace(req.ImplementationQueue) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Выберите очередь"})
		return
	}

	if strings.TrimSpace(req.ResponsiblePerson) == "" {
		req.ResponsiblePerson = userName
	}

	if strings.TrimSpace(req.StatusText) == "" {
		req.StatusText = "В обработку"
	}

	var taskIdentifier string
	if tid := strings.TrimSpace(req.TaskIdentifier); tid != "" {
		if err := h.ensureTaskIdentifierUnique(tid, 0); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Идентификатор задачи уже используется или некорректен"})
			return
		}
		taskIdentifier = tid
	} else {
		var err error
		taskIdentifier, err = h.generateTaskIdentifier(strings.TrimSpace(req.ImplementationQueue), contractName, 0)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Ошибка генерации идентификатора задачи"})
			return
		}
	}

	item := models.Requirement{
		TaskIdentifier:      taskIdentifier,
		ShortName:           strings.TrimSpace(req.ShortName),
		Initiator:           strings.TrimSpace(req.Initiator),
		ResponsiblePerson:   strings.TrimSpace(req.ResponsiblePerson),
		SectionName:         strings.TrimSpace(req.SectionName),
		ProposalText:        strings.TrimSpace(req.ProposalText),
		ProblemComment:      strings.TrimSpace(req.ProblemComment),
		DiscussionSummary:   strings.TrimSpace(req.DiscussionSummary),
		ImplementationQueue: strings.TrimSpace(req.ImplementationQueue),
		NoteText:            strings.TrimSpace(req.NoteText),
		TZPointText:         strings.TrimSpace(req.TZPointText),
		NmckPointText:       strings.TrimSpace(req.NmckPointText),
		StatusText:          strings.TrimSpace(req.StatusText),
		SystemType:          strings.TrimSpace(req.SystemType),
		AuthorName:          userName,
		AuthorOrg:           userOrg,
		LastEditedBy:        userName,
		LastEditedOrg:       userOrg,
		ContractName:        contractName,
		ContractTZFunctionID: req.ContractTZFunctionID,
	}

	// П.п. ТЗ и НМЦК из выбранной функции справочника.
	if selectedFunction != nil {
		item.TZPointText = fmt.Sprintf("%s — %s", strings.TrimSpace(selectedFunction.TZSectionNumber), strings.TrimSpace(selectedFunction.FunctionName))
		item.NmckPointText = strings.TrimSpace(selectedFunction.NMCKFunctionNumber)
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания предложения"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *RequirementHandler) Update(c *gin.Context) {
	var req UpdateRequirementRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	contractName := strings.TrimSpace(req.ContractName)
	if err := h.ensureContractExists(contractName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения ГК"})
		return
	}

	var item models.Requirement
	if err := h.db.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	if strings.TrimSpace(req.ShortName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Краткое наименование обязательно"})
		return
	}

	if strings.TrimSpace(req.ImplementationQueue) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Выберите очередь"})
		return
	}

	oldQueue := strings.TrimSpace(item.ImplementationQueue)
	newQueue := strings.TrimSpace(req.ImplementationQueue)
	queueChanged := oldQueue != newQueue
	oldTID := strings.TrimSpace(item.TaskIdentifier)

	explicitTID := ""
	if req.TaskIdentifier != nil {
		explicitTID = strings.TrimSpace(*req.TaskIdentifier)
	}

	if queueChanged {
		if explicitTID != "" && explicitTID != oldTID {
			if err := h.ensureTaskIdentifierUnique(explicitTID, item.ID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "Такой идентификатор уже используется"})
				return
			}
			item.TaskIdentifier = explicitTID
		} else {
			taskIdentifier, err := h.generateTaskIdentifier(newQueue, contractName, item.ID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "Ошибка генерации идентификатора задачи"})
				return
			}
			item.TaskIdentifier = taskIdentifier
		}
	} else if req.TaskIdentifier != nil {
		if explicitTID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Идентификатор задачи не может быть пустым"})
			return
		}
		if explicitTID != oldTID {
			if err := h.ensureTaskIdentifierUnique(explicitTID, item.ID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "Такой идентификатор уже используется"})
				return
			}
		}
		item.TaskIdentifier = explicitTID
	}

	item.ShortName = strings.TrimSpace(req.ShortName)
	item.Initiator = strings.TrimSpace(req.Initiator)
	item.ContractName = contractName

	if strings.TrimSpace(req.ResponsiblePerson) == "" {
		item.ResponsiblePerson = userName
	} else {
		item.ResponsiblePerson = strings.TrimSpace(req.ResponsiblePerson)
	}

	item.SectionName = strings.TrimSpace(req.SectionName)
	item.ProposalText = strings.TrimSpace(req.ProposalText)
	item.ProblemComment = strings.TrimSpace(req.ProblemComment)
	item.DiscussionSummary = strings.TrimSpace(req.DiscussionSummary)
	item.ImplementationQueue = newQueue
	item.NoteText = strings.TrimSpace(req.NoteText)
	// Выбор функции ТЗ переопределяет Пункт ТЗ.
	if req.ContractTZFunctionID != nil {
		var contract models.ContractDictionary
		if err := h.db.Where("LOWER(name) = LOWER(?)", contractName).First(&contract).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения ГК"})
			return
		}

		var fn models.ContractTZFunction
		if err := h.db.First(&fn, *req.ContractTZFunctionID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректная выбранная функция ТЗ"})
			return
		}
		if fn.ContractID != contract.ID {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Функция ТЗ не принадлежит выбранной ГК"})
			return
		}

		item.ContractTZFunctionID = req.ContractTZFunctionID
		item.TZPointText = fmt.Sprintf("%s — %s", strings.TrimSpace(fn.TZSectionNumber), strings.TrimSpace(fn.FunctionName))
		item.NmckPointText = strings.TrimSpace(fn.NMCKFunctionNumber)
	} else {
		item.ContractTZFunctionID = nil
		item.TZPointText = strings.TrimSpace(req.TZPointText)
		item.NmckPointText = strings.TrimSpace(req.NmckPointText)
	}
	item.SystemType = strings.TrimSpace(req.SystemType)

	if strings.TrimSpace(req.StatusText) == "" {
		item.StatusText = "В обработку"
	} else {
		item.StatusText = strings.TrimSpace(req.StatusText)
	}

	item.LastEditedBy = userName
	item.LastEditedOrg = userOrg

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления предложения"})
		return
	}

	var result models.Requirement
	if err := h.db.Preload("Comments", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at asc")
	}).First(&result, item.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения обновленного предложения"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *RequirementHandler) AddComment(c *gin.Context) {
	var req AddCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный запрос"})
		return
	}

	var item models.Requirement
	if err := h.db.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	comment := models.Comment{
		RequirementID: item.ID,
		CommentText:   strings.TrimSpace(req.CommentText),
		AuthorName:    userName,
		AuthorOrg:     userOrg,
	}

	if comment.CommentText == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Комментарий пустой"})
		return
	}

	if err := h.db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения комментария"})
		return
	}

	item.DiscussionSummary = comment.CommentText
	item.LastEditedBy = userName
	item.LastEditedOrg = userOrg
	_ = h.db.Save(&item).Error

	c.JSON(http.StatusCreated, comment)
}

func normalizeHeader(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, "\n", " ")
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.Join(strings.Fields(value), " ")
	return value
}

func getCellByHeader(row []string, headerMap map[string]int, keys ...string) string {
	for _, key := range keys {
		if idx, ok := headerMap[normalizeHeader(key)]; ok {
			if idx >= 0 && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
	}
	return ""
}

func isRowEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func standardQueueName(queueNumber int) string {
	return fmt.Sprintf("%d очередь", queueNumber)
}

func (h *RequirementHandler) ensureQueueExists(queueName string) (string, error) {
	queueNumber, err := extractQueueNumber(queueName)
	if err != nil {
		return "", err
	}

	normalizedName := standardQueueName(queueNumber)

	var existing models.QueueDictionary
	err = h.db.Where("number = ?", queueNumber).First(&existing).Error
	if err == nil {
		return existing.Name, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}

	item := models.QueueDictionary{
		Number:   queueNumber,
		Name:     normalizedName,
		IsActive: true,
	}

	if err := h.db.Create(&item).Error; err != nil {
		return "", err
	}

	return item.Name, nil
}

func (h *RequirementHandler) ImportRequirements(c *gin.Context) {
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
		headerMap[normalizeHeader(col)] = i
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	result := ImportResult{
		Errors: make([]string, 0),
	}

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		lineNumber := i + 1

		if isRowEmpty(row) {
			continue
		}

		shortName := getCellByHeader(row, headerMap,
			"Краткое наименование предложения",
		)

		queueValue := getCellByHeader(row, headerMap,
			"Номер очереди при реализации",
		)

		if shortName == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: пустое краткое наименование", lineNumber))
			continue
		}

		if queueValue == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: не указана очередь", lineNumber))
			continue
		}

		normalizedQueue, err := h.ensureQueueExists(queueValue)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка очереди: %v", lineNumber, err))
			continue
		}

		responsiblePerson := getCellByHeader(row, headerMap,
			"Ответственный со стороны предложения",
			"Ответственный за предложение",
		)
		if responsiblePerson == "" {
			responsiblePerson = userName
		}

		statusText := getCellByHeader(row, headerMap, "Статус")
		if statusText == "" {
			statusText = "В обработку"
		}

		systemType := getCellByHeader(row, headerMap, "Система")
		if systemType == "" {
			systemType = "112"
		}

		contractName := getCellByHeader(row, headerMap, "ГК", "Контракт", "Государственный контракт")
		if err := h.ensureContractExists(contractName); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка сохранения ГК", lineNumber))
			continue
		}

		explicitTID := getCellByHeader(row, headerMap, "Идентификатор задачи", "Идентификатор")
		var taskIdentifier string
		if strings.TrimSpace(explicitTID) != "" {
			taskIdentifier = strings.TrimSpace(explicitTID)
			if err := h.ensureTaskIdentifierUnique(taskIdentifier, 0); err != nil {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: идентификатор уже занят или некорректен", lineNumber))
				continue
			}
		} else {
			var err error
			taskIdentifier, err = h.generateTaskIdentifier(normalizedQueue, contractName, 0)
			if err != nil {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка генерации идентификатора", lineNumber))
				continue
			}
		}

		item := models.Requirement{
			TaskIdentifier:      taskIdentifier,
			ShortName:           shortName,
			Initiator:           getCellByHeader(row, headerMap, "Инициатор предложения"),
			ResponsiblePerson:   responsiblePerson,
			SectionName:         getCellByHeader(row, headerMap, "Условное разделение"),
			ProposalText:        getCellByHeader(row, headerMap, "Предложение"),
			ProblemComment:      getCellByHeader(row, headerMap, "Комментарии и описание проблем"),
			DiscussionSummary:   getCellByHeader(row, headerMap, "Обсуждение"),
			ImplementationQueue: normalizedQueue,
			NoteText:            getCellByHeader(row, headerMap, "Примечание"),
			TZPointText: getCellByHeader(row, headerMap,
				"П.п. ТЗ",
				"п.п. тз",
				"Пункт ТЗ",
			),
			NmckPointText: getCellByHeader(row, headerMap,
				"П.п. НМЦК",
				"п.п. нмцк",
				"Пункт НМЦК",
			),
			StatusText:          statusText,
			SystemType:          systemType,
			AuthorName:          userName,
			AuthorOrg:           userOrg,
			LastEditedBy:        userName,
			LastEditedOrg:       userOrg,
			ContractName:        contractName,
		}

		if err := h.db.Create(&item).Error; err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: ошибка сохранения: %v", lineNumber, err))
			continue
		}

		result.Created++
	}

	c.JSON(http.StatusOK, result)
}

func (h *RequirementHandler) ExportRequirements(c *gin.Context) {
	var items []models.Requirement

	query := h.db.Order("id desc")

	archivedOnly := strings.TrimSpace(c.Query("archivedOnly")) == "true"
	includeArchivedParam := strings.TrimSpace(c.Query("includeArchived")) == "true"
	if archivedOnly {
		query = query.Where("is_archived = ?", true)
	} else if !includeArchivedParam {
		query = query.Where("is_archived = ?", false)
	}

	systemType := strings.TrimSpace(c.Query("systemType"))
	if systemType != "" {
		query = query.Where("system_type = ?", systemType)
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" {
		query = query.Where("status_text = ?", status)
	}

	queue := strings.TrimSpace(c.Query("implementationQueue"))
	if queue != "" {
		query = query.Where("implementation_queue = ?", queue)
	}

	query = applyRequirementTextSearch(query, c.Query("search"))

	if strings.TrimSpace(c.Query("noFunction")) == "true" {
		query = query.Where("contract_tz_function_id IS NULL")
	}

	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения предложений"})
		return
	}

	file := excelize.NewFile()
	defer func() { _ = file.Close() }()

	sheetName := "Предложения"
	file.SetSheetName("Sheet1", sheetName)

	headers := []string{
		"Идентификатор задачи",
		"Краткое наименование предложения",
		"Инициатор предложения",
		"Ответственный за предложение",
		"Условное разделение",
		"Предложение",
		"Комментарии и описание проблем",
		"Обсуждение",
		"Номер очереди при реализации",
		"Примечание",
		"ГК",
		"П.п. ТЗ",
		"П.п. НМЦК",
		"Статус",
		"Система",
		"Автор создания",
		"Организация автора",
		"Дата создания",
		"Последний редактор",
		"Организация редактора",
		"Дата изменения",
	}

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = file.SetCellValue(sheetName, cell, header)
	}

	for rowIndex, item := range items {
		row := rowIndex + 2

		values := []interface{}{
			item.TaskIdentifier,
			item.ShortName,
			item.Initiator,
			item.ResponsiblePerson,
			item.SectionName,
			item.ProposalText,
			item.ProblemComment,
			item.DiscussionSummary,
			item.ImplementationQueue,
			item.NoteText,
			item.ContractName,
			item.TZPointText,
			item.NmckPointText,
			item.StatusText,
			item.SystemType,
			item.AuthorName,
			item.AuthorOrg,
			item.CreatedAt.Format("2006-01-02 15:04:05"),
			item.LastEditedBy,
			item.LastEditedOrg,
			item.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		for colIndex, value := range values {
			cell, _ := excelize.CoordinatesToCellName(colIndex+1, row)
			_ = file.SetCellValue(sheetName, cell, value)
		}
	}

	_ = file.SetColWidth(sheetName, "A", "A", 20)
	_ = file.SetColWidth(sheetName, "B", "B", 40)
	_ = file.SetColWidth(sheetName, "C", "E", 24)
	_ = file.SetColWidth(sheetName, "F", "H", 50)
	_ = file.SetColWidth(sheetName, "I", "L", 28)
	_ = file.SetColWidth(sheetName, "M", "S", 22)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", `attachment; filename="requirements_export.xlsx"`)
	c.Header("File-Name", "requirements_export.xlsx")

	if err := file.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка формирования Excel"})
		return
	}
}

func (h *RequirementHandler) Archive(c *gin.Context) {
	var item models.Requirement
	if err := h.db.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	if item.IsArchived {
		c.JSON(http.StatusOK, item)
		return
	}

	now := time.Now()
	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	item.IsArchived = true
	item.ArchivedAt = &now
	item.ArchivedBy = userName
	item.ArchivedByOrg = userOrg
	item.LastEditedBy = userName
	item.LastEditedOrg = userOrg

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка архивирования"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *RequirementHandler) Restore(c *gin.Context) {
	var item models.Requirement
	if err := h.db.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	item.IsArchived = false
	item.ArchivedAt = nil
	item.ArchivedBy = ""
	item.ArchivedByOrg = ""
	item.LastEditedBy = userName
	item.LastEditedOrg = userOrg

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка восстановления"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// DELETE /api/requirements/:id — мягкое удаление (не путать с архивом).
func (h *RequirementHandler) Delete(c *gin.Context) {
	var item models.Requirement
	if err := h.db.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	if err := h.db.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка удаления предложения"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Предложение удалено"})
}

// GET /api/requirements/:id/gk-link — сведения о привязке к функции справочника ГК.
func (h *RequirementHandler) GetGKLink(c *gin.Context) {
	var reqItem models.Requirement
	if err := h.db.First(&reqItem, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	type dto struct {
		HasFunction         bool   `json:"hasFunction"`
		ContractID          uint   `json:"contractId"`
		FunctionID          uint   `json:"functionId"`
		ContractStageID     uint   `json:"contractStageId"`
		ContractName        string `json:"contractName"`
		StageNumber         int    `json:"stageNumber"`
		StageName           string `json:"stageName"`
		FunctionName        string `json:"functionName"`
		TZSectionNumber     string `json:"tzSectionNumber"`
		NmckFunctionNumber  string `json:"nmckFunctionNumber"`
		JiraLink            string `json:"jiraLink"`
		TZPointText         string `json:"tzPointText"`
		NmckPointText       string `json:"nmckPointText"`
	}

	out := dto{
		ContractName:  strings.TrimSpace(reqItem.ContractName),
		TZPointText:   strings.TrimSpace(reqItem.TZPointText),
		NmckPointText: strings.TrimSpace(reqItem.NmckPointText),
	}

	if reqItem.ContractTZFunctionID == nil {
		c.JSON(http.StatusOK, out)
		return
	}

	var fn models.ContractTZFunction
	if err := h.db.First(&fn, *reqItem.ContractTZFunctionID).Error; err != nil {
		c.JSON(http.StatusOK, out)
		return
	}

	var stage models.ContractStage
	_ = h.db.First(&stage, fn.ContractStageID).Error

	var contract models.ContractDictionary
	_ = h.db.First(&contract, fn.ContractID).Error

	out.HasFunction = true
	out.ContractID = fn.ContractID
	out.FunctionID = fn.ID
	out.ContractStageID = fn.ContractStageID
	out.ContractName = contract.Name
	out.StageNumber = stage.StageNumber
	out.StageName = stage.StageName
	out.FunctionName = fn.FunctionName
	out.TZSectionNumber = fn.TZSectionNumber
	out.NmckFunctionNumber = fn.NMCKFunctionNumber
	out.JiraLink = strings.TrimSpace(fn.JiraLink)

	c.JSON(http.StatusOK, out)
}

func (h *RequirementHandler) ensureContractExists(contractName string) error {
	contractName = strings.TrimSpace(contractName)
	if contractName == "" {
		return nil
	}

	var existing models.ContractDictionary
	err := h.db.Where("LOWER(name) = LOWER(?)", contractName).First(&existing).Error
	if err == nil {
		if existing.Name != contractName {
			existing.Name = contractName
			return h.db.Save(&existing).Error
		}
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	item := models.ContractDictionary{
		Name:     contractName,
		IsActive: true,
	}

	return h.db.Create(&item).Error
}
