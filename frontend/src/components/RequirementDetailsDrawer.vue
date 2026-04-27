<template>
  <el-dialog
    class="requirement-details-drawer proposal-modal-theme"
    :model-value="modelValue"
    width="min(1600px, 96vw)"
    top="2vh"
    :show-close="false"
    destroy-on-close
    align-center
    @close="emit('update:modelValue', false)"
  >
    <div v-loading="loading" class="drawer-body">
      <template v-if="item">
        <div class="drawer-top-sticky">
          <div class="top-bar">
            <div class="top-title-block">
              <h2 class="top-title">Карточка предложения</h2>
              <span class="top-task-id">{{ item.taskIdentifier || `#${item.id}` }}</span>
            </div>

            <div class="top-actions-grid">
              <el-button
                v-if="canManageRequirementCard"
                class="top-btn-save"
                type="primary"
                :loading="saveLoading"
                @click="handleSave"
              >
                Сохранить
              </el-button>
              <template v-if="canFullEdit">
                <el-button
                  v-if="!item.isArchived"
                  class="top-btn-secondary"
                  :loading="actionLoading"
                  @click="handleArchive"
                >
                  В архив
                </el-button>
                <el-button
                  v-else
                  class="top-btn-secondary"
                  :loading="actionLoading"
                  @click="handleRestore"
                >
                  Восстановить
                </el-button>
              </template>
              <el-tooltip v-if="canDeleteRequirements" content="Удалить" placement="bottom">
                <el-button
                  class="top-btn-delete"
                  plain
                  size="small"
                  :icon="Delete"
                  :loading="deleteLoading"
                  circle
                  @click="handleDeleteRequirement"
                />
              </el-tooltip>
              <span class="top-actions-divider" />
              <el-button class="top-btn-close" circle plain @click="emit('update:modelValue', false)">
                <CloseL :size="16" />
              </el-button>
            </div>
          </div>

          <div class="meta-line-top">
            <span class="meta-chip"><HashL :size="12" /><b>ID:</b>&nbsp;{{ item.taskIdentifier || `#${item.id}` }}</span>
            <span class="meta-chip"><UserL :size="12" /><b>Автор:</b>&nbsp;{{ item.authorName || '—' }}</span>
            <span class="meta-chip"><Building2L :size="12" /><b>Орг.:</b>&nbsp;{{ item.authorOrg || '—' }}</span>
            <span class="meta-chip"><PenL :size="12" /><b>Редактор:</b>&nbsp;{{ item.lastEditedBy || '—' }} / {{ item.lastEditedOrg || '—' }}</span>
            <span class="meta-chip"><ClockL :size="12" /><b>Обновлено:</b>&nbsp;{{ formatDateTime(item.updatedAt) }}</span>
            <span class="meta-chip"><CalendarL :size="12" /><b>Создано:</b>&nbsp;{{ formatDateOnly(item.createdAt) }}</span>
            <span class="meta-chip meta-chip--highlight"><AlertCircleL :size="12" /><b>Выполнить до:</b>&nbsp;{{ item.completedAt ? formatDateOnly(item.completedAt) : '—' }}</span>
          </div>

          <div
            v-if="archiveNotice"
            class="archive-notice-inline"
            :class="archiveNotice.type === 'completed' ? 'archive-notice-inline--completed' : 'archive-notice-inline--outdated'"
          >
            <el-icon v-if="archiveNotice.type === 'completed'"><SuccessFilled /></el-icon>
            <el-icon v-else><InfoFilled /></el-icon>
            <span>{{ archiveNotice.text }}</span>
          </div>
        </div>

        <div class="drawer-content-scroll">
        <!--
          Режим редактирования:
          поля доступны только пользователю с правом edit / superuser.
        -->
        <template v-if="canManageRequirementCard">
          <el-tabs v-model="detailsCardTab" class="details-drawer-editor-tabs">
            <el-tab-pane label="Предложение" name="proposal">
          <el-form label-position="top" class="details-form">
            <div class="editor-layout">
              <section class="editor-pane editor-pane--left">
                <div class="editor-section editor-section--main-data">
                  <div class="editor-section__title">Основные данные</div>
                  <el-row :gutter="14">
                    <el-col :span="24">
                      <el-form-item label="Идентификатор задачи">
                        <el-input
                          v-model="form.taskIdentifier"
                          placeholder="Уникальный идентификатор"
                          :disabled="!canFullEdit"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Краткое наименование предложения">
                        <el-input v-model="form.shortName" :disabled="fieldDisabled('shortName')" />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Инициатор">
                        <el-input v-model="form.initiator" :disabled="fieldDisabled('initiator')" />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Ответственный">
                        <el-input
                          v-model="form.responsiblePerson"
                          :disabled="fieldDisabled('responsiblePerson')"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Раздел">
                        <el-select
                          v-model="form.sectionName"
                          style="width: 100%"
                          filterable
                          allow-create
                          default-first-option
                          placeholder="Например, Телефония или свой текст"
                          :disabled="fieldDisabled('sectionName')"
                        >
                          <el-option :label="TELEPHONY_SECTION" :value="TELEPHONY_SECTION" />
                        </el-select>
                        <div v-if="isTelephonySectionName(form.sectionName)" class="field-hint">
                          Для раздела «{{ TELEPHONY_SECTION }}» выберите систему 112 или 101 в поле «Система».
                        </div>
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Приоритет">
                        <el-select
                          v-model="form.implementationQueue"
                          style="width: 100%"
                          :disabled="fieldDisabled('implementationQueue')"
                        >
                          <el-option
                            v-for="queue in queues"
                            :key="queue.id"
                            :label="queue.name"
                            :value="queue.name"
                          />
                          <template #footer>
                            <div class="queue-select-footer">
                              <el-button
                                class="queue-select-add-btn"
                                text
                                :disabled="fieldDisabled('implementationQueue')"
                                @click="openAddQueueDialog"
                              >
                                <span class="queue-select-add-btn__plus">+</span>
                                <span>Добавить новую очередь</span>
                              </el-button>
                            </div>
                          </template>
                        </el-select>
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Статус">
                        <el-select
                          v-model="form.statusText"
                          style="width: 100%"
                          filterable
                          allow-create
                          default-first-option
                          :disabled="fieldDisabled('statusText')"
                        >
                          <el-option
                            v-for="s in STANDARD_REQUIREMENT_STATUSES"
                            :key="s"
                            :label="s"
                            :value="s"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Система">
                        <el-select
                          v-model="form.systemType"
                          style="width: 100%"
                          :disabled="fieldDisabled('systemType')"
                          @change="onSystemTypeChange"
                        >
                          <el-option
                            v-for="opt in SYSTEM_TYPE_OPTIONS"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>

                    <el-col :span="12">
                      <el-form-item label="Дата выполнения">
                        <el-date-picker
                          v-model="form.completedAt"
                          type="date"
                          style="width: 100%"
                          value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                          clearable
                          placeholder="По умолчанию при статусе «Выполнено»"
                          :disabled="fieldDisabled('completedAt')"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="editor-section editor-section--content">
                  <div class="editor-section__title">Содержание предложения</div>
                  <el-form-item label="Предложение">
                    <el-input
                      v-model="form.proposalText"
                      type="textarea"
                      :autosize="{ minRows: 4, maxRows: 16 }"
                      :disabled="fieldDisabled('proposalText')"
                      class="drawer-textarea-tall"
                    />
                  </el-form-item>

                  <el-form-item label="Комментарии и описание проблем">
                    <el-input
                      v-model="form.problemComment"
                      type="textarea"
                      :autosize="{ minRows: 4, maxRows: 16 }"
                      :disabled="fieldDisabled('problemComment')"
                      class="drawer-textarea-tall"
                    />
                  </el-form-item>

                  <el-form-item label="Обсуждение">
                    <el-input
                      v-model="form.discussionSummary"
                      type="textarea"
                      :autosize="{ minRows: 4, maxRows: 16 }"
                      :disabled="fieldDisabled('discussionSummary')"
                      class="drawer-textarea-tall"
                    />
                  </el-form-item>

                  <el-form-item label="Примечание">
                    <el-input
                      v-model="form.noteText"
                      type="textarea"
                      :autosize="{ minRows: 1, maxRows: 12 }"
                      class="note-textarea"
                      :disabled="fieldDisabled('noteText')"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="editor-pane editor-pane--right">
                <div class="editor-section editor-section--binding">
                  <div class="editor-section__title">Привязка к ГК и функции</div>
                  <el-form-item label="ГК">
                    <el-select
                      v-model="form.contractName"
                      placeholder="Выберите или введите наименование ГК"
                      style="width: 100%"
                      filterable
                      allow-create
                      default-first-option
                      clearable
                      :disabled="fieldDisabled('contractGk')"
                      @change="onContractChange"
                    >
                      <el-option
                        v-for="c in contractSelectOptions"
                        :key="`${c.id}-${c.name}`"
                        :label="c.name"
                        :value="c.name"
                      />
                      <template #empty>
                        <span class="select-empty">В справочнике пока нет ГК — введите наименование вручную.</span>
                      </template>
                    </el-select>
                  </el-form-item>

                  <div class="binding-grid">
                    <el-form-item label="Этап" class="binding-stage">
                      <el-select
                        v-model="selectedStageNumber"
                        placeholder="Сначала выберите ГК"
                        style="width: 100%"
                        :disabled="!selectedContractId || fieldDisabled('contractGk')"
                        filterable
                        @change="handleStageChange"
                      >
                        <el-option
                          v-for="stage in stages"
                          :key="stage.id"
                          :label="stage.stageName || `Этап ${stage.stageNumber}`"
                          :value="stage.stageNumber"
                        />
                        <template #empty>
                          <span class="select-empty">К выбранной ГК не добавлены этапы (справочник ГК).</span>
                        </template>
                      </el-select>
                    </el-form-item>

                    <div class="tz-mode-toggle">
                      <label class="tz-mode-toggle__row">
                        <span class="tz-mode-toggle__label">Выбрать через ТЗ</span>
                        <el-switch
                          v-model="selectViaTz"
                          :disabled="!selectedStageNumber || fieldDisabled('contractGk')"
                        />
                      </label>
                    </div>

                    <el-form-item label="п.п. НМЦК" class="binding-field binding-field--nmck">
                      <el-select
                        v-model="selectedNmckFunctionId"
                        :placeholder="selectViaTz ? 'Сначала выберите п.п. ТЗ' : 'Сначала выберите этап'"
                        style="width: 100%"
                        :disabled="nmckSelectDisabled || fieldDisabled('contractGk')"
                        filterable
                        clearable
                        @change="handleNmckSelected"
                      >
                        <el-option
                          v-for="opt in nmckFunctionOptions"
                          :key="opt.value"
                          :label="opt.label"
                          :value="opt.value"
                        />
                        <template #empty>
                          <span class="select-empty">{{ nmckEmptyText }}</span>
                        </template>
                      </el-select>
                    </el-form-item>

                    <el-form-item label="п.п. ТЗ" class="binding-field binding-field--tz">
                      <el-select
                        v-if="selectViaTz"
                        v-model="selectedTzSectionNumber"
                        placeholder="Сначала выберите этап"
                        style="width: 100%"
                        :disabled="!selectedStageNumber || fieldDisabled('contractGk')"
                        filterable
                        clearable
                        @change="handleTzSelected"
                      >
                        <el-option
                          v-for="opt in tzSectionOptions"
                          :key="opt.value"
                          :label="opt.label"
                          :value="opt.value"
                        />
                        <template #empty>
                          <span class="select-empty">Для выбранного этапа нет пунктов ТЗ.</span>
                        </template>
                      </el-select>
                      <el-input
                        v-else
                        :model-value="form.tzPointText"
                        readonly
                        placeholder="Подставится после выбора п.п. НМЦК"
                        class="tz-autofill-input"
                      />
                    </el-form-item>
                  </div>
                </div>

                <div class="editor-section editor-section--dit">
                  <div class="editor-section__title">Письмо в ДИТ</div>

                  <el-form-item label="Письмо в ДИТ — номер исходящего">
                    <el-input
                      v-model="form.ditOutgoingNumber"
                      clearable
                      :disabled="fieldDisabled('ditOutgoing')"
                    />
                  </el-form-item>

                  <el-form-item label="Письмо в ДИТ — дата">
                    <el-date-picker
                      v-model="form.ditOutgoingDate"
                      type="date"
                      style="width: 100%"
                      value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                      clearable
                      :disabled="fieldDisabled('ditOutgoing')"
                    />
                  </el-form-item>
                </div>

                <section class="content-section content-section--attachments dual-panel">
                  <div class="content-section__head">
                    <h4 class="content-section__title">Вложения</h4>
                  </div>
                  <div class="dual-panel__body">
                    <div class="attachments-block">
                      <el-empty
                        v-if="!item.attachments?.length"
                        description="Файлов пока нет"
                        :image-size="0"
                      />

                      <div v-else class="attachments-list">
                        <div v-for="att in item.attachments" :key="att.id" class="attachment-row">
                          <span class="attachment-file-icon" :class="attachmentIconTone(att)">{{ attachmentExt(att) }}</span>
                          <div class="attachment-main">
                            <span class="attachment-name">{{ att.libraryFile?.originalFileName || 'Файл' }}</span>
                            <span class="attachment-meta">{{ formatDateTime(att.createdAt) }}</span>
                          </div>
                          <div class="attachment-actions">
                            <el-button class="attachment-download-btn" size="small" @click="downloadAttachment(att)">
                              <el-icon><Download /></el-icon>
                            </el-button>
                            <el-button
                              v-if="canEditAttachments"
                              class="attachment-detach-btn"
                              size="small"
                              type="danger"
                              link
                              :loading="detachLoadingId === att.id"
                              @click="confirmDetachAttachment(att)"
                            >
                              <el-icon><CloseBold /></el-icon>
                            </el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <template v-if="canEditAttachments">
                    <div class="attachments-toolbar dual-panel__footer">
                      <input
                        ref="reqFileInputRef"
                        type="file"
                        multiple
                        class="visually-hidden"
                        accept=".docx,.xls,.xlsx,.xlsm,.doc,.pdf,.msg,.pst"
                        @change="onReqAttachmentFilesPicked"
                      />
                      <el-button
                        type="primary"
                        class="attachments-upload-btn"
                        :loading="attachmentsUploading"
                        @click="triggerReqAttachmentFilePick"
                      >
                        <el-icon><Plus /></el-icon>
                        <span>Загрузить файлы</span>
                      </el-button>
                      <span class="attachments-hint">
                        Допустимые форматы: doc, docx, pdf, xls, xlsx, xlsm, msg, pst. Загруженные файлы сохраняются в
                        общую библиотеку — их можно снова прикрепить к другим предложениям.
                      </span>

                      <div class="library-attach-block">
                        <div class="library-attach-label">Ранее используемые файлы</div>
                        <el-select
                          v-model="libraryPickValue"
                          filterable
                          remote
                          clearable
                          reserve-keyword
                          placeholder="Поиск по имени файла — прикрепить без повторной загрузки"
                          :remote-method="searchRequirementLibraryRemote"
                          :loading="libraryLoading"
                          style="width: 100%"
                          @visible-change="onRequirementLibraryDropdownVisible"
                          @change="onRequirementLibraryPicked"
                        >
                          <el-option
                            v-for="opt in libraryOptions"
                            :key="opt.id"
                            :label="requirementLibraryOptionLabel(opt)"
                            :value="opt.id"
                            :disabled="isLibraryFileAlreadyAttached(opt.id)"
                          />
                        </el-select>
                      </div>
                    </div>
                  </template>
                </section>

              </section>

            </div>
          </el-form>
            </el-tab-pane>

            <el-tab-pane label="Функция" name="function">
              <div class="drawer-fn-tab">
                <el-empty
                  v-if="!currentGkFunction"
                  description="Функция не привязана. На вкладке «Предложение» выберите ГК, этап и функцию по НМЦК или пункт ТЗ."
                  :image-size="48"
                />
                <template v-else>
                  <section class="drawer-fn-tab__params">
                    <h4 class="drawer-fn-tab__title">Параметры функции</h4>
                    <div class="drawer-fn-tab__fields">
                      <div class="drawer-fn-field">
                        <span class="drawer-fn-field__label">Наименование функции</span>
                        <el-input v-model="fnTabForm.functionName" disabled />
                      </div>
                      <div class="drawer-fn-field">
                        <span class="drawer-fn-field__label">Номер функции по НМЦК</span>
                        <el-input v-model="fnTabForm.nmckFunctionNumber" disabled />
                      </div>
                      <div class="drawer-fn-field">
                        <span class="drawer-fn-field__label">Номер раздела по ТЗ</span>
                        <el-input v-model="fnTabForm.tzSectionNumber" disabled />
                      </div>
                    </div>
                  </section>

                  <section class="drawer-fn-tab__links">
                    <h4 class="drawer-fn-tab__title">Ссылки</h4>
                    <div class="drawer-fn-links-grid">
                      <article class="drawer-fn-links-card">
                        <div class="drawer-fn-links-card__title">Confluence</div>
                        <div class="drawer-fn-link-add-row">
                          <el-input v-model="fnTabNewConfluenceLink" placeholder="https://confluence..." />
                          <el-button type="primary" plain @click="fnTabAddConfluenceLink">Добавить</el-button>
                        </div>
                        <div
                          v-if="!(fnTabForm.confluenceLinks || []).length"
                          class="drawer-fn-links-empty"
                        >
                          Ссылки не добавлены
                        </div>
                        <div v-else class="drawer-fn-links-list">
                          <div v-for="(link, idx) in fnTabForm.confluenceLinks" :key="`cf-${idx}`" class="drawer-fn-link-row">
                            <a
                              :href="fnTabLinkHref(link)"
                              class="drawer-fn-link-view"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {{ link }}
                            </a>
                            <el-button type="danger" plain @click="fnTabRemoveConfluenceLink(idx)">Удалить</el-button>
                          </div>
                        </div>
                      </article>

                      <article class="drawer-fn-links-card">
                        <div class="drawer-fn-links-card__title">Jira Epic</div>
                        <div class="drawer-fn-link-add-row">
                          <el-input
                            v-model="fnTabNewJiraEpicLink"
                            placeholder="https://jira.../browse/KEY-123"
                          />
                          <el-button type="primary" plain @click="fnTabAddJiraEpicLink">Добавить</el-button>
                        </div>
                        <div v-if="!functionTabEpicLinks.length" class="drawer-fn-links-empty">
                          Ссылки не добавлены
                        </div>
                        <div v-else class="drawer-fn-epic-list">
                          <div
                            v-for="(link, idx) in functionTabEpicLinks"
                            :key="`je-${idx}`"
                            class="drawer-fn-epic-card"
                            role="link"
                            tabindex="0"
                            @click="fnTabOpenEpic(link)"
                            @keydown.enter.prevent="fnTabOpenEpic(link)"
                          >
                            <div class="drawer-fn-epic-card__head">
                              <span class="drawer-fn-epic-card__key">{{
                                fnTabStatusForLink(link)?.epicKey || fnTabExtractEpicKey(link) || link
                              }}</span>
                              <el-button
                                type="danger"
                                plain
                                size="small"
                                @click.stop="fnTabRemoveJiraEpicLink(idx)"
                              >
                                Удалить
                              </el-button>
                            </div>
                            <div class="drawer-fn-epic-card__summary">
                              {{ fnTabStatusForLink(link)?.summary || 'Наименование эпика пока не получено' }}
                            </div>
                            <div class="drawer-fn-epic-card__status">
                              {{ fnTabStatusForLink(link)?.status || 'Статус будет получен из Jira' }}
                            </div>
                            <div class="drawer-fn-epic-progress">
                              <span
                                v-for="part in 4"
                                :key="`progress-${idx}-${part}`"
                                class="drawer-fn-epic-progress__part"
                                :class="fnTabEpicProgressPartClass(fnTabStatusForLink(link), part)"
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                </template>
              </div>
            </el-tab-pane>
          </el-tabs>
        </template>

        <!--
          Read-only режим:
          инпутов нет вообще, только просмотр данных.
        -->
        <template v-else>
          <div class="readonly-grid">
            <div class="readonly-card">
              <div class="readonly-label">Краткое наименование предложения</div>
              <div class="readonly-value">{{ item.shortName || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Инициатор</div>
              <div class="readonly-value">{{ item.initiator || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Ответственный</div>
              <div class="readonly-value">{{ item.responsiblePerson || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Раздел</div>
              <div class="readonly-value">{{ item.sectionName || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Приоритет</div>
              <div class="readonly-value">{{ item.implementationQueue || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">ГК</div>
              <div class="readonly-value">{{ item.contractName || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Статус</div>
              <div class="readonly-value">{{ item.statusText || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Система</div>
              <div class="readonly-value">{{ systemTypeLabel(item.systemType) }}</div>
            </div>

            <div class="readonly-card full">
              <div class="readonly-label">Предложение</div>
              <div class="readonly-value">{{ item.proposalText || '—' }}</div>
            </div>

            <div class="readonly-card full">
              <div class="readonly-label">Комментарии и описание проблем</div>
              <div class="readonly-value">{{ item.problemComment || '—' }}</div>
            </div>

            <div class="readonly-card full">
              <div class="readonly-label">Обсуждение</div>
              <div class="readonly-value">{{ item.discussionSummary || '—' }}</div>
            </div>

            <div class="readonly-card full">
              <div class="readonly-label">Функция НМЦК, ТЗ</div>
              <div class="readonly-value readonly-nmck-tz">
                <template
                  v-if="(item.nmckPointText || '').trim() || (item.tzPointText || '').trim()"
                >
                  <div v-if="(item.nmckPointText || '').trim()" class="readonly-subline">
                    НМЦК: {{ item.nmckPointText }}
                  </div>
                  <div v-if="(item.tzPointText || '').trim()">ТЗ: {{ item.tzPointText }}</div>
                </template>
                <template v-else>—</template>
              </div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Примечание</div>
              <div class="readonly-value">{{ item.noteText || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Письмо в ДИТ — номер</div>
              <div class="readonly-value">{{ item.ditOutgoingNumber?.trim() || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Письмо в ДИТ — дата</div>
              <div class="readonly-value">
                {{ item.ditOutgoingDate ? formatDateOnly(item.ditOutgoingDate) : '—' }}
              </div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Дата создания</div>
              <div class="readonly-value">{{ formatDateOnly(item.createdAt) }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Дата выполнения</div>
              <div class="readonly-value">
                {{ item.completedAt ? formatDateOnly(item.completedAt) : '—' }}
              </div>
            </div>
          </div>
        </template>

        <section
          v-show="!canManageRequirementCard || detailsCardTab === 'proposal'"
          class="details-bottom-panels"
        >
          <section class="content-section content-section--comments dual-panel">
              <div class="content-section__head">
                <h4 class="content-section__title">Комментарии</h4>
              </div>
              <div class="dual-panel__body">
                <div class="comments-list">
                  <el-empty
                    v-if="!item.comments || item.comments.length === 0"
                    description="Комментариев пока нет"
                    :image-size="0"
                  />

                  <div v-else class="comment-card" v-for="comment in item.comments" :key="comment.id">
                    <div class="comment-header">
                      <div class="comment-author-wrap">
                        <span class="comment-author-avatar">{{ authorInitial(comment.authorName) }}</span>
                        <div class="comment-author-meta">
                          <div class="comment-author">
                            {{ comment.authorName }}
                            <span class="comment-author-org">· {{ comment.authorOrg }}</span>
                          </div>
                          <div class="comment-date">{{ formatDateTime(comment.createdAt) }}</div>
                        </div>
                      </div>
                      <div class="comment-right">
                        <el-button
                          v-if="canDeleteRequirementComment"
                          class="comment-delete-btn"
                          size="small"
                          type="danger"
                          plain
                          :loading="deleteCommentLoadingId === comment.id"
                          @click="handleDeleteComment(comment.id)"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                    <div class="comment-text">{{ comment.commentText }}</div>
                  </div>
                </div>
              </div>

              <div v-if="canAddRequirementComment" class="comment-editor dual-panel__footer">
                <el-input
                  v-model="newCommentText"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 5 }"
                  placeholder="Введите комментарий"
                />
                <div class="comment-editor-actions">
                  <el-button class="comment-add-btn" type="primary" :loading="commentLoading" @click="handleAddComment">
                    <el-icon><Plus /></el-icon>
                    <span>Добавить комментарий</span>
                  </el-button>
                </div>
              </div>
          </section>
        </section>

        </div>
      </template>
    </div>
  </el-dialog>

  <el-dialog
    v-model="archiveReasonDialogVisible"
    title=""
    width="420px"
    class="record-action-dialog"
    append-to-body
    align-center
  >
    <div class="record-action-dialog__head">
      <span class="record-action-dialog__icon-badge">
        <ArchiveL :size="18" />
      </span>
      <div>
        <h3 class="record-action-dialog__title">Перевести в архив</h3>
        <p>Выберите причину архивации записи</p>
      </div>
    </div>
    <label class="archive-reason-option" :class="{ 'is-active': pendingArchiveReason === 'completed' }">
      <input v-model="pendingArchiveReason" type="radio" value="completed" />
      <span>Предложение выполнено</span>
    </label>
    <label class="archive-reason-option" :class="{ 'is-active': pendingArchiveReason === 'outdated' }">
      <input v-model="pendingArchiveReason" type="radio" value="outdated" />
      <span>Предложение больше не актуально</span>
    </label>
    <template #footer>
      <el-button @click="archiveReasonDialogVisible = false">Отмена</el-button>
      <el-button type="warning" :loading="actionLoading" @click="confirmArchiveAction">В архив</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="deleteConfirmVisible"
    title=""
    width="420px"
    class="record-action-dialog"
    append-to-body
    align-center
  >
    <div class="record-action-dialog__head">
      <span class="record-action-dialog__icon-badge record-action-dialog__icon-badge--danger">
        <TriangleAlertL :size="18" />
      </span>
      <div>
        <h3 class="record-action-dialog__title">Удалить запись безвозвратно?</h3>
        <p>Запись исчезнет из списка. Это действие нельзя отменить.</p>
      </div>
    </div>
    <template #footer>
      <el-button @click="deleteConfirmVisible = false">Отмена</el-button>
      <el-button type="danger" :loading="deleteLoading" @click="confirmDeleteRequirementAction">Удалить</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="deleteCommentConfirmVisible"
    title=""
    width="420px"
    class="record-action-dialog"
    append-to-body
    align-center
  >
    <div class="record-action-dialog__head">
      <span class="record-action-dialog__icon-badge record-action-dialog__icon-badge--danger">
        <TriangleAlertL :size="18" />
      </span>
      <div>
        <h3 class="record-action-dialog__title">Удалить комментарий?</h3>
        <p>Это действие нельзя отменить. Комментарий будет удалён безвозвратно.</p>
      </div>
    </div>
    <template #footer>
      <el-button @click="cancelDeleteCommentDialog">Отмена</el-button>
      <el-button
        type="danger"
        :loading="pendingDeleteCommentId != null && deleteCommentLoadingId === pendingDeleteCommentId"
        @click="confirmDeleteCommentAction"
      >
        Удалить
      </el-button>
    </template>
  </el-dialog>

</template>

<script setup lang="ts">
import {
  CloseBold,
  Delete,
  Download,
  InfoFilled,
  Plus,
  SuccessFilled,
} from '@element-plus/icons-vue'
import {
  AlertCircle as AlertCircleL,
  Archive as ArchiveL,
  Building2 as Building2L,
  Calendar as CalendarL,
  X as CloseL,
  Clock3 as ClockL,
  Hash as HashL,
  Pen as PenL,
  TriangleAlert as TriangleAlertL,
  User as UserL,
} from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { createQueue, fetchQueues } from '@/api/queues'
import { fetchContracts } from '@/api/contracts'
import {
  fetchGKContractDetails,
  fetchGKFunctionsForStage,
  fetchGKStages,
  previewJiraEpicStatuses,
  fetchStageJiraEpicStatuses,
  upsertGKFunction,
} from '@/api/gkContracts'
import {
  type ArchiveRequirementReason,
  addRequirementComment,
  archiveRequirement,
  deleteRequirementComment,
  attachRequirementFromLibrary,
  deleteRequirement,
  deleteRequirementAttachment,
  downloadRequirementAttachment,
  fetchRequirementAttachmentLibrary,
  fetchRequirementById,
  restoreRequirement,
  updateRequirement,
  uploadRequirementAttachments,
} from '@/api/requirements'
import type {
  ContractItem,
  GKFunction,
  GKStage,
  JiraEpicStatusItem,
  QueueItem,
  Requirement,
  RequirementAttachmentItem,
  RequirementAttachmentLibraryItem,
  RequirementPayload,
} from '@/types'
import { STANDARD_REQUIREMENT_STATUSES } from '@/constants/requirementStatuses'
import { initiatorForSystemType } from '@/constants/initiatorBySystem'
import { SYSTEM_TYPE_OPTIONS, systemTypeLabel } from '@/constants/systemTypes'
import { TELEPHONY_SECTION, isTelephonySectionName } from '@/constants/telephonySection'

/**
 * Props drawer.
 */
const props = defineProps<{
  modelValue: boolean
  requirementId: number | null
}>()

/**
 * Events.
 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
  (e: 'deleted'): void
}>()

/**
 * Store текущего пользователя.
 */
const authStore = useAuthStore()
const DEFAULT_QUEUE_NAME = 'Не определена'

const canFullEdit = computed(() => authStore.canEditRequirementsFully)
const canDeleteRequirements = computed(() => authStore.canDeleteRequirements)
const canManageRequirementCard = computed(() => authStore.canManageRequirementCard)

function fieldDisabled(key: string) {
  return !authStore.canEditRequirementField(key)
}

const canEditAttachments = computed(
  () => canFullEdit.value || authStore.canEditRequirementField('attachments'),
)

const canAddRequirementComment = computed(
  () => canFullEdit.value || authStore.canCommentRequirements,
)

const canDeleteRequirementComment = canAddRequirementComment

/**
 * Заголовок drawer.
 */
const drawerTitle = computed(() => {
  return item.value?.taskIdentifier
    ? `Карточка предложения — ${item.value.taskIdentifier}`
    : 'Карточка предложения'
})

const archiveNotice = computed<null | { type: 'completed' | 'outdated'; text: string }>(() => {
  if (!item.value?.isArchived) return null
  if (item.value.archivedReason === 'completed') {
    return {
      type: 'completed',
      text: 'Запись в архиве: предложение выполнено.',
    }
  }
  return {
    type: 'outdated',
    text: 'Запись в архиве: предложение больше не актуально.',
  }
})

/**
 * Состояния.
 */
const loading = ref(false)
const saveLoading = ref(false)
const actionLoading = ref(false)
const deleteLoading = ref(false)
const commentLoading = ref(false)
const deleteCommentLoadingId = ref<number | null>(null)
const deleteCommentConfirmVisible = ref(false)
const pendingDeleteCommentId = ref<number | null>(null)
const archiveReasonDialogVisible = ref(false)
const pendingArchiveReason = ref<ArchiveRequirementReason>('completed')
const deleteConfirmVisible = ref(false)

/**
 * Текущая карточка предложения.
 */
const item = ref<Requirement | null>(null)

/**
 * Очереди для режима редактирования.
 */
const queues = ref<QueueItem[]>([])

// Данные для связки: ГК -> Этап -> Функция ТЗ.
const contracts = ref<ContractItem[]>([])
const selectedContractId = ref<number | null>(null)
const stages = ref<GKStage[]>([])
const functions = ref<GKFunction[]>([])
const selectedStageNumber = ref<number | null>(null)
const selectViaTz = ref(false)
const selectedTzSectionNumber = ref('')
const selectedNmckFunctionId = ref<number | null>(null)

/** Вкладки карточки в режиме редактирования: предложение / функция ГК. */
const detailsCardTab = ref<'proposal' | 'function'>('proposal')
const functionTabEpicStatuses = ref<JiraEpicStatusItem[]>([])
const fnTabNewConfluenceLink = ref('')
const fnTabNewJiraEpicLink = ref('')
const fnTabForm = reactive<{
  functionName: string
  nmckFunctionNumber: string
  tzSectionNumber: string
  confluenceLinks: string[]
  jiraEpicLinks: string[]
}>({
  functionName: '',
  nmckFunctionNumber: '',
  tzSectionNumber: '',
  confluenceLinks: [],
  jiraEpicLinks: [],
})

const currentGkFunction = computed(() => {
  const id = selectedNmckFunctionId.value
  if (id == null) return null
  return functions.value.find((f) => f.id === id) || null
})

/** Ссылки на эпики Jira с учётом устаревшего поля jiraLink (как в GKFunctionDialog). */
const functionTabEpicLinks = computed(() => {
  const epicLinks = Array.isArray(fnTabForm.jiraEpicLinks) ? [...fnTabForm.jiraEpicLinks] : []
  const legacy = (currentGkFunction.value?.jiraLink || '').trim()
  if (legacy && !epicLinks.some((x) => x.trim().toLowerCase() === legacy.toLowerCase())) epicLinks.unshift(legacy)
  return epicLinks.filter((x) => !!(x || '').trim())
})

function resetFnTabForm() {
  fnTabForm.functionName = ''
  fnTabForm.nmckFunctionNumber = ''
  fnTabForm.tzSectionNumber = ''
  fnTabForm.confluenceLinks = []
  fnTabForm.jiraEpicLinks = []
  fnTabNewConfluenceLink.value = ''
  fnTabNewJiraEpicLink.value = ''
}

function syncFnTabFormFromCurrent() {
  const fn = currentGkFunction.value
  if (!fn) {
    resetFnTabForm()
    return
  }
  fnTabForm.functionName = fn.functionName || ''
  fnTabForm.nmckFunctionNumber = fn.nmckFunctionNumber || ''
  fnTabForm.tzSectionNumber = fn.tzSectionNumber || ''
  fnTabForm.confluenceLinks = Array.isArray(fn.confluenceLinks) ? [...fn.confluenceLinks] : []
  fnTabForm.jiraEpicLinks = Array.isArray(fn.jiraEpicLinks) ? [...fn.jiraEpicLinks] : []
  fnTabNewConfluenceLink.value = ''
  fnTabNewJiraEpicLink.value = ''
}

/**
 * Текст нового комментария.
 */
const newCommentText = ref('')

/**
 * Локальная форма редактирования.
 */
const form = reactive<RequirementPayload>({
  taskIdentifier: '',
  shortName: '',
  initiator: '',
  responsiblePerson: '',
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: '',
  contractName: '',
  contractTZFunctionId: null,
  noteText: '',
  tzPointText: '',
  nmckPointText: '',
  statusText: '',
  systemType: '',
  completedAt: null,
  ditOutgoingNumber: '',
  ditOutgoingDate: null,
})

const contractSelectOptions = computed(() => {
  const list = contracts.value.map((c) => ({ id: c.id, name: c.name }))
  const cur = (form.contractName || '').trim()
  if (!cur) return list
  const exists = list.some((c) => (c.name || '').trim().toLowerCase() === cur.toLowerCase())
  if (exists) return list
  return [{ id: -1, name: cur }, ...list]
})

function nmckFunctionOptionLabel(fn: GKFunction) {
  const n = (fn.nmckFunctionNumber || '').trim()
  const name = (fn.functionName || '').trim()
  if (n && name) return `${n} — ${name}`
  return name || n || '—'
}

async function refreshFunctionTabEpicStatuses() {
  const cid = selectedContractId.value
  const st = selectedStageNumber.value
  const fid = selectedNmckFunctionId.value
  if (!cid || st == null || fid == null) {
    functionTabEpicStatuses.value = []
    return
  }
  try {
    const byFn = await fetchStageJiraEpicStatuses(cid, st)
    functionTabEpicStatuses.value = byFn[fid] || []
  } catch {
    functionTabEpicStatuses.value = []
  }
}

function fnTabNormalizeLink(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

function fnTabIsValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function fnTabExtractEpicKey(link: string) {
  const match = (link || '').match(/([A-Z][A-Z0-9]+-\d+)/i)
  return match ? match[1].toUpperCase() : ''
}

function fnTabLinkHref(value: string) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const key = fnTabExtractEpicKey(trimmed)
  if (key) return `https://jira.avilex.ru/browse/${key}`
  return fnTabNormalizeLink(trimmed)
}

function fnTabOpenEpic(link: string) {
  const href = fnTabLinkHref(link)
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}

function fnTabStatusForLink(link: string) {
  const normalized = link.trim().toLowerCase()
  return functionTabEpicStatuses.value.find((x) => (x.link || '').trim().toLowerCase() === normalized)
}

function fnTabUpsertEpicStatus(item: JiraEpicStatusItem) {
  const normalized = (item.link || '').trim().toLowerCase()
  if (!normalized) return
  const idx = functionTabEpicStatuses.value.findIndex(
    (x) => (x.link || '').trim().toLowerCase() === normalized,
  )
  if (idx >= 0) {
    functionTabEpicStatuses.value[idx] = item
    return
  }
  functionTabEpicStatuses.value = [...functionTabEpicStatuses.value, item]
}

async function fnTabRefreshEpicStatusByLink(link: string) {
  try {
    const preview = await previewJiraEpicStatuses([link])
    if (preview.length > 0) fnTabUpsertEpicStatus(preview[0])
  } catch {
    // ignore preview errors; placeholder will stay until next sync
  }
}

function fnTabAddConfluenceLink() {
  const next = fnTabNormalizeLink(fnTabNewConfluenceLink.value)
  if (!next) return
  if (!fnTabIsValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Confluence')
    return
  }
  if (!fnTabForm.confluenceLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    fnTabForm.confluenceLinks = [...fnTabForm.confluenceLinks, next]
  }
  fnTabNewConfluenceLink.value = ''
}

function fnTabRemoveConfluenceLink(index: number) {
  fnTabForm.confluenceLinks = fnTabForm.confluenceLinks.filter((_, i) => i !== index)
}

function fnTabAddJiraEpicLink() {
  const next = fnTabNormalizeLink(fnTabNewJiraEpicLink.value)
  if (!next) return
  if (!fnTabIsValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Jira Epic')
    return
  }
  if (!fnTabForm.jiraEpicLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    fnTabForm.jiraEpicLinks = [...fnTabForm.jiraEpicLinks, next]
    void fnTabRefreshEpicStatusByLink(next)
  }
  fnTabNewJiraEpicLink.value = ''
}

function fnTabRemoveJiraEpicLink(index: number) {
  const next = fnTabForm.jiraEpicLinks.filter((_, i) => i !== index)
  fnTabForm.jiraEpicLinks = next
  functionTabEpicStatuses.value = functionTabEpicStatuses.value.filter((x) =>
    next.some((link) => link.trim().toLowerCase() === (x.link || '').trim().toLowerCase()),
  )
}

async function saveFunctionTabChanges() {
  const cid = selectedContractId.value
  const st = selectedStageNumber.value
  const currentFn = currentGkFunction.value
  if (!cid || st == null || !currentFn) return

  const payload = {
    stageNumber: st,
    functionName: (fnTabForm.functionName || '').trim(),
    nmckFunctionNumber: (fnTabForm.nmckFunctionNumber || '').trim(),
    tzSectionNumber: (fnTabForm.tzSectionNumber || '').trim(),
    jiraLink: '',
    confluenceLinks: fnTabForm.confluenceLinks.map((x) => x.trim()).filter(Boolean),
    jiraEpicLinks: fnTabForm.jiraEpicLinks.map((x) => x.trim()).filter(Boolean),
  }
  if (!payload.functionName) {
    ElMessage.warning('Введите наименование функции')
    throw new Error('Function name is required')
  }
  if (!payload.nmckFunctionNumber) {
    ElMessage.warning('Введите номер функции по НМЦК')
    throw new Error('Function NMCK number is required')
  }
  if (!payload.tzSectionNumber) {
    ElMessage.warning('Введите номер раздела по ТЗ')
    throw new Error('Function TZ section is required')
  }

  await upsertGKFunction(cid, payload)
  functions.value = await fetchGKFunctionsForStage(cid, st)
  const stillSelected =
    functions.value.find((x) => x.id === currentFn.id) ||
    functions.value.find(
      (x) =>
        (x.functionName || '').trim().toLowerCase() === payload.functionName.toLowerCase() &&
        (x.nmckFunctionNumber || '').trim().toLowerCase() === payload.nmckFunctionNumber.toLowerCase() &&
        (x.tzSectionNumber || '').trim().toLowerCase() === payload.tzSectionNumber.toLowerCase(),
    ) ||
    null
  selectedNmckFunctionId.value = stillSelected?.id ?? null
  syncFunctionSelection(stillSelected)
  syncFnTabFormFromCurrent()
  await refreshFunctionTabEpicStatuses()
}

function fnTabNormalizeStatusName(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function fnTabEpicStageIndex(status?: string) {
  const v = fnTabNormalizeStatusName(status || '')
  if (v.includes('закрыт')) return 4
  if (v.includes('тест') && v.includes('dev')) return 3
  if (v.includes('разработ')) return 2
  if (v.includes('аналит')) return 1
  if (v.includes('открыт')) return 0
  return 1
}

function fnTabEpicProgressPartClass(item: JiraEpicStatusItem | undefined, part: number) {
  const status = item?.status || ''
  const stage = fnTabEpicStageIndex(status)
  if (part > stage) return 'is-idle'
  const v = fnTabNormalizeStatusName(status)
  if (v.includes('закрыт')) return 'is-closed'
  if (v.includes('тест') && v.includes('dev')) return 'is-devtest'
  if (v.includes('разработ')) return 'is-dev'
  if (v.includes('аналит')) return 'is-analysis'
  return 'is-open'
}

/**
 * Загружаем справочник очередей.
 */
async function loadQueues() {
  try {
    const loaded = await fetchQueues()
    if (loaded.some((q) => (q.name || '').trim() === DEFAULT_QUEUE_NAME)) {
      queues.value = loaded
    } else {
      queues.value = [
        { id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' },
        ...loaded,
      ]
    }
  } catch {
    queues.value = [{ id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' }]
  }
}

async function openAddQueueDialog() {
  try {
    const { value } = await ElMessageBox.prompt('Введите номер новой очереди', 'Добавить очередь', {
      confirmButtonText: 'Добавить',
      cancelButtonText: 'Отмена',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: 'Введите положительное число',
    })

    const number = Number(value)
    const created = await createQueue(number)
    await loadQueues()
    form.implementationQueue = created.name
    ElMessage.success('Очередь добавлена')
  } catch {
    // cancel
  }
}

/**
 * Заполняем локальную форму из карточки.
 */
function fillForm(data: Requirement) {
  form.taskIdentifier = data.taskIdentifier || ''
  form.shortName = data.shortName || ''
  form.initiator = data.initiator || ''
  form.responsiblePerson = data.responsiblePerson || ''
  form.sectionName = data.sectionName || ''
  form.proposalText = data.proposalText || ''
  form.problemComment = data.problemComment || ''
  form.discussionSummary = data.discussionSummary || ''
  form.implementationQueue = data.implementationQueue || DEFAULT_QUEUE_NAME
  form.contractName = data.contractName || ''
  form.contractTZFunctionId = data.contractTZFunctionId ?? null
  form.noteText = data.noteText || ''
  form.tzPointText = data.tzPointText || ''
  form.nmckPointText = data.nmckPointText || ''
  form.statusText = data.statusText || ''
  form.systemType = data.systemType || ''
  form.completedAt = data.completedAt ?? null
  form.ditOutgoingNumber = data.ditOutgoingNumber || ''
  form.ditOutgoingDate = data.ditOutgoingDate ?? null
}

function onSystemTypeChange() {
  form.initiator = initiatorForSystemType(form.systemType)
}

async function loadContracts() {
  try {
    contracts.value = await fetchContracts()
  } catch {
    contracts.value = []
  }
}

function resolveContractIdByName(name: string) {
  const v = (name || '').trim().toLowerCase()
  if (!v) return null
  const c = contracts.value.find((x) => (x.name || '').trim().toLowerCase() === v)
  return c?.id ?? null
}

async function onContractChange(value: string | null | undefined) {
  const name = typeof value === 'string' ? value : ''
  form.contractName = name

  selectedContractId.value = resolveContractIdByName(name)
  selectedStageNumber.value = null
  selectViaTz.value = false
  selectedTzSectionNumber.value = ''
  selectedNmckFunctionId.value = null
  stages.value = []
  functions.value = []

  form.contractTZFunctionId = null
  form.tzPointText = ''
  form.nmckPointText = ''

  if (!name.trim()) return
  if (!selectedContractId.value) return
  stages.value = await fetchGKStages(selectedContractId.value)
}

async function handleStageChange(stageNumber: number | null) {
  selectViaTz.value = false
  selectedTzSectionNumber.value = ''
  selectedNmckFunctionId.value = null
  functions.value = []
  form.contractTZFunctionId = null
  form.tzPointText = ''
  form.nmckPointText = ''

  if (!selectedContractId.value || !stageNumber) return
  functions.value = await fetchGKFunctionsForStage(selectedContractId.value, stageNumber)
}

function handleTzSelected(tzValue: string | null) {
  const tz = tzValue ? tzValue.trim() : ''
  selectedTzSectionNumber.value = tz

  selectedNmckFunctionId.value = null
  form.contractTZFunctionId = null
  form.tzPointText = tz || ''
  form.nmckPointText = ''
}

function syncFunctionSelection(fn: GKFunction | null) {
  if (!fn) {
    form.contractTZFunctionId = null
    form.tzPointText = selectViaTz.value ? selectedTzSectionNumber.value || '' : ''
    form.nmckPointText = ''
    return
  }

  selectedTzSectionNumber.value = (fn.tzSectionNumber || '').trim()
  form.contractTZFunctionId = fn.id
  form.tzPointText = (fn.tzSectionNumber || '').trim()
  form.nmckPointText = (fn.nmckFunctionNumber || '').trim()
}

function handleNmckSelected(functionId: number | null) {
  selectedNmckFunctionId.value = functionId
  const fn = functions.value.find((x) => x.id === functionId) || null
  syncFunctionSelection(fn)
}

const tzSectionOptions = computed(() => {
  const byTz = new Map<string, GKFunction>()
  for (const fn of functions.value) {
    const tz = (fn.tzSectionNumber || '').trim()
    if (tz && !byTz.has(tz)) byTz.set(tz, fn)
  }
  return Array.from(byTz.entries()).map(([tz, fn]) => ({
    value: tz,
    label: fn.functionName ? `${tz} — ${fn.functionName}` : tz,
  }))
})

const nmckFunctionOptions = computed(() => {
  const tz = (selectedTzSectionNumber.value || '').trim()
  const list =
    selectViaTz.value && tz
      ? functions.value.filter((fn) => (fn.tzSectionNumber || '').trim() === tz)
      : functions.value

  const byId = new Map<number, GKFunction>()
  for (const fn of list) {
    if ((fn.nmckFunctionNumber || '').trim()) byId.set(fn.id, fn)
  }

  return Array.from(byId.values()).map((fn) => ({
    value: fn.id,
    label: nmckFunctionOptionLabel(fn),
  }))
})

const nmckSelectDisabled = computed(() => {
  if (!selectedStageNumber.value) return true
  if (selectViaTz.value && !selectedTzSectionNumber.value) return true
  return false
})

const nmckEmptyText = computed(() => {
  if (!selectedStageNumber.value) return 'Сначала выберите этап.'
  if (selectViaTz.value && !selectedTzSectionNumber.value) return 'Сначала выберите п.п. ТЗ.'
  return 'Для выбранных параметров нет значений НМЦК.'
})

async function initGKSelectionFromRequirement(data: Requirement) {
  selectedContractId.value = null
  selectedStageNumber.value = null
  selectViaTz.value = false
  selectedTzSectionNumber.value = ''
  selectedNmckFunctionId.value = null
  stages.value = []
  functions.value = []

  if (!data.contractName) return

  selectedContractId.value = resolveContractIdByName(data.contractName)
  if (!selectedContractId.value) return

  if (data.contractTZFunctionId) {
    const details = await fetchGKContractDetails(selectedContractId.value)
    stages.value = details.stages || []

    const functionId = data.contractTZFunctionId
    for (const stage of stages.value) {
      const fn = (stage.functions || []).find((x) => x.id === functionId)
      if (fn) {
        selectedStageNumber.value = stage.stageNumber
        functions.value = stage.functions || []
        form.contractTZFunctionId = fn.id
        form.tzPointText = (fn.tzSectionNumber || '').trim()
        form.nmckPointText = (fn.nmckFunctionNumber || '').trim() || (data.nmckPointText || '')

        selectedTzSectionNumber.value = (fn.tzSectionNumber || '').trim()
        selectedNmckFunctionId.value = fn.id
        break
      }
    }
  } else {
    stages.value = await fetchGKStages(selectedContractId.value)
    form.nmckPointText = data.nmckPointText || ''
  }
}

/**
 * Загрузка карточки предложения.
 */
async function loadItem() {
  if (!props.requirementId) return

  try {
    loading.value = true
    await loadContracts()
    const data = await fetchRequirementById(props.requirementId)
    item.value = data
    fillForm(data)
    await initGKSelectionFromRequirement(data)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки карточки')
  } finally {
    loading.value = false
  }
}

/**
 * Сохраняем изменения карточки.
 */
async function handleSave() {
  if (!item.value) return

  try {
    saveLoading.value = true
    if (currentGkFunction.value) {
      await saveFunctionTabChanges()
    }
    const payload: RequirementPayload = { ...form }
    if (!payload.completedAt) delete payload.completedAt
    if (!payload.ditOutgoingDate) delete payload.ditOutgoingDate
    if (!(payload.ditOutgoingNumber || '').trim()) delete payload.ditOutgoingNumber
    await updateRequirement(item.value.id, payload)
    ElMessage.success('Изменения сохранены')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения')
  } finally {
    saveLoading.value = false
  }
}

/**
 * Архивируем карточку.
 */
async function handleArchive() {
  if (!item.value) return
  pendingArchiveReason.value = 'completed'
  archiveReasonDialogVisible.value = true
}

async function confirmArchiveAction() {
  if (!item.value) return
  try {
    actionLoading.value = true
    await archiveRequirement(item.value.id, pendingArchiveReason.value)
    archiveReasonDialogVisible.value = false
    ElMessage.success('Запись отправлена в архив')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка архивирования')
  } finally {
    actionLoading.value = false
  }
}

/**
 * Восстанавливаем карточку из архива.
 */
async function handleRestore() {
  if (!item.value) return

  try {
    actionLoading.value = true
    await restoreRequirement(item.value.id)
    ElMessage.success('Запись восстановлена')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка восстановления')
  } finally {
    actionLoading.value = false
  }
}

async function handleDeleteRequirement() {
  if (!canDeleteRequirements.value) {
    ElMessage.warning('Недостаточно прав для удаления предложений')
    return
  }
  if (!item.value) return
  deleteConfirmVisible.value = true
}

async function confirmDeleteRequirementAction() {
  if (!item.value) return
  try {
    deleteLoading.value = true
    await deleteRequirement(item.value.id)
    deleteConfirmVisible.value = false
    ElMessage.success('Запись удалена')
    emit('deleted')
    emit('update:modelValue', false)
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления')
  } finally {
    deleteLoading.value = false
  }
}

/**
 * Добавляем комментарий.
 */
const reqFileInputRef = ref<HTMLInputElement | null>(null)
const attachmentsUploading = ref(false)
const detachLoadingId = ref<number | null>(null)
const libraryOptions = ref<RequirementAttachmentLibraryItem[]>([])
const libraryLoading = ref(false)
const libraryPickValue = ref<number | null>(null)

function triggerReqAttachmentFilePick() {
  reqFileInputRef.value?.click()
}

async function onReqAttachmentFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length || !item.value) return

  try {
    attachmentsUploading.value = true
    await uploadRequirementAttachments(item.value.id, files)
    ElMessage.success('Файлы добавлены')
    input.value = ''
    await loadItem()
    emit('updated')
    await searchRequirementLibraryRemote('')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки файлов')
  } finally {
    attachmentsUploading.value = false
  }
}

function isLibraryFileAlreadyAttached(libraryFileId: number) {
  return !!item.value?.attachments?.some((a) => a.libraryFileId === libraryFileId)
}

function requirementLibraryOptionLabel(row: RequirementAttachmentLibraryItem) {
  const who = [row.uploadedByName, row.uploadedByOrg].filter(Boolean).join(' · ')
  const used = row.lastUsedAt ? formatDateTime(row.lastUsedAt) : ''
  const tail = [who && `(${who})`, used && `исп. ${used}`].filter(Boolean).join(' ')
  return tail ? `${row.originalFileName} ${tail}` : row.originalFileName
}

async function searchRequirementLibraryRemote(q: string) {
  libraryLoading.value = true
  try {
    libraryOptions.value = await fetchRequirementAttachmentLibrary(q)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки списка файлов')
    libraryOptions.value = []
  } finally {
    libraryLoading.value = false
  }
}

function onRequirementLibraryDropdownVisible(visible: boolean) {
  if (visible && !libraryOptions.value.length) {
    searchRequirementLibraryRemote('')
  }
}

async function onRequirementLibraryPicked(id: number | null) {
  if (id == null || !item.value) return
  if (isLibraryFileAlreadyAttached(id)) {
    libraryPickValue.value = null
    ElMessage.warning('Этот файл уже прикреплён')
    return
  }

  try {
    await attachRequirementFromLibrary(item.value.id, id)
    ElMessage.success('Файл прикреплён')
    libraryPickValue.value = null
    await loadItem()
    emit('updated')
    await searchRequirementLibraryRemote('')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Не удалось прикрепить файл')
    libraryPickValue.value = null
  }
}

async function downloadAttachment(att: RequirementAttachmentItem) {
  try {
    const response = await downloadRequirementAttachment(att.id)
    const blob = response.data as Blob
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = att.libraryFile?.originalFileName || 'download'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка скачивания')
  }
}

function confirmDetachAttachment(att: RequirementAttachmentItem) {
  void detachAttachmentNow(att)
}

async function detachAttachmentNow(att: RequirementAttachmentItem) {
  try {
    detachLoadingId.value = att.id
    await deleteRequirementAttachment(att.id)
    ElMessage.success('Файл откреплён')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка открепления')
  } finally {
    detachLoadingId.value = null
  }
}

async function handleAddComment() {
  if (!item.value) return
  if (!newCommentText.value.trim()) {
    ElMessage.warning('Введите комментарий')
    return
  }

  try {
    commentLoading.value = true
    await addRequirementComment(item.value.id, newCommentText.value.trim())
    newCommentText.value = ''
    ElMessage.success('Комментарий добавлен')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка добавления комментария')
  } finally {
    commentLoading.value = false
  }
}

function handleDeleteComment(commentId: number) {
  pendingDeleteCommentId.value = commentId
  deleteCommentConfirmVisible.value = true
}

function cancelDeleteCommentDialog() {
  deleteCommentConfirmVisible.value = false
  pendingDeleteCommentId.value = null
}

async function confirmDeleteCommentAction() {
  if (!item.value || pendingDeleteCommentId.value == null) return
  const commentId = pendingDeleteCommentId.value
  try {
    deleteCommentLoadingId.value = commentId
    await deleteRequirementComment(item.value.id, commentId)
    ElMessage.success('Комментарий удалён')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления комментария')
  } finally {
    deleteCommentConfirmVisible.value = false
    pendingDeleteCommentId.value = null
    deleteCommentLoadingId.value = null
  }
}

/**
 * Формат даты и времени.
 */
function formatDateTime(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('ru-RU')
}

function formatDateOnly(value: string | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function authorInitial(name: string | undefined) {
  const v = (name || '').trim()
  return v ? v[0]!.toUpperCase() : '•'
}

function attachmentExt(att: RequirementAttachmentItem) {
  const name = (att.libraryFile?.originalFileName || '').trim().toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() || '' : ''
  if (!ext) return 'FILE'
  return ext.length > 4 ? ext.slice(0, 4).toUpperCase() : ext.toUpperCase()
}

function attachmentIconTone(att: RequirementAttachmentItem) {
  const ext = attachmentExt(att).toLowerCase()
  if (ext === 'pdf') return 'is-pdf'
  if (ext === 'doc' || ext === 'docx') return 'is-doc'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'xlsm') return 'is-xls'
  if (ext === 'msg' || ext === 'pst') return 'is-msg'
  return 'is-default'
}

/**
 * При открытии drawer и смене id загружаем данные.
 */
watch(
  () => [props.modelValue, props.requirementId],
  async ([opened, id]) => {
    if (!opened || !id) return

    detailsCardTab.value = 'proposal'
    functionTabEpicStatuses.value = []
    libraryOptions.value = []
    libraryPickValue.value = null
    await loadQueues()
    await loadItem()
  },
  { immediate: true },
)

watch(
  () => [selectedNmckFunctionId.value, selectedStageNumber.value, selectedContractId.value] as const,
  () => {
    syncFnTabFormFromCurrent()
    if (detailsCardTab.value === 'function') void refreshFunctionTabEpicStatuses()
  },
  { immediate: true },
)

watch(
  () =>
    [detailsCardTab.value, selectedContractId.value, selectedStageNumber.value, selectedNmckFunctionId.value] as const,
  () => {
    if (detailsCardTab.value === 'function') void refreshFunctionTabEpicStatuses()
  },
)
</script>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
  background: #f5f7fa;
}

.drawer-top-sticky {
  position: relative;
  z-index: 20;
  margin: 0;
  padding: 8px 0 10px;
  background: #ffffff;
  border-bottom: 1px solid #dcdfe6;
  box-shadow: none;
  width: 100%;
  box-sizing: border-box;
}

.drawer-top-sticky::after {
  display: none;
}

.drawer-content-scroll {
  --details-two-col-ratio: minmax(0, 1.35fr) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 14px 6px;
  background: #f5f7fa;
}

.archive-notice {
  margin-top: 12px;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
}

.archive-notice--completed {
  background: #dff5df;
  color: #215c2f;
  border: 1px solid #bfe3c3;
}

.archive-notice--outdated {
  background: #fff4cc;
  color: #7a4e12;
  border: 1px solid #f0d68a;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  position: relative;
  min-height: 0;
  padding: 0 18px;
  box-sizing: border-box;
}

.top-title-block {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.top-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
  font-weight: 700;
  line-height: 1.2;
  position: relative;
  padding-left: 10px;
}

.top-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 14px;
  border-radius: 999px;
  background: var(--el-color-primary);
  transform: translateY(-50%);
}

.top-task-id {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  background: #f5f7fa;
  color: var(--el-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
}

.meta-line-top {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding: 0 18px;
  box-sizing: border-box;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #dcdfe6;
  background: #f5f7fa;
  color: #606266;
  font-size: 11px;
  font-weight: 500;
}

.meta-chip b {
  font-weight: 600;
}

.meta-chip :deep(svg) {
  color: #909399;
  width: 12px;
  height: 12px;
  stroke-width: 2.2;
}

.meta-chip--highlight :deep(svg) {
  color: currentColor;
}

.meta-chip--highlight {
  background: #fff7e6;
  border-color: #faecd8;
  color: #d48806;
}

.archive-notice-inline {
  margin: 8px 18px 0;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid #faecd8;
  background: #fdf6ec;
  color: #b8720a;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.archive-notice-inline--completed {
  border-color: #b3e19d;
  background: #f0f9eb;
  color: #4e8b2b;
}

.archive-notice-inline--outdated {
  border-color: #faecd8;
  background: #fdf6ec;
  color: #b8720a;
}

.top-actions-grid {
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  align-self: start;
  padding-top: 0;
  min-width: 0;
}

/* EP: .el-button + .el-button { margin-left: 12px } — из‑за этого «Удалить» съезжает вправо относительно «Сохранить» */
.top-actions-grid :deep(.el-button + .el-button) {
  margin-left: 0;
}

.top-btn-delete {
  position: static;
}

.top-actions-grid :deep(.el-button) {
  min-height: 34px;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
}

.top-actions-grid :deep(.top-btn-save.el-button) {
  --el-button-bg-color: var(--el-color-primary);
  --el-button-border-color: var(--el-color-primary);
  --el-button-hover-bg-color: var(--el-color-primary-light-3);
  --el-button-hover-border-color: var(--el-color-primary-light-3);
  --el-button-active-bg-color: var(--el-color-primary-dark-2);
  --el-button-active-border-color: var(--el-color-primary-dark-2);
}

.top-actions-grid :deep(.top-btn-secondary.el-button) {
  --el-button-bg-color: #fdf6ec;
  --el-button-border-color: #faecd8;
  --el-button-text-color: #e6a23c;
  --el-button-hover-bg-color: #faecd8;
  --el-button-hover-border-color: #f5dab1;
  --el-button-hover-text-color: #c8852f;
}

.top-actions-grid :deep(.top-btn-delete.el-button) {
  min-height: 34px;
  width: 34px;
  padding: 0;
  --el-button-bg-color: #fef0f0;
  --el-button-border-color: #fde2e2;
  --el-button-text-color: #f56c6c;
  --el-button-hover-bg-color: #fde2e2;
  --el-button-hover-border-color: #fbc4c4;
  --el-button-hover-text-color: #dd6161;
}

.top-actions-divider {
  width: 1px;
  height: 22px;
  background: #dcdfe6;
}

.top-actions-grid :deep(.top-btn-close.el-button) {
  min-height: 34px;
  width: 34px;
  padding: 0;
  border-radius: 8px;
  --el-button-bg-color: #ffffff;
  --el-button-border-color: transparent;
  --el-button-text-color: #909399;
  --el-button-hover-bg-color: #f5f7fa;
  --el-button-hover-border-color: #ebeef5;
  --el-button-hover-text-color: #606266;
}

.details-form {
  display: grid;
  gap: 2px;
  margin-top: 2px;
  --field-label-gap: 4px;
  --field-block-gap: 10px;
}

.editor-layout {
  display: grid;
  grid-template-columns: var(--details-two-col-ratio);
  gap: 12px;
  align-items: start;
}

.editor-pane {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.editor-pane--right {
  position: static;
}

.content-section--attachments {
  margin-top: 0;
}

.editor-layout__full {
  display: block;
  min-width: 0;
  margin-top: 10px;
}

.details-bottom-panels {
  display: block;
  min-width: 0;
  margin-top: 10px;
}

.content-two-col {
  display: grid;
  grid-template-columns: var(--details-two-col-ratio);
  gap: 12px;
  align-items: stretch;
}

.content-two-col > .content-section {
  min-width: 0;
  height: 100%;
}

.editor-section {
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  padding: 0;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.editor-section__title {
  position: relative;
  margin: 0;
  padding: 11px 14px 11px 18px;
  background: #f9fafb;
  border-bottom: 1px solid #dcdfe6;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.01em;
}

.editor-section__title::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  width: 3px;
  height: 14px;
  border-radius: 999px;
  background: var(--el-color-primary);
  transform: translateY(-50%);
}

.editor-section > :not(.editor-section__title) {
  padding: 10px 12px 12px;
}

.details-form :deep(.el-form-item__label) {
  font-size: 12px;
  font-weight: 500;
  color: #606266;
  padding-bottom: var(--field-label-gap) !important;
  line-height: 1.3;
}

.details-form :deep(.el-form-item--label-top .el-form-item__label) {
  margin-bottom: 0;
  margin-top: 0;
  padding-bottom: var(--field-label-gap) !important;
}

.details-form :deep(.el-form-item) {
  margin: 0 !important;
}

.details-form :deep(.el-form-item__content) {
  line-height: 1.2;
}

.details-form :deep(.el-row) {
  row-gap: var(--field-block-gap);
}

.editor-section > :not(.editor-section__title) :deep(.el-form-item + .el-form-item) {
  margin-top: var(--field-block-gap) !important;
}

.editor-section .binding-grid :deep(.el-form-item + .el-form-item) {
  margin-top: 0 !important;
}

.binding-field {
  align-self: start;
}

.binding-field :deep(.el-form-item__label) {
  min-height: 16px;
}

.binding-field :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  margin-top: 0 !important;
}

.binding-field--tz :deep(.el-input__wrapper),
.binding-field--nmck :deep(.el-select__wrapper) {
  min-height: 36px;
}

.binding-zone :deep(.el-divider) {
  margin: 4px 0 10px;
}

.archive-divider {
  margin: 8px 0 10px;
}

.binding-grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr);
  gap: var(--field-block-gap) 12px;
  align-items: start;
}

.binding-stage {
  margin-bottom: 0 !important;
}

.details-form :deep(.el-input__wrapper),
.details-form :deep(.el-textarea__inner),
.details-form :deep(.el-select__wrapper),
.details-form :deep(.el-date-editor.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  background: #ffffff;
}

.details-form :deep(.el-input__wrapper:hover),
.details-form :deep(.el-textarea__inner:hover),
.details-form :deep(.el-select__wrapper:hover),
.details-form :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

.details-form :deep(.el-input__wrapper.is-focus),
.details-form :deep(.el-select__wrapper.is-focused),
.details-form :deep(.el-textarea__inner:focus),
.details-form :deep(.el-date-editor.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--el-color-primary) inset,
    0 0 0 3px rgba(var(--el-color-primary-rgb), 0.14);
}

.readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.readonly-card {
  border: 1px solid #e3e8f1;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  box-shadow: none;
}

.readonly-card.full {
  grid-column: 1 / -1;
}

.readonly-label {
  font-size: 12px;
  color: #667085;
  margin-bottom: 6px;
}

.readonly-value {
  font-size: 14px;
  line-height: 1.45;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Длинные тексты: скролл внутри карточки, а не только у всего drawer */
.readonly-card.full .readonly-value {
  max-height: min(42vh, 380px);
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
}

.readonly-card.full .readonly-value::-webkit-scrollbar {
  width: 8px;
}

.readonly-card.full .readonly-value::-webkit-scrollbar-thumb {
  background: rgba(130, 146, 168, 0.45);
  border-radius: 6px;
}

.readonly-nmck-tz .readonly-subline {
  margin-bottom: 4px;
}

:deep(.tz-autofill-input.is-disabled .el-textarea__inner) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

/* Ограничение высоты автоподстройки textarea (после maxRows всё равно растёт inner — режем по max-height) */
.drawer-textarea-tall :deep(.el-textarea__inner) {
  max-height: min(48vh, 420px);
  overflow-y: auto;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #667085;
  line-height: 1.45;
}

.comments-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.content-section {
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #ffffff;
  padding: 0;
  margin-top: 0;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.content-section__head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: 0;
  padding: 11px 14px 11px 18px;
  background: #f9fafb;
  border-bottom: 1px solid #dcdfe6;
}

.content-section__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.01em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.content-section__head::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  width: 3px;
  height: 14px;
  border-radius: 999px;
  background: var(--el-color-primary);
  transform: translateY(-50%);
}

.content-section > :not(.content-section__head) {
  padding: 10px 12px 12px;
}

.dual-panel {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.dual-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.dual-panel__footer {
  flex: 0 0 auto;
  margin-top: 8px;
  padding-top: 8px;
  min-height: 0;
  align-content: start;
}

.comments-list {
  display: grid;
  gap: 10px;
  align-content: flex-start;
}

.comment-card {
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  padding: 10px 11px;
  background: #f5f7fa;
  box-shadow: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.comment-card:hover {
  border-color: #c6d8f3;
  background: #f0f6ff;
  box-shadow: 0 2px 8px rgba(var(--el-color-primary-rgb), 0.1);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.comment-author-wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.comment-author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--el-color-primary);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-author-meta {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comment-author {
  font-weight: 600;
  color: #303133;
  font-size: 12px;
}

.comment-author-org {
  font-weight: 500;
  color: #909399;
}

.comment-date {
  color: #909399;
  font-size: 12px;
}

.comment-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.comment-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
  line-height: 1.5;
  font-size: 14px;
}

.comment-editor {
  display: grid;
  gap: 8px;
}

.comment-editor :deep(.el-textarea__inner) {
  min-height: 64px;
}

.comment-editor-actions {
  display: flex;
  justify-content: flex-end;
}

.comment-card .comment-delete-btn {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.comment-card:hover .comment-delete-btn {
  opacity: 1;
}

.comment-delete-btn {
  --el-button-bg-color: #ffffff;
  --el-button-border-color: #fbc4c4;
  --el-button-text-color: #f56c6c;
  --el-button-hover-bg-color: #fef0f0;
  --el-button-hover-border-color: #f56c6c;
  --el-button-hover-text-color: #e45656;
  min-height: 28px;
  width: 28px;
  border-radius: 7px;
  padding: 0;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.comment-add-btn {
  min-height: 30px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 500;
  --el-button-bg-color: var(--el-color-primary);
  --el-button-border-color: var(--el-color-primary);
  --el-button-hover-bg-color: var(--el-color-primary-light-3);
  --el-button-hover-border-color: var(--el-color-primary-light-3);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.attachments-block {
  display: grid;
  gap: 10px;
  align-content: flex-start;
}

.attachments-list {
  display: grid;
  gap: 7px;
  align-content: flex-start;
}

.comments-list :deep(.el-empty),
.attachments-block :deep(.el-empty) {
  margin: 2px 0 6px;
  padding: 0;
  min-height: 0;
}

.comments-list :deep(.el-empty__description),
.attachments-block :deep(.el-empty__description) {
  margin-top: 0;
}

.attachment-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #f5f7fa;
  box-shadow: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.attachment-row:hover {
  border-color: #c6d8f3;
  background: #f0f6ff;
  box-shadow: 0 2px 8px rgba(var(--el-color-primary-rgb), 0.1);
}

.attachment-name {
  font-weight: 500;
  color: #303133;
  font-size: 12px;
  word-break: break-word;
}

.attachment-meta {
  font-size: 12px;
  color: #909399;
}

.attachment-file-icon {
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background: #f5f7fa;
  color: #606266;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0 4px;
  text-transform: uppercase;
}

.attachment-file-icon.is-pdf {
  background: #fef0f0;
  border-color: #fbc4c4;
  color: #f56c6c;
}

.attachment-file-icon.is-doc {
  background: #ecf5ff;
  border-color: #c6e2ff;
  color: var(--el-color-primary);
}

.attachment-file-icon.is-xls {
  background: #f0f9eb;
  border-color: #c2e7b0;
  color: #67c23a;
}

.attachment-file-icon.is-msg {
  background: #fdf6ec;
  border-color: #f5dab1;
  color: #e6a23c;
}

.attachment-main {
  flex: 1 1 180px;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.attachment-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.attachment-row :deep(.el-button) {
  min-height: 28px;
  border-radius: 7px;
  font-size: 12px;
}

.attachment-download-btn {
  --el-button-bg-color: #ffffff;
  --el-button-border-color: #dcdfe6;
  --el-button-text-color: var(--el-color-primary);
  --el-button-hover-bg-color: var(--el-color-primary-light-9);
  --el-button-hover-border-color: var(--el-color-primary-light-7);
  --el-button-hover-text-color: var(--el-color-primary);
  min-height: 28px;
  width: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.attachment-detach-btn {
  --el-button-text-color: #f56c6c;
  --el-button-hover-text-color: #e45656;
  min-height: 28px;
  width: 28px;
  font-size: 12px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.attachments-toolbar {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}

.attachments-upload-btn {
  width: fit-content;
  min-height: 30px;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  --el-button-bg-color: var(--el-color-primary);
  --el-button-border-color: var(--el-color-primary);
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: var(--el-color-primary-light-3);
  --el-button-hover-border-color: var(--el-color-primary-light-3);
  --el-button-hover-text-color: #ffffff;
  --el-button-active-text-color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.attachments-upload-btn:hover,
.attachments-upload-btn:focus-visible {
  color: #ffffff;
}

.attachments-upload-btn :deep(.el-icon),
.attachments-upload-btn:hover :deep(.el-icon),
.attachments-upload-btn:focus-visible :deep(.el-icon) {
  color: #ffffff;
}

.record-action-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.record-action-dialog :deep(.el-dialog__header) {
  display: none;
}

.record-action-dialog :deep(.el-dialog__footer) {
  padding-top: 8px;
}

.record-action-dialog :deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.record-action-dialog__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  color: #606266;
  line-height: 1.45;
}

.record-action-dialog__title {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.record-action-dialog__head p {
  margin: 0;
  font-size: 12px;
  color: #606266;
}

.record-action-dialog__icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #fff7e6;
  color: #e6a23c;
}

.record-action-dialog__icon-badge--danger {
  background: #fef0f0;
  color: #f56c6c;
}

.archive-reason-option {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.14s ease, background-color 0.14s ease;
}

.archive-reason-option.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.archive-reason-option input {
  margin: 0;
  transform: translateY(1px);
}

.archive-reason-option span {
  line-height: 1.35;
}

.attachments-hint {
  font-size: 12px;
  color: #667085;
  line-height: 1.45;
}

.library-attach-block {
  display: grid;
  gap: 8px;
}

.library-attach-label {
  font-size: 13px;
  font-weight: 600;
  color: #344054;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.select-empty {
  display: block;
  padding: 10px 12px;
  font-size: 13px;
  color: #5c6b7f;
  line-height: 1.4;
}

.queue-select-footer {
  margin: 6px -12px -8px;
  padding: 8px 8px 6px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
}

.queue-select-add-btn {
  width: 100%;
  justify-content: flex-start;
  color: var(--el-color-primary);
  border-radius: 8px;
  padding: 8px 10px;
}

.queue-select-add-btn:hover {
  background: var(--el-color-primary-light-9);
}

.queue-select-add-btn__plus {
  font-size: 16px;
  line-height: 1;
  font-weight: 600;
  margin-right: 8px;
}

.tz-mode-toggle {
  margin-bottom: 0;
  display: flex;
  align-items: flex-end;
  min-height: 0;
  padding: 22px 0 0;
}

.tz-mode-toggle__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.tz-mode-toggle__label {
  font-size: 13px;
  color: #4b5565;
}

@media (max-width: 900px) {
  .top-bar {
    flex-direction: column;
  }

  .binding-grid {
    grid-template-columns: 1fr;
  }

  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-pane--right {
    position: static;
  }

  .content-two-col {
    grid-template-columns: 1fr;
  }

  .top-actions-grid {
    min-width: 0;
    width: 100%;
    justify-content: flex-start;
  }

  .readonly-grid {
    grid-template-columns: 1fr;
  }

  .readonly-card.full {
    grid-column: auto;
  }
}
/* Readonly вместо disabled: сохраняем возможность выделения/копирования текста. */
:deep(.tz-autofill-input .el-textarea__inner[readonly]) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

:deep(.tz-autofill-input .el-input__wrapper) {
  min-height: 32px;
}

:deep(.tz-autofill-input .el-input__inner[readonly]) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Минимальная высота для «Примечание». */
:deep(.note-textarea .el-textarea__inner) {
  min-height: 30px;
}

.details-drawer-editor-tabs {
  margin-top: 0;
}

.details-drawer-editor-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.details-drawer-editor-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.drawer-fn-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
}

.drawer-fn-tab__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.drawer-fn-tab__fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px 16px;
}

.drawer-fn-field__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #5c6b7f;
  margin-bottom: 4px;
}

.drawer-fn-field__value {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.4;
  word-break: break-word;
}

.drawer-fn-links-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}

@media (max-width: 900px) {
  .drawer-fn-links-grid {
    grid-template-columns: 1fr;
  }
}

.drawer-fn-links-card {
  border: 1px solid #edf1f6;
  border-radius: 12px;
  padding: 10px;
  background: #fbfdff;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  max-height: min(42vh, 420px);
  overflow: hidden;
  box-sizing: border-box;
}

.drawer-fn-links-card__title {
  font-size: 12px;
  font-weight: 700;
  color: #5c6b7f;
}

.drawer-fn-links-empty {
  color: #6b7280;
  font-size: 13px;
}

.drawer-fn-link-add-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
}

.drawer-fn-link-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.drawer-fn-links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;
  flex: 1 1 auto;
}

.drawer-fn-link-view {
  color: var(--el-color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
  font-size: 13px;
}

.drawer-fn-epic-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding: 0 2px 4px 0;
  min-height: 0;
  flex: 1 1 auto;
}

.drawer-fn-epic-card {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  display: grid;
  gap: 8px;
  cursor: pointer;
}

.drawer-fn-epic-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.drawer-fn-epic-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.drawer-fn-epic-card__key {
  color: #1f2937;
  font-weight: 700;
  font-size: 14px;
  word-break: break-all;
}

.drawer-fn-epic-card__summary {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.4;
  word-break: break-word;
}

.drawer-fn-epic-card__status {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

.drawer-fn-epic-progress {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.drawer-fn-epic-progress__part {
  height: 12px;
  border-radius: 999px;
  background: #e6ecf5;
}

.drawer-fn-epic-progress__part.is-open {
  background: #b8c1cf;
}

.drawer-fn-epic-progress__part.is-analysis {
  background: #c9ddff;
}

.drawer-fn-epic-progress__part.is-dev {
  background: #7daeff;
}

.drawer-fn-epic-progress__part.is-devtest {
  background: #245cc4;
}

.drawer-fn-epic-progress__part.is-closed {
  background: #2fa36b;
}

.drawer-fn-epic-progress__part.is-idle {
  background: #e6ecf5;
}

</style>

<!-- Dialog через Teleport: scoped не всегда цепляется к .el-dialog__* -->
<style>
.requirement-details-drawer.el-dialog {
  max-height: 94vh;
  height: 94vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 0 !important;
}

.requirement-details-drawer .el-dialog__header {
  display: none;
}

.requirement-details-drawer .el-dialog__title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.01em;
}

.requirement-details-drawer .el-dialog__body {
  padding: 0 !important;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  max-height: calc(94vh - 74px);
  background: transparent;
}

.el-overlay-dialog:has(.requirement-details-drawer) {
  overflow: hidden !important;
}
</style>