package models

import "time"

// Requirement — основная сущность предложения.
type Requirement struct {
	ID                  uint       `gorm:"primaryKey" json:"id"`
	TaskIdentifier      string     `gorm:"size:100;index" json:"taskIdentifier"`
	ShortName           string     `gorm:"type:text" json:"shortName"`
	Initiator           string     `gorm:"size:255" json:"initiator"`
	ResponsiblePerson   string     `gorm:"size:255" json:"responsiblePerson"`
	SectionName         string     `gorm:"size:255" json:"sectionName"`
	ProposalText        string     `gorm:"type:text" json:"proposalText"`
	ProblemComment      string     `gorm:"type:text" json:"problemComment"`
	DiscussionSummary   string     `gorm:"type:text" json:"discussionSummary"`
	ImplementationQueue string     `gorm:"size:100;index" json:"implementationQueue"`
	ContractName        string     `gorm:"size:255;index" json:"contractName"`
	NoteText            string     `gorm:"type:text" json:"noteText"`
	TZPointText         string     `gorm:"type:text" json:"tzPointText"`
	StatusText          string     `gorm:"size:100" json:"statusText"`
	SystemType          string     `gorm:"size:50;index" json:"systemType"`
	AuthorName          string     `gorm:"size:255" json:"authorName"`
	AuthorOrg           string     `gorm:"size:50" json:"authorOrg"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
	LastEditedBy        string     `gorm:"size:255" json:"lastEditedBy"`
	LastEditedOrg       string     `gorm:"size:50" json:"lastEditedOrg"`
	IsArchived          bool       `gorm:"default:false;index" json:"isArchived"`
	ArchivedAt          *time.Time `json:"archivedAt"`
	ArchivedBy          string     `gorm:"size:255" json:"archivedBy"`
	ArchivedByOrg       string     `gorm:"size:50" json:"archivedByOrg"`
	Comments            []Comment  `json:"comments,omitempty"`
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
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:255;uniqueIndex" json:"name"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

// User — корпоративный пользователь системы.
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	FullName     string    `gorm:"size:255" json:"fullName"`
	Organization string    `gorm:"size:50" json:"organization"`
	Email        string    `gorm:"size:255;uniqueIndex" json:"email"`
	PasswordHash string    `gorm:"size:255" json:"-"`
	AccessLevel  string    `gorm:"size:20" json:"accessLevel"` // read / edit
	IsSuperuser  bool      `gorm:"default:false" json:"isSuperuser"`
	IsActive     bool      `gorm:"default:true" json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
