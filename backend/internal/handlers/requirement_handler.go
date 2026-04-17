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

	"requirements-app/backend/internal/middleware"
)

const telephonySectionName = "Телефония"
const undefinedQueueName = "Не определена"

func isTelephonySectionName(s string) bool {
	return strings.EqualFold(strings.TrimSpace(s), telephonySectionName)
}

// applyRequirementListScope: systemType (112|101) и telephonySection true|false — сочетание раздела и системы.
func applyRequirementListScope(query *gorm.DB, c *gin.Context) *gorm.DB {
	if ts := strings.TrimSpace(c.Query("systemType")); ts != "" {
		query = query.Where("system_type = ?", ts)
	}
	switch strings.TrimSpace(c.Query("telephonySection")) {
	case "true":
		query = query.Where("LOWER(TRIM(section_name)) = ?", strings.ToLower(telephonySectionName))
	case "false":
		query = query.Where("(TRIM(COALESCE(section_name, '')) = '' OR LOWER(TRIM(section_name)) <> ?)", strings.ToLower(telephonySectionName))
	}
	return query
}

func validateRequirementSystemType(s string) error {
	s = strings.TrimSpace(s)
	if s == "112" || s == "101" {
		return nil
	}
	return fmt.Errorf("система должна быть 112 или 101")
}

func normalizeRequirementSystemType(s string) string {
	s = strings.TrimSpace(s)
	if s == "112" || s == "101" {
		return s
	}
	return ""
}

// Импорт Excel: колонка «Система» + раздел; значение «Телефония» переносится в раздел.
func formatTimePtrForExcel(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("02.01.2006 15:04")
}

func formatDatePtrForExcel(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("02.01.2006")
}

func parseImportSystemAndSection(systemCol, sectionCol string) (systemType string, sectionName string) {
	systemCol = strings.TrimSpace(systemCol)
	sectionName = strings.TrimSpace(sectionCol)
	low := strings.ToLower(systemCol)
	if systemCol == telephonySectionName || low == "telephony" {
		if sectionName == "" {
			sectionName = telephonySectionName
		}
		return "112", sectionName
	}
	if systemCol == "112" || systemCol == "101" {
		return systemCol, sectionName
	}
	if strings.Contains(low, "101") {
		return "101", sectionName
	}
	if strings.Contains(low, "112") {
		return "112", sectionName
	}
	return "112", sectionName
}

type RequirementHandler struct {
	db *gorm.DB
}

func NewRequirementHandler(db *gorm.DB) *RequirementHandler {
	return &RequirementHandler{db: db}
}

// applyRequirementTextSearch накладывает текстовый поиск по полям карточки (кроме отдельных фильтров
// статус / очередь / архив в запросе остаются AND — поиск добавляет OR-группу в скобках).
func applyRequirementTextSearch(db *gorm.DB, rawSearch string) *gorm.DB {
	search := strings.TrimSpace(rawSearch)
	if search == "" {
		return db
	}
	like := "%" + search + "%"
	fields := []string{
		"task_identifier",
		"short_name",
		"initiator",
		"responsible_person",
		"proposal_text",
		"section_name",
		"problem_comment",
		"discussion_summary",
		"note_text",
		"contract_name",
		"tz_point_text",
		"nmck_point_text",
		"status_text",
		"system_type",
		"implementation_queue",
		"author_name",
		"author_org",
		"last_edited_by",
		"last_edited_org",
		"archived_by",
		"archived_by_org",
		"dit_outgoing_number",
	}
	parts := make([]string, 0, len(fields))
	args := make([]interface{}, 0, len(fields))
	for _, f := range fields {
		parts = append(parts, f+" ILIKE ?")
		args = append(args, like)
	}
	sql := "(" + strings.Join(parts, " OR ") + ")"
	return db.Where(sql, args...)
}

// applyRequirementListSQLSelect — для списка не читаем огромные TEXT целиком (Postgres LEFT), поля
// примечание/обсуждение в таблице не нужны — экономия IO и размер JSON.
func applyRequirementListSQLSelect(db *gorm.DB) *gorm.DB {
	return db.Select(
		"id", "sequence_number", "task_identifier", "short_name", "initiator", "responsible_person", "section_name",
		"implementation_queue", "contract_name", "contract_tz_function_id",
		"tz_point_text", "nmck_point_text", "status_text", "system_type",
		"created_at", "updated_at", "completed_at", "dit_outgoing_number", "dit_outgoing_date",
		"author_name", "author_org", "last_edited_by", "last_edited_org",
		"is_archived", "archived_at", "archived_by", "archived_by_org",
		"deleted_at",
		"LEFT(COALESCE(proposal_text, ''), 520) AS proposal_text",
		"LEFT(COALESCE(problem_comment, ''), 520) AS problem_comment",
	)
}

func (h *RequirementHandler) nextSequenceNumber(tx *gorm.DB) (uint, error) {
	var maxSeq uint
	if err := tx.Model(&models.Requirement{}).Select("COALESCE(MAX(sequence_number), 0)").Scan(&maxSeq).Error; err != nil {
		return 0, err
	}
	return maxSeq + 1, nil
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
	CompletedAt         *time.Time `json:"completedAt"`
	DitOutgoingNumber   string     `json:"ditOutgoingNumber"`
	DitOutgoingDate     *time.Time `json:"ditOutgoingDate"`
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
	CompletedAt          *time.Time `json:"completedAt"`
	DitOutgoingNumber    string     `json:"ditOutgoingNumber"`
	DitOutgoingDate      *time.Time `json:"ditOutgoingDate"`
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
	if strings.EqualFold(strings.TrimSpace(value), undefinedQueueName) {
		return 0, nil
	}
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

// taskIDPrefixForSystem: для системы 101 — префикс ПСС, иначе ПОВ.
func taskIDPrefixForSystem(systemType string) string {
	if strings.TrimSpace(systemType) == "101" {
		return "ПСС"
	}
	return "ПОВ"
}

func taskIDQueueSegment(sectionName string, queueNumber int) string {
	if isTelephonySectionName(sectionName) {
		return fmt.Sprintf("Тел%d", queueNumber)
	}
	return fmt.Sprintf("%d", queueNumber)
}

// generateTaskIdentifier формирует идентификатор (ПОВ… или ПСС… для системы 101) с учётом ГК.
// Для раздела «Телефония» используется формат с сегментом «Тел»: ПОВ.Тел1.1 / ПСС.Тел1.3.
func (h *RequirementHandler) generateTaskIdentifier(systemType, queueName, contractName, sectionName string, excludeID uint) (string, error) {
	prefix := taskIDPrefixForSystem(systemType)
	queueNumber, err := extractQueueNumber(queueName)
	if err != nil {
		return "", err
	}
	queueSegment := taskIDQueueSegment(sectionName, queueNumber)

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
		re = regexp.MustCompile(
			fmt.Sprintf(`^%s\.%s\.%s\.(\d+)$`, regexp.QuoteMeta(prefix), regexp.QuoteMeta(slug), regexp.QuoteMeta(queueSegment)),
		)
	} else {
		if isTelephonySectionName(sectionName) {
			re = regexp.MustCompile(fmt.Sprintf(`^%s\.%s\.(\d+)$`, regexp.QuoteMeta(prefix), regexp.QuoteMeta(queueSegment)))
		} else {
			re = regexp.MustCompile(fmt.Sprintf(`^%s%s\.(\d+)$`, regexp.QuoteMeta(prefix), regexp.QuoteMeta(queueSegment)))
		}
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
		return fmt.Sprintf("%s.%s.%s.%d", prefix, slug, queueSegment, maxOrder+1), nil
	}
	if isTelephonySectionName(sectionName) {
		return fmt.Sprintf("%s.%s.%d", prefix, queueSegment, maxOrder+1), nil
	}
	return fmt.Sprintf("%s%s.%d", prefix, queueSegment, maxOrder+1), nil
}

// requirementListRow — ответ списка с полями ГК для подписи в таблице.
type requirementListRow struct {
	models.Requirement
	ContractShortName            string `json:"contractShortName,omitempty"`
	ContractUseShortNameInTaskID bool `json:"contractUseShortNameInTaskId,omitempty"`
}

func (h *RequirementHandler) List(c *gin.Context) {
	var items []models.Requirement

	query := h.db.Model(&models.Requirement{})

	archivedOnly := strings.TrimSpace(c.Query("archivedOnly")) == "true"
	includeArchivedParam := strings.TrimSpace(c.Query("includeArchived")) == "true"
	if archivedOnly {
		query = query.Where("is_archived = ?", true)
	} else if !includeArchivedParam {
		query = query.Where("is_archived = ?", false)
	}

	query = applyRequirementListScope(query, c)

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
		query = query.Where(
			"TRIM(COALESCE(nmck_point_text, '')) = '' AND TRIM(COALESCE(tz_point_text, '')) = ''",
		)
	}

	sortOrder := strings.ToLower(strings.TrimSpace(c.Query("sortOrder")))
	if sortOrder == "asc" {
		query = query.Order("sequence_number asc").Order("id asc")
	} else {
		query = query.Order("sequence_number desc").Order("id desc")
	}

	// Узкий SELECT: без тяжёлых TEXT целиком — LEFT в БД (Postgres), без note/discussion в таблице.
	query = applyRequirementListSQLSelect(query)

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
		if err := h.db.
			Select("name", "short_name", "use_short_name_in_task_id").
			Where("LOWER(TRIM(name)) IN ?", lowerKeys).
			Find(&contracts).Error; err == nil {
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

	if err := h.db.
		Preload("Attachments", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at desc")
		}).
		Preload("Attachments.LibraryFile").
		Preload("Comments", func(db *gorm.DB) *gorm.DB {
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

	sys := normalizeRequirementSystemType(req.SystemType)
	if err := validateRequirementSystemType(sys); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
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
		taskIdentifier, err = h.generateTaskIdentifier(
			sys,
			strings.TrimSpace(req.ImplementationQueue),
			contractName,
			strings.TrimSpace(req.SectionName),
			0,
		)
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
		SystemType:          sys,
		DitOutgoingNumber:   strings.TrimSpace(req.DitOutgoingNumber),
		DitOutgoingDate:     req.DitOutgoingDate,
		AuthorName:          userName,
		AuthorOrg:           userOrg,
		LastEditedBy:        userName,
		LastEditedOrg:       userOrg,
		ContractName:        contractName,
		ContractTZFunctionID: req.ContractTZFunctionID,
	}

	if strings.TrimSpace(req.StatusText) == "Выполнено" {
		if req.CompletedAt != nil {
			item.CompletedAt = req.CompletedAt
		} else {
			t := time.Now()
			item.CompletedAt = &t
		}
	} else if req.CompletedAt != nil {
		item.CompletedAt = req.CompletedAt
	}

	// П.п. ТЗ и НМЦК из выбранной функции справочника.
	if selectedFunction != nil {
		item.TZPointText = fmt.Sprintf("%s — %s", strings.TrimSpace(selectedFunction.TZSectionNumber), strings.TrimSpace(selectedFunction.FunctionName))
		item.NmckPointText = strings.TrimSpace(selectedFunction.NMCKFunctionNumber)
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		seq, err := h.nextSequenceNumber(tx)
		if err != nil {
			return err
		}
		item.SequenceNumber = seq
		return tx.Create(&item).Error
	}); err != nil {
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

	var item models.Requirement
	if err := h.db.First(&item, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	var u *models.User
	if raw, ok := c.Get("currentUser"); ok {
		if typed, ok2 := raw.(*models.User); ok2 {
			u = typed
		}
	}
	fullEdit := u != nil && isFullRequirementEditor(u.IsSuperuser, u.AccessLevel)
	if !fullEdit && u != nil {
		g := middleware.DecodeRequirementGrantsJSON(u.RequirementFieldGrants)
		req = mergeUpdateRequirementRequestWithGrants(item, req, g)
	}

	contractName := strings.TrimSpace(req.ContractName)
	if err := h.ensureContractExists(contractName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения ГК"})
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

	sys := normalizeRequirementSystemType(req.SystemType)
	if err := validateRequirementSystemType(sys); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
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
			taskIdentifier, err := h.generateTaskIdentifier(
				sys,
				newQueue,
				contractName,
				strings.TrimSpace(req.SectionName),
				item.ID,
			)
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
	item.SystemType = sys
	item.DitOutgoingNumber = strings.TrimSpace(req.DitOutgoingNumber)
	item.DitOutgoingDate = req.DitOutgoingDate

	oldStatus := strings.TrimSpace(item.StatusText)
	if strings.TrimSpace(req.StatusText) == "" {
		item.StatusText = "В обработку"
	} else {
		item.StatusText = strings.TrimSpace(req.StatusText)
	}
	newStatus := item.StatusText

	if req.CompletedAt != nil {
		item.CompletedAt = req.CompletedAt
	} else if newStatus == "Выполнено" && oldStatus != "Выполнено" && item.CompletedAt == nil {
		t := time.Now()
		item.CompletedAt = &t
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

// DeleteComment — удалить комментарий из карточки предложения.
// Комментарии удаляются физически, а summary поля предложения пересчитывается по последнему комментарию.
func (h *RequirementHandler) DeleteComment(c *gin.Context) {
	requirementID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный id предложения"})
		return
	}

	commentID, err := strconv.ParseUint(c.Param("commentId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный id комментария"})
		return
	}

	var req models.Requirement
	if err := h.db.First(&req, requirementID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	var comment models.Comment
	if err := h.db.
		Where("id = ? AND requirement_id = ?", commentID, requirementID).
		First(&comment).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": "Комментарий не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения комментария"})
		return
	}

	userName := c.GetString("userName")
	userOrg := c.GetString("userOrg")

	if err := h.db.Delete(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка удаления комментария"})
		return
	}

	// Пересчёт summary: берём последний комментарий (по времени создания).
	var lastComment models.Comment
	summary := ""
	err = h.db.
		Where("requirement_id = ?", requirementID).
		Order("created_at desc").
		First(&lastComment).
		Error
	if err == nil {
		summary = strings.TrimSpace(lastComment.CommentText)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения последнего комментария"})
		return
	}

	req.DiscussionSummary = summary
	req.LastEditedBy = userName
	req.LastEditedOrg = userOrg
	if err := h.db.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обновления карточки"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Комментарий удалён"})
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
	if queueNumber == 0 {
		return undefinedQueueName
	}
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

		// В разных версиях шаблонов/экспорта колонка очереди могла называться по-разному.
		// Алиасы нужны, чтобы импорт не падал из-за несовпадения заголовков.
		queueValue := getCellByHeader(row, headerMap,
			"Номер очереди при реализации",
			"Приоритет (очередь)",
			"Приоритет",
			"Очередь",
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

		systemCol := getCellByHeader(row, headerMap, "Система")
		sectionFromFile := getCellByHeader(row, headerMap, "Условное разделение")
		systemType, sectionName := parseImportSystemAndSection(systemCol, sectionFromFile)

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
			taskIdentifier, err = h.generateTaskIdentifier(
				systemType,
				normalizedQueue,
				contractName,
				sectionName,
				0,
			)
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
			SectionName:         sectionName,
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

		sequenceRaw := getCellByHeader(row, headerMap, "Порядковый номер", "Порядковый№", "№")
		var explicitSequence uint
		if strings.TrimSpace(sequenceRaw) != "" {
			sequenceValue, convErr := strconv.ParseUint(strings.TrimSpace(sequenceRaw), 10, 64)
			if convErr != nil || sequenceValue == 0 {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Строка %d: некорректный порядковый номер", lineNumber))
				continue
			}
			explicitSequence = uint(sequenceValue)
		}

		if err := h.db.Transaction(func(tx *gorm.DB) error {
			if explicitSequence > 0 {
				var n int64
				err := tx.Model(&models.Requirement{}).Where("sequence_number = ?", explicitSequence).Count(&n).Error
				if err != nil {
					return err
				}
				if n > 0 {
					return fmt.Errorf("порядковый номер уже используется")
				}
				item.SequenceNumber = explicitSequence
			} else {
				seq, err := h.nextSequenceNumber(tx)
				if err != nil {
					return err
				}
				item.SequenceNumber = seq
			}
			return tx.Create(&item).Error
		}); err != nil {
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

	query := h.db.Model(&models.Requirement{})

	archivedOnly := strings.TrimSpace(c.Query("archivedOnly")) == "true"
	includeArchivedParam := strings.TrimSpace(c.Query("includeArchived")) == "true"
	if archivedOnly {
		query = query.Where("is_archived = ?", true)
	} else if !includeArchivedParam {
		query = query.Where("is_archived = ?", false)
	}

	query = applyRequirementListScope(query, c)

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
		query = query.Where(
			"TRIM(COALESCE(nmck_point_text, '')) = '' AND TRIM(COALESCE(tz_point_text, '')) = ''",
		)
	}

	sortOrder := strings.ToLower(strings.TrimSpace(c.Query("sortOrder")))
	if sortOrder == "asc" {
		query = query.Order("sequence_number asc").Order("id asc")
	} else {
		query = query.Order("sequence_number desc").Order("id desc")
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
		"Порядковый номер",
		"Идентификатор задачи",
		"Краткое наименование предложения",
		"Инициатор предложения",
		"Ответственный за предложение",
		"Условное разделение",
		"Предложение",
		"Комментарии и описание проблем",
		"Обсуждение",
		"Приоритет (очередь)",
		"Примечание",
		"ГК",
		"П.п. ТЗ",
		"П.п. НМЦК",
		"Статус",
		"Система",
		"Дата создания",
		"Дата выполнения",
		"Письмо в ДИТ — номер исходящего",
		"Письмо в ДИТ — дата",
	}

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = file.SetCellValue(sheetName, cell, header)
	}

	for rowIndex, item := range items {
		row := rowIndex + 2

		values := []interface{}{
			item.SequenceNumber,
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
			item.CreatedAt.Format("02.01.2006 15:04"),
			formatTimePtrForExcel(item.CompletedAt),
			item.DitOutgoingNumber,
			formatDatePtrForExcel(item.DitOutgoingDate),
		}

		for colIndex, value := range values {
			cell, _ := excelize.CoordinatesToCellName(colIndex+1, row)
			_ = file.SetCellValue(sheetName, cell, value)
		}
	}

	_ = file.SetColWidth(sheetName, "A", "A", 14)
	_ = file.SetColWidth(sheetName, "B", "B", 20)
	_ = file.SetColWidth(sheetName, "C", "C", 40)
	_ = file.SetColWidth(sheetName, "D", "F", 24)
	_ = file.SetColWidth(sheetName, "G", "I", 50)
	_ = file.SetColWidth(sheetName, "J", "M", 28)
	_ = file.SetColWidth(sheetName, "N", "P", 22)

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

// DELETE /api/admin/requirements — удалить все предложения (только суперпользователь; маршрут в группе admin).
// Комментарии удаляются физически, предложения — мягкое удаление (как у одиночного DELETE).
func (h *RequirementHandler) DeleteAll(c *gin.Context) {
	var n int64
	if err := h.db.Model(&models.Requirement{}).Count(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка подсчёта записей"})
		return
	}

	if n == 0 {
		c.JSON(http.StatusOK, gin.H{"deleted": int64(0), "message": "Нет предложений для удаления"})
		return
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Comment{}).Error; err != nil {
			return err
		}
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Requirement{}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка массового удаления"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"deleted": n, "message": "Все предложения удалены"})
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
