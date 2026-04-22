<template>
  <el-drawer
    class="requirement-details-drawer"
    :model-value="modelValue"
    size="920px"
    :title="drawerTitle"
    @close="emit('update:modelValue', false)"
  >
    <div v-loading="loading" class="drawer-body">
      <template v-if="item">
        <div class="drawer-top-sticky">
          <div class="top-bar">
            <div class="meta-block">
              <div class="meta-line"><span class="meta-label">ID:</span> {{ item.taskIdentifier }}</div>
              <div class="meta-line"><span class="meta-label">Автор:</span> {{ item.authorName }}</div>
              <div class="meta-line"><span class="meta-label">Организация автора:</span> {{ item.authorOrg }}</div>
              <div class="meta-line">
                <span class="meta-label">Последние изменения внес:</span>
                {{ item.lastEditedBy || '—' }}
                — {{ item.lastEditedOrg || '—' }}
                — {{ formatDateTime(item.updatedAt) }}
              </div>
              <div class="meta-line">
                <span class="meta-label">Дата создания:</span>
                {{ formatDateOnly(item.createdAt) }}
              </div>
              <div class="meta-line">
                <span class="meta-label">Дата выполнения:</span>
                {{ item.completedAt ? formatDateOnly(item.completedAt) : '—' }}
              </div>
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
                  type="warning"
                  :loading="actionLoading"
                  @click="handleArchive"
                >
                  В архив
                </el-button>

                <el-button
                  v-else
                  class="top-btn-secondary"
                  type="success"
                  :loading="actionLoading"
                  @click="handleRestore"
                >
                  Восстановить
                </el-button>

              </template>
              <el-tooltip v-if="canDeleteRequirements" content="Удалить" placement="bottom">
                <el-button
                  class="top-btn-delete"
                  type="danger"
                  plain
                  size="small"
                  :icon="Delete"
                  :loading="deleteLoading"
                  circle
                  @click="handleDeleteRequirement"
                />
              </el-tooltip>
            </div>
          </div>
        </div>

        <div class="drawer-content-scroll">
          <div
            v-if="archiveNotice"
            class="archive-notice"
            :class="archiveNotice.type === 'completed' ? 'archive-notice--completed' : 'archive-notice--outdated'"
          >
            {{ archiveNotice.text }}
          </div>
          <el-divider />

        <!--
          Режим редактирования:
          поля доступны только пользователю с правом edit / superuser.
        -->
        <template v-if="canManageRequirementCard">
          <el-form label-position="top" class="details-form">
            <el-row :gutter="16">
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

              <el-col :span="24">
                <el-form-item label="Предложение">
                  <el-input
                    v-model="form.proposalText"
                    type="textarea"
                    :autosize="{ minRows: 4, maxRows: 16 }"
                    :disabled="fieldDisabled('proposalText')"
                    class="drawer-textarea-tall"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-form-item label="Комментарии и описание проблем">
                  <el-input
                    v-model="form.problemComment"
                    type="textarea"
                    :autosize="{ minRows: 4, maxRows: 16 }"
                    :disabled="fieldDisabled('problemComment')"
                    class="drawer-textarea-tall"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-form-item label="Обсуждение">
                  <el-input
                    v-model="form.discussionSummary"
                    type="textarea"
                    :autosize="{ minRows: 4, maxRows: 16 }"
                    :disabled="fieldDisabled('discussionSummary')"
                    class="drawer-textarea-tall"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-divider />

                <el-form-item label="Этап">
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

                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="п.п. НМЦК">
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
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="п.п. ТЗ">
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
                        type="textarea"
                        readonly
                        :autosize="{ minRows: 1, maxRows: 4 }"
                        placeholder="Подставится после выбора п.п. НМЦК"
                        class="tz-autofill-input"
                      />
                    </el-form-item>
                  </el-col>

                </el-row>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Примечание">
                  <el-input
                    v-model="form.noteText"
                    type="textarea"
                  :autosize="{ minRows: 1, maxRows: 12 }"
                  class="note-textarea"
                    :disabled="fieldDisabled('noteText')"
                  />
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

              <el-col :span="12">
                <el-form-item label="Письмо в ДИТ — номер исходящего">
                  <el-input
                    v-model="form.ditOutgoingNumber"
                    clearable
                    :disabled="fieldDisabled('ditOutgoing')"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
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
              </el-col>
            </el-row>
          </el-form>
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

        <el-divider content-position="left">Вложения</el-divider>

        <div class="attachments-block">
          <el-empty
            v-if="!item.attachments?.length"
            description="Файлов пока нет"
            :image-size="72"
          />

          <div v-else class="attachments-list">
            <div v-for="att in item.attachments" :key="att.id" class="attachment-row">
              <span class="attachment-name">{{
                att.libraryFile?.originalFileName || 'Файл'
              }}</span>
              <span class="attachment-meta">{{ formatDateTime(att.createdAt) }}</span>
              <el-button size="small" @click="downloadAttachment(att)">Скачать</el-button>
              <el-button
                v-if="canEditAttachments"
                size="small"
                type="danger"
                link
                :loading="detachLoadingId === att.id"
                @click="confirmDetachAttachment(att)"
              >
                Открепить
              </el-button>
            </div>
          </div>

          <template v-if="canEditAttachments">
            <div class="attachments-toolbar">
              <input
                ref="reqFileInputRef"
                type="file"
                multiple
                class="visually-hidden"
                accept=".docx,.xls,.xlsx,.xlsm,.doc,.pdf,.msg,.pst"
                @change="onReqAttachmentFilesPicked"
              />
              <el-button :loading="attachmentsUploading" @click="triggerReqAttachmentFilePick">
                Загрузить файлы
              </el-button>
              <span class="attachments-hint">
                Допустимые форматы: doc, docx, pdf, xls, xlsx, xlsm, msg, pst. Загруженные файлы сохраняются в
                общую библиотеку — их можно снова прикрепить к другим предложениям.
              </span>
            </div>

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
          </template>
        </div>

        <el-divider />

        <!-- Комментарии -->
        <div class="comments-title">Комментарии</div>

        <div class="comments-list">
          <el-empty
            v-if="!item.comments || item.comments.length === 0"
            description="Комментариев пока нет"
          />

          <div v-else class="comment-card" v-for="comment in item.comments" :key="comment.id">
            <div class="comment-header">
              <div class="comment-author">
                {{ comment.authorName }} · {{ comment.authorOrg }}
              </div>
              <div class="comment-right">
                <div class="comment-date">{{ formatDateTime(comment.createdAt) }}</div>
                <el-button
                  v-if="canDeleteRequirementComment"
                  size="small"
                  type="danger"
                  plain
                  :loading="deleteCommentLoadingId === comment.id"
                  @click="handleDeleteComment(comment.id)"
                >
                  Удалить
                </el-button>
              </div>
            </div>
            <div class="comment-text">{{ comment.commentText }}</div>
          </div>
        </div>

        <div v-if="canAddRequirementComment" class="comment-editor">
          <el-input
            v-model="newCommentText"
            type="textarea"
            :rows="3"
            placeholder="Введите комментарий"
          />
          <div class="comment-editor-actions">
            <el-button type="primary" :loading="commentLoading" @click="handleAddComment">
              Добавить комментарий
            </el-button>
          </div>
        </div>
        </div>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { createQueue, fetchQueues } from '@/api/queues'
import { fetchContracts } from '@/api/contracts'
import { fetchGKContractDetails, fetchGKFunctionsForStage, fetchGKStages } from '@/api/gkContracts'
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
  const reason = await askArchiveReason()
  if (!reason) return

  try {
    actionLoading.value = true
    await archiveRequirement(item.value.id, reason)
    ElMessage.success('Запись отправлена в архив')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка архивирования')
  } finally {
    actionLoading.value = false
  }
}

async function askArchiveReason(): Promise<ArchiveRequirementReason | null> {
  try {
    await ElMessageBox.confirm(
      'Укажите причину архивации: предложение выполнено или больше не актуально?',
      'Причина архивации',
      {
        type: 'warning',
        confirmButtonText: 'Выполнено',
        cancelButtonText: 'Не актуально',
        distinguishCancelAndClose: true,
      },
    )
    return 'completed'
  } catch (error: any) {
    if (error === 'cancel') return 'outdated'
    return null
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
  try {
    await ElMessageBox.confirm(
      'Удалить запись? Она исчезнет из списков. Это не архив.',
      'Удаление предложения',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    deleteLoading.value = true
    await deleteRequirement(item.value.id)
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

async function confirmDetachAttachment(att: RequirementAttachmentItem) {
  const name = att.libraryFile?.originalFileName || 'файл'
  try {
    await ElMessageBox.confirm(
      `Открепить «${name}» от этого предложения? Запись в библиотеке сохранится — файл можно прикрепить снова.`,
      'Открепление файла',
      { type: 'warning', confirmButtonText: 'Открепить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }

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

async function handleDeleteComment(commentId: number) {
  if (!item.value) return

  try {
    await ElMessageBox.confirm(
      'Удалить этот комментарий?',
      'Удаление комментария',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
  } catch {
    return
  }

  try {
    deleteCommentLoadingId.value = commentId
    await deleteRequirementComment(item.value.id, commentId)
    ElMessage.success('Комментарий удалён')
    await loadItem()
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления комментария')
  } finally {
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

/**
 * При открытии drawer и смене id загружаем данные.
 */
watch(
  () => [props.modelValue, props.requirementId],
  async ([opened, id]) => {
    if (!opened || !id) return

    libraryOptions.value = []
    libraryPickValue.value = null
    await loadQueues()
    await loadItem()
  },
  { immediate: true },
)
</script>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
}

.drawer-top-sticky {
  position: relative;
  z-index: 20;
  margin: 0;
  padding: 0 20px 10px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 0 rgba(26, 35, 50, 0.04);
}

.drawer-content-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 20px;
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
  gap: 16px;
  align-items: flex-start;
  position: relative;
  min-height: 148px;
}

.meta-block {
  display: grid;
  gap: 6px;
}

.meta-line {
  font-size: 14px;
  color: #344054;
}

.meta-label {
  font-weight: 700;
}

.top-actions-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 8px;
  margin-left: auto;
  align-self: start;
}

/* EP: .el-button + .el-button { margin-left: 12px } — из‑за этого «Удалить» съезжает вправо относительно «Сохранить» */
.top-actions-grid :deep(.el-button + .el-button) {
  margin-left: 0;
}

.top-btn-save {
  grid-column: 1;
  grid-row: 1;
}

.top-btn-secondary {
  grid-column: 2;
  grid-row: 1;
}

.top-btn-delete {
  position: absolute;
  right: 0;
  bottom: 0;
}

/* Нет «Сохранить» — вторичная кнопка в первой колонке, без пустой ячейки */
.top-actions-grid:not(:has(.top-btn-save)) .top-btn-secondary {
  grid-column: 1;
  grid-row: 1;
}

.top-actions-grid:not(:has(.top-btn-save)) .top-btn-delete {
  position: absolute;
  right: 0;
  bottom: 0;
}

.details-form {
  display: grid;
  gap: 8px;
}

.readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.readonly-card {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fff;
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
}

.comments-list {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.comment-card {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fff;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 600;
  color: #344054;
}

.comment-date {
  color: #667085;
  font-size: 13px;
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
  color: #1f2937;
}

.comment-editor {
  display: grid;
  gap: 10px;
}

.comment-editor-actions {
  display: flex;
  justify-content: flex-end;
}

.attachments-block {
  display: grid;
  gap: 14px;
}

.attachments-list {
  display: grid;
  gap: 10px;
}

.attachment-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 10px 14px;
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  background: #fff;
}

.attachment-name {
  flex: 1 1 180px;
  font-weight: 600;
  color: #1f2937;
  word-break: break-word;
}

.attachment-meta {
  font-size: 13px;
  color: #667085;
}

.attachments-toolbar {
  display: grid;
  gap: 8px;
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
  margin-bottom: 10px;
}

.tz-mode-toggle__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tz-mode-toggle__label {
  font-size: 13px;
  color: #4b5565;
}

@media (max-width: 900px) {
  .top-bar {
    flex-direction: column;
  }

  .readonly-grid {
    grid-template-columns: 1fr;
  }

  .readonly-card.full {
    grid-column: auto;
  }
}
/* Readonly вместо disabled: сохраняем возможность выделения/копирования текста. */
::deep(.tz-autofill-input .el-textarea__inner[readonly]) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

/* Минимальная высота для «Примечание». */
::deep(.note-textarea .el-textarea__inner) {
  min-height: 30px;
}

:deep(.tz-autofill-input .el-textarea__inner[readonly]) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

:deep(.note-textarea .el-textarea__inner) {
  min-height: 30px;
}

</style>

<!-- Drawer через Teleport: scoped не всегда цепляется к .el-drawer__*; класс может быть на корне или обёртке -->
<style>
.requirement-details-drawer .el-drawer__header {
  margin-bottom: 0 !important;
  padding-bottom: 15px;
}

.requirement-details-drawer .el-drawer__body {
  padding: 0 !important;
}
</style>