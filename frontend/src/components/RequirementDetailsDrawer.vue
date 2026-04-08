<template>
  <el-drawer
    :model-value="modelValue"
    size="920px"
    :title="drawerTitle"
    @close="emit('update:modelValue', false)"
  >
    <div v-loading="loading" class="drawer-body">
      <template v-if="item">
        <!--
          Верхняя панель карточки.
          Для read-only пользователя здесь нет кнопок изменения.
        -->
        <div class="top-bar">
          <div class="meta-block">
            <div class="meta-line"><span class="meta-label">ID:</span> {{ item.taskIdentifier }}</div>
            <div class="meta-line"><span class="meta-label">Автор:</span> {{ item.authorName }}</div>
            <div class="meta-line"><span class="meta-label">Организация автора:</span> {{ item.authorOrg }}</div>
            <div class="meta-line"><span class="meta-label">Создано:</span> {{ formatDateTime(item.createdAt) }}</div>
            <div class="meta-line">
              <span class="meta-label">Последние изменения внес:</span>
              {{ item.lastEditedBy || '—' }}
              — {{ item.lastEditedOrg || '—' }}
              — {{ formatDateTime(item.updatedAt) }}
            </div>
          </div>

          <div v-if="canEdit" class="top-actions">
            <el-button type="primary" :loading="saveLoading" @click="handleSave">
              Сохранить
            </el-button>

            <el-button
              v-if="!item.isArchived"
              type="warning"
              :loading="actionLoading"
              @click="handleArchive"
            >
              В архив
            </el-button>

            <el-button
              v-else
              type="success"
              :loading="actionLoading"
              @click="handleRestore"
            >
              Восстановить
            </el-button>
          </div>
        </div>

        <el-divider />

        <!--
          Режим редактирования:
          поля доступны только пользователю с правом edit / superuser.
        -->
        <template v-if="canEdit">
          <el-form label-position="top" class="details-form">
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="Идентификатор задачи">
                  <el-input v-model="form.taskIdentifier" placeholder="Уникальный идентификатор" />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Краткое наименование предложения">
                  <el-input v-model="form.shortName" />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Инициатор">
                  <el-input v-model="form.initiator" />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Ответственный">
                  <el-input v-model="form.responsiblePerson" />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Раздел">
                  <el-input v-model="form.sectionName" />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Очередь">
                  <el-select v-model="form.implementationQueue" style="width: 100%">
                    <el-option
                      v-for="queue in queues"
                      :key="queue.id"
                      :label="queue.name"
                      :value="queue.name"
                    />
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
                  <el-select v-model="form.systemType" style="width: 100%" @change="onSystemTypeChange">
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
                  <el-input v-model="form.proposalText" type="textarea" :rows="4" />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-form-item label="Комментарии и описание проблем">
                  <el-input v-model="form.problemComment" type="textarea" :rows="4" />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-form-item label="Обсуждение">
                  <el-input v-model="form.discussionSummary" type="textarea" :rows="4" />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-divider />

                <el-form-item label="Этап">
                  <el-select
                    v-model="selectedStageNumber"
                    placeholder="Сначала выберите ГК"
                    style="width: 100%"
                    :disabled="!selectedContractId"
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

                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="п.п. НМЦК — функция">
                      <el-select
                        v-model="selectedFunctionId"
                        placeholder="Сначала выберите этап"
                        style="width: 100%"
                        :disabled="!selectedStageNumber"
                        filterable
                        clearable
                        @change="handleFunctionSelected"
                      >
                        <el-option
                          v-for="fn in functions"
                          :key="fn.id"
                          :label="nmckFunctionOptionLabel(fn)"
                          :value="fn.id"
                        />
                        <template #empty>
                          <span class="select-empty">Для выбранного этапа нет функций в справочнике ГК.</span>
                        </template>
                      </el-select>
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="п.п. ТЗ">
                      <el-input
                        :model-value="form.tzPointText"
                        type="textarea"
                        :rows="2"
                        readonly
                        disabled
                        placeholder="Подставится после выбора функции НМЦК"
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
                    :autosize="{ minRows: 3, maxRows: 12 }"
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
              <div class="readonly-label">Очередь</div>
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
                v-if="canEdit"
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

          <template v-if="canEdit">
            <div class="attachments-toolbar">
              <input
                ref="reqFileInputRef"
                type="file"
                multiple
                class="visually-hidden"
                accept=".docx,.xls,.xlsx,.xlsm,.doc,.pdf"
                @change="onReqAttachmentFilesPicked"
              />
              <el-button :loading="attachmentsUploading" @click="triggerReqAttachmentFilePick">
                Загрузить файлы
              </el-button>
              <span class="attachments-hint">
                Допустимые форматы: doc, docx, pdf, xls, xlsx, xlsm. Загруженные файлы сохраняются в общую
                библиотеку — их можно снова прикрепить к другим предложениям.
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
              <div class="comment-date">{{ formatDateTime(comment.createdAt) }}</div>
            </div>
            <div class="comment-text">{{ comment.commentText }}</div>
          </div>
        </div>

        <!--
          Добавление нового комментария доступно только edit-пользователю.
        -->
        <div v-if="canEdit" class="comment-editor">
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
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { fetchQueues } from '@/api/queues'
import { fetchContracts } from '@/api/contracts'
import { fetchGKContractDetails, fetchGKFunctionsForStage, fetchGKStages } from '@/api/gkContracts'
import {
  addRequirementComment,
  archiveRequirement,
  attachRequirementFromLibrary,
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
}>()

/**
 * Store текущего пользователя.
 */
const authStore = useAuthStore()

/**
 * Пользователь может редактировать только если у него edit или superuser.
 */
const canEdit = computed(() => authStore.isSuperuser || authStore.accessLevel === 'edit')

/**
 * Заголовок drawer.
 */
const drawerTitle = computed(() => {
  return item.value?.taskIdentifier
    ? `Карточка предложения — ${item.value.taskIdentifier}`
    : 'Карточка предложения'
})

/**
 * Состояния.
 */
const loading = ref(false)
const saveLoading = ref(false)
const actionLoading = ref(false)
const commentLoading = ref(false)

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
const selectedFunctionId = ref<number | null>(null)

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
    queues.value = await fetchQueues()
  } catch {
    queues.value = []
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
  form.implementationQueue = data.implementationQueue || ''
  form.contractName = data.contractName || ''
  form.contractTZFunctionId = data.contractTZFunctionId ?? null
  form.noteText = data.noteText || ''
  form.tzPointText = data.tzPointText || ''
  form.nmckPointText = data.nmckPointText || ''
  form.statusText = data.statusText || ''
  form.systemType = data.systemType || ''
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
  selectedFunctionId.value = null
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
  selectedFunctionId.value = null
  functions.value = []
  form.contractTZFunctionId = null
  form.tzPointText = ''
  form.nmckPointText = ''

  if (!selectedContractId.value || !stageNumber) return
  functions.value = await fetchGKFunctionsForStage(selectedContractId.value, stageNumber)
}

function handleFunctionSelected(functionId: number | null) {
  if (!functionId) {
    form.contractTZFunctionId = null
    form.tzPointText = ''
    form.nmckPointText = ''
    return
  }

  const fn = functions.value.find((x) => x.id === functionId)
  if (!fn) return

  form.contractTZFunctionId = functionId
  form.tzPointText = `${fn.tzSectionNumber} — ${fn.functionName}`
  form.nmckPointText = (fn.nmckFunctionNumber || '').trim()
}

async function initGKSelectionFromRequirement(data: Requirement) {
  selectedContractId.value = null
  selectedStageNumber.value = null
  selectedFunctionId.value = null
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
        selectedFunctionId.value = fn.id
        functions.value = stage.functions || []
        form.contractTZFunctionId = fn.id
        form.tzPointText = `${fn.tzSectionNumber} — ${fn.functionName}`
        form.nmckPointText = (fn.nmckFunctionNumber || '').trim() || (data.nmckPointText || '')
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
    await updateRequirement(item.value.id, { ...form })
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

  try {
    actionLoading.value = true
    await archiveRequirement(item.value.id)
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

/**
 * Формат даты и времени.
 */
function formatDateTime(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('ru-RU')
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
  display: grid;
  gap: 16px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
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

.top-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.readonly-nmck-tz .readonly-subline {
  margin-bottom: 4px;
}

:deep(.tz-autofill-input.is-disabled .el-textarea__inner) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

.comments-title {
  font-size: 18px;
  font-weight: 700;
}

.comments-list {
  display: grid;
  gap: 10px;
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
</style>