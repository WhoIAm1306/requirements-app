// Package models — доменные сущности БД и DTO для JSON API (теги gorm/json).
package models

import (
	"time"

	"gorm.io/gorm"
)

// Requirement — основная сущность предложения.
type Requirement struct {
	ID                  uint   `gorm:"primaryKey" json:"id"`
	SequenceNumber      uint   `gorm:"index" json:"sequenceNumber"`
	TaskIdentifier      string `gorm:"size:255;index" json:"taskIdentifier"`
	ShortName           string `gorm:"type:text" json:"shortName"`
	Initiator           string `gorm:"size:255" json:"initiator"`
	ResponsiblePerson   string `gorm:"size:255" json:"responsiblePerson"`
	SectionName         string `gorm:"size:255" json:"sectionName"`
	ProposalText        string `gorm:"type:text" json:"proposalText"`
	ProblemComment      string `gorm:"type:text" json:"problemComment"`
	DiscussionSummary   string `gorm:"type:text" json:"discussionSummary"`
	ImplementationQueue string `gorm:"size:100;index" json:"implementationQueue"`
	ContractName        string `gorm:"size:255;index" json:"contractName"`
	// ContractTZFunctionID — привязка выбранной функции ТЗ (по этапу/номер раздела/наименование).
	// Заполняется при выборе функции в форме ГК.
	ContractTZFunctionID *uint  `gorm:"index" json:"contractTZFunctionId"`
	NoteText             string `gorm:"type:text" json:"noteText"`
	// TZPointText — отображаемый п.п. ТЗ (вручную или из функции справочника).
	TZPointText string `gorm:"type:text" json:"tzPointText"`
	// NmckPointText — п.п. НМЦК (вручную или номер по НМЦК из функции).
	NmckPointText string `gorm:"type:text" json:"nmckPointText"`
	StatusText    string `gorm:"size:100" json:"statusText"`
	// SystemType — только «112» или «101»; раздел «Телефония» задаётся в SectionName.
	SystemType string `gorm:"size:50;index" json:"systemType"`
	// CompletedAt — дата выполнения (автоматически при первом переводе в «Выполнено», можно править вручную).
	CompletedAt *time.Time `json:"completedAt"`
	// DitOutgoingNumber / DitOutgoingDate — письмо в ДИТ (исходящий номер и дата).
	DitOutgoingNumber string                  `gorm:"size:255" json:"ditOutgoingNumber"`
	DitOutgoingDate   *time.Time              `json:"ditOutgoingDate"`
	AuthorName        string                  `gorm:"size:255" json:"authorName"`
	AuthorOrg         string                  `gorm:"size:50" json:"authorOrg"`
	CreatedAt         time.Time               `json:"createdAt"`
	UpdatedAt         time.Time               `json:"updatedAt"`
	LastEditedBy      string                  `gorm:"size:255" json:"lastEditedBy"`
	LastEditedOrg     string                  `gorm:"size:50" json:"lastEditedOrg"`
	IsArchived        bool                    `gorm:"default:false;index" json:"isArchived"`
	ArchivedAt        *time.Time              `json:"archivedAt"`
	ArchivedReason    string                  `gorm:"size:30" json:"archivedReason"`
	ArchivedBy        string                  `gorm:"size:255" json:"archivedBy"`
	ArchivedByOrg     string                  `gorm:"size:50" json:"archivedByOrg"`
	DeletedAt         gorm.DeletedAt          `gorm:"index" json:"-"`
	Comments          []Comment               `json:"comments,omitempty"`
	Attachments       []RequirementAttachment `json:"attachments,omitempty"`
}

// RequirementAttachmentLibrary — глобальное хранилище файлов для повторного прикрепления к предложениям.
type RequirementAttachmentLibrary struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	OriginalFileName string    `gorm:"size:255;index" json:"originalFileName"`
	StoredFileName   string    `gorm:"size:255" json:"-"`
	ContentType      string    `gorm:"size:255" json:"contentType"`
	FilePath         string    `gorm:"size:1024" json:"-"`
	UploadedByName   string    `gorm:"size:255" json:"uploadedByName"`
	UploadedByOrg    string    `gorm:"size:50" json:"uploadedByOrg"`
	CreatedAt        time.Time `json:"createdAt"`
	LastUsedAt       time.Time `json:"lastUsedAt"`
}

// RequirementAttachment — связь предложения с файлом из библиотеки (один файл может быть у нескольких предложений).
type RequirementAttachment struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	RequirementID uint      `gorm:"uniqueIndex:uniq_req_library_file;index;not null" json:"requirementId"`
	LibraryFileID uint      `gorm:"uniqueIndex:uniq_req_library_file;index;not null" json:"libraryFileId"`
	CreatedAt     time.Time `json:"createdAt"`

	LibraryFile *RequirementAttachmentLibrary `gorm:"foreignKey:LibraryFileID" json:"libraryFile,omitempty"`
}

// Comment — комментарий внутри карточки предложения.
type Comment struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	RequirementID uint      `gorm:"index" json:"requirementId"`
	CommentText   string    `gorm:"type:text" json:"commentText"`
	AuthorName    string    `gorm:"size:255" json:"authorName"`
	AuthorOrg     string    `gorm:"size:50" json:"authorOrg"`
	CreatedAt     time.Time `json:"createdAt"`
}

// TZPoint — справочник пунктов ТЗ.
type TZPoint struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Code      string    `gorm:"size:100" json:"code"`
	Text      string    `gorm:"type:text" json:"text"`
	CreatedAt time.Time `json:"createdAt"`
}

// AuthorDictionary — справочник ФИО для подсказок.
type AuthorDictionary struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	FullName  string    `gorm:"size:255;uniqueIndex" json:"fullName"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

// QueueDictionary — справочник очередей.
type QueueDictionary struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Number    int       `gorm:"uniqueIndex" json:"number"`
	Name      string    `gorm:"size:100;uniqueIndex" json:"name"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

// ContractDictionary — справочник контрактов / ГК.
type ContractDictionary struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"size:255;uniqueIndex" json:"name"`
	// Number — номер/код ГК для отображения и редактирования.
	Number string `gorm:"size:120;index" json:"number"`
	// ShortName — краткое наименование для отображения и (опционально) для идентификатора ПОВ.
	ShortName string `gorm:"size:120" json:"shortName"`
	// UseShortNameInTaskID — учитывать краткое наименование в идентификаторе: ПОВ.<краткое>.<очередь>.<порядок>.
	UseShortNameInTaskID bool      `gorm:"default:false" json:"useShortNameInTaskId"`
	Description          string    `gorm:"type:text" json:"description"`
	IsActive             bool      `gorm:"default:true" json:"isActive"`
	CreatedAt            time.Time `json:"createdAt"`
}

// ContractStage — этапы внутри ГК.
// Этапы нумеруются числами: этап 1, этап 2, ...
type ContractStage struct {
	ID          uint                 `gorm:"primaryKey" json:"id"`
	ContractID  uint                 `gorm:"index;uniqueIndex:idx_contract_stage_number" json:"contractId"`
	StageNumber int                  `gorm:"uniqueIndex:idx_contract_stage_number" json:"stageNumber"`
	StageName   string               `gorm:"size:255" json:"stageName"`
	Functions   []ContractTZFunction `gorm:"foreignKey:ContractStageID" json:"functions,omitempty"`
	CreatedAt   time.Time            `json:"createdAt"`
	UpdatedAt   time.Time            `json:"updatedAt"`
}

// ContractTZFunction — функция ТЗ, привязанная к ГК и этапу.
type ContractTZFunction struct {
	ID uint `gorm:"primaryKey" json:"id"`

	ContractID      uint `gorm:"index" json:"contractId"`
	ContractStageID uint `gorm:"uniqueIndex:idx_stage_fn_nmck_tzsection" json:"contractStageId"`

	FunctionName string `gorm:"type:text" json:"functionName"`
	// NMCKFunctionNumber — номер функции по НМЦК.
	// Может быть дробным/структурным форматом (например, "1.1.2"), поэтому хранится строкой.
	NMCKFunctionNumber string `gorm:"uniqueIndex:idx_stage_fn_nmck_tzsection" json:"nmckFunctionNumber"`
	TZSectionNumber    string `gorm:"size:100;uniqueIndex:idx_stage_fn_nmck_tzsection" json:"tzSectionNumber"`
	// JiraLink — опциональная ссылка на задачу в Jira.
	JiraLink string `gorm:"type:text" json:"jiraLink"`
	// ConfluenceLinks — набор ссылок на документацию Confluence.
	ConfluenceLinks []string `gorm:"type:jsonb;serializer:json;default:'[]'" json:"confluenceLinks"`
	// JiraEpicLinks — набор ссылок на Jira-эпики.
	JiraEpicLinks []string `gorm:"type:jsonb;serializer:json;default:'[]'" json:"jiraEpicLinks"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ContractAttachment — прикрепленные файлы к ГК (ТЗ / НМЦК).
type ContractAttachment struct {
	ID uint `gorm:"primaryKey" json:"id"`

	ContractID uint `gorm:"index" json:"contractId"`

	// Type: "tz" | "nmck"
	Type string `gorm:"size:10;index" json:"type"`

	OriginalFileName string `gorm:"size:255" json:"originalFileName"`
	StoredFileName   string `gorm:"size:255" json:"storedFileName"`
	ContentType      string `gorm:"size:255" json:"contentType"`
	FilePath         string `gorm:"size:1024" json:"filePath"`

	CreatedAt time.Time `json:"createdAt"`
}

// User — корпоративный пользователь системы.
type User struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	FullName     string `gorm:"size:255" json:"fullName"`
	Organization string `gorm:"size:50" json:"organization"`
	Email        string `gorm:"size:255;uniqueIndex" json:"email"`
	PasswordHash string `gorm:"size:255" json:"-"`
	AccessLevel  string `gorm:"size:20" json:"accessLevel"` // read / edit
	// RequirementFieldGrants — JSON-объект флагов (comment, shortName, attachments, …) при access read.
	RequirementFieldGrants string `gorm:"type:jsonb;default:'{}'" json:"requirementFieldGrants"`
	// GKDirectoryGrants — JSON-объект прав на справочник ГК (gkContractEdit / gkStageEdit / gkFunctionEdit).
	GKDirectoryGrants string    `gorm:"type:jsonb;default:'{}'" json:"gkDirectoryGrants"`
	IsSuperuser       bool      `gorm:"default:false" json:"isSuperuser"`
	IsActive          bool      `gorm:"default:true" json:"isActive"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// AppSetting — key/value хранилище глобальных настроек приложения.
type AppSetting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Key       string    `gorm:"size:100;uniqueIndex" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
