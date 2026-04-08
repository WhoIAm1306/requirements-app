package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"requirements-app/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type requirementAttachmentLibraryDTO struct {
	ID               uint      `json:"id"`
	OriginalFileName string    `json:"originalFileName"`
	ContentType      string    `json:"contentType"`
	UploadedByName   string    `json:"uploadedByName"`
	UploadedByOrg    string    `json:"uploadedByOrg"`
	CreatedAt        time.Time `json:"createdAt"`
	LastUsedAt       time.Time `json:"lastUsedAt"`
}

// GET /api/requirements/attachment-library?q=
func (h *RequirementHandler) ListRequirementAttachmentLibrary(c *gin.Context) {
	q := strings.TrimSpace(c.Query("search"))
	if c.Query("q") != "" && q == "" {
		q = strings.TrimSpace(c.Query("q"))
	}

	tx := h.db.Model(&models.RequirementAttachmentLibrary{}).Order("last_used_at desc").Limit(80)
	if q != "" {
		like := "%" + strings.ToLower(q) + "%"
		tx = tx.Where("LOWER(original_file_name) LIKE ?", like)
	}

	var rows []models.RequirementAttachmentLibrary
	if err := tx.Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка чтения библиотеки файлов"})
		return
	}

	out := make([]requirementAttachmentLibraryDTO, 0, len(rows))
	for _, r := range rows {
		out = append(out, requirementAttachmentLibraryDTO{
			ID:               r.ID,
			OriginalFileName: r.OriginalFileName,
			ContentType:      r.ContentType,
			UploadedByName:   r.UploadedByName,
			UploadedByOrg:    r.UploadedByOrg,
			CreatedAt:        r.CreatedAt,
			LastUsedAt:       r.LastUsedAt,
		})
	}
	c.JSON(http.StatusOK, out)
}

type attachFromLibraryBody struct {
	LibraryFileID uint `json:"libraryFileId"`
}

// POST /api/requirements/:id/attachments/from-library
func (h *RequirementHandler) AttachRequirementFromLibrary(c *gin.Context) {
	reqID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный id предложения"})
		return
	}
	reqID := uint(reqID64)

	var body attachFromLibraryBody
	if err := c.ShouldBindJSON(&body); err != nil || body.LibraryFileID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Укажите libraryFileId"})
		return
	}

	var reqRow models.Requirement
	if err := h.db.First(&reqRow, reqID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	var lib models.RequirementAttachmentLibrary
	if err := h.db.First(&lib, body.LibraryFileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Файл в библиотеке не найден"})
		return
	}

	var dup int64
	if err := h.db.Model(&models.RequirementAttachment{}).
		Where("requirement_id = ? AND library_file_id = ?", reqID, body.LibraryFileID).
		Count(&dup).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки вложений"})
		return
	}
	if dup > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Этот файл уже прикреплён к предложению"})
		return
	}

	now := time.Now()
	lib.LastUsedAt = now
	if err := h.db.Save(&lib).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить метку использования файла"})
		return
	}

	link := models.RequirementAttachment{
		RequirementID: reqID,
		LibraryFileID: lib.ID,
	}
	if err := h.db.Create(&link).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось прикрепить файл"})
		return
	}

	if err := h.db.Preload("LibraryFile").First(&link, link.ID).Error; err != nil {
		c.JSON(http.StatusCreated, link)
		return
	}
	c.JSON(http.StatusCreated, link)
}

// POST /api/requirements/:id/attachments (multipart, поле files или file)
func (h *RequirementHandler) UploadRequirementAttachments(c *gin.Context) {
	reqIDStr := strings.TrimSpace(c.Param("id"))
	reqID64, err := strconv.ParseUint(reqIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный id предложения"})
		return
	}
	reqID := uint(reqID64)

	var reqRow models.Requirement
	if err := h.db.First(&reqRow, reqID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предложение не найдено"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файлы не переданы"})
		return
	}
	files := form.File["files"]
	if len(files) == 0 {
		files = form.File["file"]
	}
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Файлы не переданы"})
		return
	}

	baseDir := filepath.Join(".", "uploads", "requirements", "library")
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать каталог для файлов"})
		return
	}

	userName := strings.TrimSpace(c.GetString("userName"))
	userOrg := strings.TrimSpace(c.GetString("userOrg"))
	now := time.Now()
	created := 0

	for _, fh := range files {
		if fh == nil {
			continue
		}
		if !isAllowedContractAttachmentExt(fh.Filename) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Неподдерживаемое расширение файла: " + fh.Filename})
			return
		}

		ext := filepath.Ext(fh.Filename)
		original := filepath.Base(fh.Filename)
		storedName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), strings.TrimSuffix(original, ext), ext)
		storedPath := filepath.Join(baseDir, storedName)

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

		lib := models.RequirementAttachmentLibrary{
			OriginalFileName: original,
			StoredFileName:   storedName,
			ContentType:      contentType,
			FilePath:         storedPath,
			UploadedByName:   userName,
			UploadedByOrg:    userOrg,
			CreatedAt:        now,
			LastUsedAt:       now,
		}

		err = h.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&lib).Error; err != nil {
				return err
			}
			link := models.RequirementAttachment{
				RequirementID: reqID,
				LibraryFileID: lib.ID,
			}
			return tx.Create(&link).Error
		})
		if err != nil {
			_ = os.Remove(storedPath)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения вложения"})
			return
		}
		created++
	}

	c.JSON(http.StatusOK, gin.H{"created": created})
}

// GET /api/requirements/attachments/:attachmentId/download
func (h *RequirementHandler) DownloadRequirementAttachment(c *gin.Context) {
	attachmentID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("attachmentId")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный attachmentId"})
		return
	}

	var link models.RequirementAttachment
	if err := h.db.Preload("LibraryFile").First(&link, uint(attachmentID64)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Вложение не найдено"})
		return
	}
	if link.LibraryFile == nil || strings.TrimSpace(link.LibraryFile.FilePath) == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Файл не найден на сервере"})
		return
	}

	orig := link.LibraryFile.OriginalFileName
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", orig))
	if link.LibraryFile.ContentType != "" {
		c.Header("Content-Type", link.LibraryFile.ContentType)
	}
	c.File(link.LibraryFile.FilePath)
}

// DELETE /api/requirements/attachments/:attachmentId — только связь с предложением; запись в библиотеке сохраняется.
func (h *RequirementHandler) DeleteRequirementAttachment(c *gin.Context) {
	attachmentID64, err := strconv.ParseUint(strings.TrimSpace(c.Param("attachmentId")), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный attachmentId"})
		return
	}

	if err := h.db.Delete(&models.RequirementAttachment{}, uint(attachmentID64)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось удалить вложение"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Вложение откреплено"})
}
