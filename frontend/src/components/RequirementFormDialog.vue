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
    <div class="drawer-body">
      <div class="drawer-top-sticky">
        <div class="top-bar">
          <div class="top-title-block">
            <h2 class="top-title">Новое предложение</h2>
          </div>

          <div class="top-actions-grid">
            <el-button class="top-btn-save" type="primary" :loading="loading" @click="submit">Создать</el-button>
            <el-button class="top-btn-cancel" plain @click="emit('update:modelValue', false)">Отмена</el-button>
            <span class="top-actions-divider" aria-hidden="true" />
            <el-button class="top-btn-close" circle plain @click="emit('update:modelValue', false)">
              <CloseL :size="16" />
            </el-button>
          </div>
        </div>
      </div>

      <div class="drawer-content-scroll">
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
                          <div class="field-hint">Пусто — сгенерируется автоматически (формат зависит от очереди и ГК).</div>
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
                          <el-input v-model="form.responsiblePerson" :disabled="fieldDisabled('responsiblePerson')" />
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
                            <el-option v-for="s in STANDARD_REQUIREMENT_STATUSES" :key="s" :label="s" :value="s" />
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

                  <section v-if="canEditAttachments" class="content-section content-section--attachments dual-panel">
                    <div class="content-section__head">
                      <h4 class="content-section__title">Вложения</h4>
                    </div>
                    <div class="dual-panel__body">
                      <div class="attachments-block">
                        <el-empty
                          v-if="!pendingFiles.length"
                          description="Файлов пока нет"
                          :image-size="0"
                        />

                        <div v-else class="attachments-list">
                          <div
                            v-for="(file, idx) in pendingFiles"
                            :key="`${file.name}-${idx}-${file.size}`"
                            class="attachment-row"
                          >
                            <span class="attachment-file-icon" :class="pendingFileIconTone(file.name) || undefined">{{
                              pendingFileExt(file.name)
                            }}</span>
                            <div class="attachment-main">
                              <span class="attachment-name">{{ file.name }}</span>
                              <span class="attachment-meta">Будет загружено после создания</span>
                            </div>
                            <div class="attachment-actions">
                              <el-button
                                class="attachment-detach-btn"
                                size="small"
                                type="danger"
                                link
                                @click="removePendingFile(idx)"
                              >
                                <el-icon><CloseBold /></el-icon>
                              </el-button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="attachments-toolbar dual-panel__footer">
                      <input
                        ref="createFileInputRef"
                        type="file"
                        multiple
                        class="visually-hidden"
                        accept=".docx,.xls,.xlsx,.xlsm,.doc,.pdf,.msg,.pst"
                        @change="onCreateFilesPicked"
                      />
                      <el-button
                        type="primary"
                        class="attachments-upload-btn"
                        :loading="attachmentsUploading"
                        @click="triggerCreateFilePick"
                      >
                        <el-icon><Plus /></el-icon>
                        <span>Загрузить файлы</span>
                      </el-button>
                      <span class="attachments-hint">
                        Допустимые форматы: doc, docx, pdf, xls, xlsx, xlsm, msg, pst. После создания файлы сохранятся в
                        общую библиотеку — их можно снова прикрепить к другим предложениям.
                      </span>
                    </div>
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
                      <div v-if="!(fnTabForm.confluenceLinks || []).length" class="drawer-fn-links-empty">
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
                        <el-input v-model="fnTabNewJiraEpicLink" placeholder="https://jira.../browse/KEY-123" />
                        <el-button type="primary" plain @click="fnTabAddJiraEpicLink">Добавить</el-button>
                      </div>
                      <div v-if="!functionTabEpicLinks.length" class="drawer-fn-links-empty">Ссылки не добавлены</div>
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
                            <el-button type="danger" plain size="small" @click.stop="fnTabRemoveJiraEpicLink(idx)">
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
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { CloseBold, Plus } from '@element-plus/icons-vue'
import { X as CloseL } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createRequirement, uploadRequirementAttachments } from '@/api/requirements'
import { createQueue, fetchQueues } from '@/api/queues'
import { fetchContracts } from '@/api/contracts'
import {
  fetchGKFunctionsForStage,
  fetchGKStages,
  previewJiraEpicStatuses,
  fetchStageJiraEpicStatuses,
  upsertGKFunction,
} from '@/api/gkContracts'
import { useAuthStore } from '@/stores/auth'
import type { GKFunction, GKStage, JiraEpicStatusItem, QueueItem, RequirementPayload } from '@/types'
import {
  DEFAULT_REQUIREMENT_STATUS,
  STANDARD_REQUIREMENT_STATUSES,
} from '@/constants/requirementStatuses'
import { SYSTEM_TYPE_OPTIONS } from '@/constants/systemTypes'
import { TELEPHONY_SECTION, isTelephonySectionName } from '@/constants/telephonySection'
import { initiatorForSystemType } from '@/constants/initiatorBySystem'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const authStore = useAuthStore()
const loading = defineModel<boolean>('loading', { default: false })

const canFullEdit = computed(() => authStore.canEditRequirementsFully)

function fieldDisabled(key: string) {
  return !authStore.canEditRequirementField(key)
}

const canEditAttachments = computed(
  () => canFullEdit.value || authStore.canEditRequirementField('attachments'),
)

const pendingFiles = ref<File[]>([])
const createFileInputRef = ref<HTMLInputElement | null>(null)
const attachmentsUploading = ref(false)
const queues = ref<QueueItem[]>([])
const contracts = ref<{ id: number; name: string }[]>([])
const DEFAULT_QUEUE_NAME = 'Не определена'

const selectedContractId = ref<number | null>(null)
const stages = ref<GKStage[]>([])
const functions = ref<GKFunction[]>([])
const selectedStageNumber = ref<number | null>(null)
const selectViaTz = ref(false)
const selectedTzSectionNumber = ref('')
const selectedNmckFunctionId = ref<number | null>(null)

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
  return match ? match[1]!.toUpperCase() : ''
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
    // ignore
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

const emptyForm = (): RequirementPayload => ({
  taskIdentifier: '',
  shortName: '',
  initiator: initiatorForSystemType('112'),
  responsiblePerson: authStore.fullName,
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: DEFAULT_QUEUE_NAME,
  noteText: '',
  tzPointText: '',
  nmckPointText: '',
  contractTZFunctionId: null,
  statusText: DEFAULT_REQUIREMENT_STATUS,
  systemType: '112',
  contractName: '',
  completedAt: null,
  ditOutgoingNumber: '',
  ditOutgoingDate: null,
})

const form = reactive<RequirementPayload>(emptyForm())

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

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      detailsCardTab.value = 'proposal'
      functionTabEpicStatuses.value = []
      await loadQueues()
      await loadContracts()
      Object.assign(form, emptyForm())
      selectedContractId.value = null
      stages.value = []
      functions.value = []
      selectedStageNumber.value = null
      selectViaTz.value = false
      selectedTzSectionNumber.value = ''
      selectedNmckFunctionId.value = null
      pendingFiles.value = []
      resetFnTabForm()
      if (createFileInputRef.value) createFileInputRef.value.value = ''
      if (queues.value.length && !form.implementationQueue) {
        form.implementationQueue = queues.value[0]!.name
      }
    }
  },
)

function triggerCreateFilePick() {
  createFileInputRef.value?.click()
}

function onCreateFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return
  for (const f of files) {
    const name = (f.name || '').trim().toLowerCase()
    if (pendingFiles.value.some((x) => x.name.toLowerCase() === name && x.size === f.size)) continue
    pendingFiles.value = [...pendingFiles.value, f]
  }
  input.value = ''
}

function removePendingFile(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index)
}

function pendingFileExt(name: string) {
  const n = (name || '').trim().toLowerCase()
  const ext = n.includes('.') ? (n.split('.').pop() || '') : ''
  if (!ext) return 'FILE'
  return ext.length > 4 ? ext.slice(0, 4).toUpperCase() : ext.toUpperCase()
}

function pendingFileIconTone(name: string) {
  const ext = pendingFileExt(name).toLowerCase()
  if (ext === 'pdf') return 'is-pdf'
  if (ext === 'doc' || ext === 'docx') return 'is-doc'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'xlsm') return 'is-xls'
  if (ext === 'msg' || ext === 'pst') return 'is-msg'
  return ''
}

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
  } catch (error: any) {
    console.error('queues load error', error)
    queues.value = [{ id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' }]
  }
}

async function loadContracts() {
  try {
    contracts.value = await fetchContracts()
  } catch {
    contracts.value = []
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

function resolveContractIdByName(contractName: string) {
  const name = (contractName || '').trim().toLowerCase()
  if (!name) return null
  const c = contracts.value.find((x) => (x.name || '').trim().toLowerCase() === name)
  return c?.id ?? null
}

async function onContractChange(value: string | null | undefined) {
  const name = typeof value === 'string' ? value : ''
  form.contractName = name
  const id = resolveContractIdByName(name)
  selectedContractId.value = id

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
  if (!id) return
  stages.value = await fetchGKStages(id)
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
  form.tzPointText = tz
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

async function submit() {
  try {
    if (!form.systemType || (form.systemType !== '112' && form.systemType !== '101')) {
      ElMessage.warning('Выберите систему 112 или 101')
      return
    }
    if (isTelephonySectionName(form.sectionName) && form.systemType !== '112' && form.systemType !== '101') {
      ElMessage.warning('Для раздела «Телефония» укажите систему 112 или 101')
      return
    }
    loading.value = true
    if (currentGkFunction.value) {
      await saveFunctionTabChanges()
    }
    const payload: RequirementPayload = { ...form }
    if (!(payload.taskIdentifier || '').trim()) {
      delete payload.taskIdentifier
    }
    if (!payload.completedAt) delete payload.completedAt
    if (!payload.ditOutgoingDate) delete payload.ditOutgoingDate
    if (!(payload.ditOutgoingNumber || '').trim()) delete payload.ditOutgoingNumber
    const created = await createRequirement(payload)
    if (pendingFiles.value.length) {
      try {
        attachmentsUploading.value = true
        await uploadRequirementAttachments(created.id, [...pendingFiles.value])
      } catch (uploadErr: any) {
        ElMessage.error(uploadErr?.response?.data?.message || 'Запись создана, но не удалось загрузить вложения')
      } finally {
        attachmentsUploading.value = false
      }
    }
    ElMessage.success('Предложение создано')
    emit('saved')
    emit('update:modelValue', false)
  } catch (error: any) {
    if (error?.message === 'Function name is required') return
    if (error?.message === 'Function NMCK number is required') return
    if (error?.message === 'Function TZ section is required') return
    ElMessage.error(error?.response?.data?.message || 'Ошибка создания предложения')
  } finally {
    loading.value = false
  }
}

function onSystemTypeChange() {
  form.initiator = initiatorForSystemType(form.systemType)
}
</script>

<style scoped src="@/styles/requirement-create-drawer-scoped-snippet.css"></style>

<style scoped>
.top-actions-grid :deep(.top-btn-cancel.el-button) {
  min-height: 34px;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  --el-button-bg-color: #ffffff;
  --el-button-border-color: #dcdfe6;
  --el-button-text-color: #606266;
  --el-button-hover-bg-color: #f5f7fa;
  --el-button-hover-border-color: #c0c4cc;
  --el-button-hover-text-color: #303133;
}

.top-actions-grid :deep(.top-btn-cancel + .el-button) {
  margin-left: 0;
}
</style>
