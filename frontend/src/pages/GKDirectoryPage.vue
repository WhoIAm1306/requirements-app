<template>
  <div class="page">
    <div class="page-shell">
      <!-- Шапка страницы -->
      <div class="page-header">
        <div>
          <div class="page-title-row">
            <h2 class="page-title">Справочник ГК</h2>
            <span class="meta-badge">{{ authStore.organization }}</span>
          </div>
          <div class="meta">{{ authStore.fullName }}</div>
        </div>

        <div class="header-actions">
          <el-button @click="router.push('/requirements')">Назад</el-button>

          <el-button v-if="canEditContract" type="primary" @click="openCreateContract">
            Добавить ГК
          </el-button>
        </div>
      </div>

      <!-- Таблица ГК -->
      <el-card class="table-card" shadow="never">
        <el-table
          class="gkd-contracts-table"
          :data="contracts"
          v-loading="loading"
          stripe
          border
          empty-text="В справочнике пока нет государственных контрактов"
          row-key="id"
          :height="520"
          @row-click="handleRowClick"
        >
          <el-table-column prop="name" label="ГК" min-width="240" show-overflow-tooltip />
          <el-table-column
            prop="shortName"
            label="Краткое наименование"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column label="Описание" min-width="340">
            <template #default="{ row }">
              <span class="cell-clamp" :title="row.description || ''">
                {{ shortText(row.description || '', 120) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Создан" min-width="120" width="128">
            <template #default="{ row }">
              {{ formatCreatedAt(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="" width="220" fixed="right" align="center">
            <template #default="{ row }">
              <div class="gkd-actions-cell">
                <el-button size="small" @click.stop="handleRowClick(row)">
                  Открыть
                </el-button>
                <el-button
                  v-if="canDelete"
                  size="small"
                  type="danger"
                  plain
                  @click.stop="confirmDeleteContract(row)"
                >
                  Удалить
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Drawer деталей ГК -->
      <el-drawer
        class="gkd-drawer"
        :model-value="detailsVisible"
        size="980px"
        :title="drawerTitle"
        @close="detailsVisible = false"
      >
        <div v-loading="drawerLoading" class="drawer-body gkd-drawer-body">
          <!-- Основная информация -->
          <el-card shadow="never" class="section-card">
            <template v-if="contractDetails">
              <div class="section-header">
                <div class="section-title">Главная информация</div>

                <div v-if="canEditContract || canDelete" class="section-actions section-actions--split">
                  <div class="section-actions-group">
                    <el-button
                      v-if="canEditContract"
                      type="primary"
                      :loading="saveLoading"
                      @click="handleSaveContract"
                    >
                      Сохранить
                    </el-button>
                  </div>
                  <div v-if="canDelete" class="section-actions-group section-actions-group--danger">
                    <el-button type="danger" plain @click="confirmDeleteContractFromDrawer">
                      Удалить ГК
                    </el-button>
                  </div>
                </div>
              </div>

              <el-form v-if="canEditContract" class="gkd-main-form" label-position="top">
                <el-form-item label="Наименование ГК">
                  <el-input v-model="contractForm.name" placeholder="Введите наименование" />
                </el-form-item>
                <el-form-item label="Краткое наименование">
                  <el-input
                    v-model="contractForm.shortName"
                    placeholder="Кратко (для идентификатора и подписи в списке предложений)"
                  />
                </el-form-item>
                <el-form-item label="Учитывать краткое наименование в идентификационном номере">
                  <el-switch v-model="contractForm.useShortNameInTaskId" />
                </el-form-item>
                <el-form-item label="Описание / главная информация">
                  <el-input
                    v-model="contractForm.description"
                    type="textarea"
                    :rows="4"
                    placeholder="Кратко опишите ГК (необязательно)"
                  />
                </el-form-item>
              </el-form>

              <div v-else class="readonly-grid">
                <div class="readonly-card">
                  <div class="readonly-label">Наименование ГК</div>
                  <div class="readonly-value">{{ contractDetails.name || '—' }}</div>
                </div>
                <div class="readonly-card">
                  <div class="readonly-label">Краткое наименование</div>
                  <div class="readonly-value">{{ contractDetails.shortName || '—' }}</div>
                </div>
                <div class="readonly-card">
                  <div class="readonly-label">Краткое в идентификаторе</div>
                  <div class="readonly-value">
                    {{ contractDetails.useShortNameInTaskId ? 'Да' : 'Нет' }}
                  </div>
                </div>
                <div class="readonly-card full">
                  <div class="readonly-label">Описание</div>
                  <div class="readonly-value">{{ contractDetails.description || '—' }}</div>
                </div>
              </div>
            </template>
          </el-card>

          <!-- Этапы -->
          <el-card shadow="never" class="section-card section-card--stages">
            <div class="section-header section-header--stages">
              <div class="section-title">Этапы</div>

              <div class="section-actions section-actions--toolbar">
                <el-button
                  v-if="canEditStages"
                  @click="handleAddStage"
                  type="primary"
                  plain
                >
                  Добавить этап
                </el-button>

                <el-button v-if="canEditFunctions" @click="downloadGKTemplate">
                  Шаблон функций ТЗ
                </el-button>

                <el-button v-if="canEditFunctions" @click="importVisible = true">
                  Импорт из Excel
                </el-button>
              </div>
            </div>

            <el-empty
              v-if="!contractDetails?.stages?.length"
              description="У этой ГК пока нет этапов — добавьте этап кнопкой выше"
            />

            <el-collapse v-else accordion class="gkd-stages-collapse">
              <el-collapse-item v-for="stage in contractDetails?.stages" :key="stage.id" :name="String(stage.id)">
                <template #title>
                  <div class="collapse-stage-header">
                    <span class="collapse-stage-title-text">{{ stageCollapseTitle(stage) }}</span>
                    <el-button
                      v-if="canEditStages"
                      type="primary"
                      size="small"
                      plain
                      class="collapse-stage-rename"
                      @click.stop="handleRenameStage(stage)"
                    >
                      Переименовать
                    </el-button>
                    <el-button
                      v-if="canDelete"
                      type="danger"
                      size="small"
                      plain
                      class="collapse-stage-delete"
                      @click.stop="confirmDeleteStage(stage.stageNumber)"
                    >
                      Удалить этап
                    </el-button>
                  </div>
                </template>

                <div class="stage-body">
                  <el-table
                    :data="stage.functions || []"
                    size="small"
                    border
                    class="gkd-functions-table"
                    empty-text="Для этого этапа ещё не добавлены функции ТЗ"
                  >
                    <el-table-column prop="functionName" label="Наименование функции" min-width="280" show-overflow-tooltip />
                    <el-table-column prop="nmckFunctionNumber" label="НМЦК" width="120" />
                    <el-table-column prop="tzSectionNumber" label="Раздел ТЗ" min-width="120" />
                    <el-table-column v-if="authStore.canAccessExternalLinks" label="Jira" width="130" class-name="jira-col">
                      <template #default="{ row: fnRow }">
                        <a
                          v-if="jiraHref(fnRow.jiraLink)"
                          :href="String(jiraHref(fnRow.jiraLink))"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="jira-table-link"
                          :title="fnRow.jiraLink"
                          @click.stop
                        >
                          Открыть
                        </a>
                        <span v-else class="muted-dash">—</span>
                      </template>
                    </el-table-column>
                    <el-table-column
                      v-if="canEditFunctions || canDelete"
                      label=""
                      width="196"
                      align="center"
                      fixed="right"
                    >
                      <template #default="{ row: fnRow }">
                        <div class="gkd-fn-actions">
                          <el-button
                            v-if="canEditFunctions"
                            type="primary"
                            size="small"
                            link
                            @click.stop="openFunctionDialog(stage.stageNumber, fnRow)"
                          >
                            Изменить
                          </el-button>
                          <el-button
                            v-if="canDelete"
                            type="danger"
                            size="small"
                            link
                            @click.stop="confirmDeleteFunction(fnRow.id)"
                          >
                            Удалить
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>

                  <div v-if="canEditFunctions" class="stage-actions">
                    <el-button type="primary" plain size="small" @click="openFunctionDialog(stage.stageNumber, null)">
                      + Добавить функцию ТЗ
                    </el-button>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-card>

          <!-- Вложения ТЗ / НМЦК -->
          <el-card shadow="never" class="section-card section-card--attachments">
            <div class="section-header">
              <div class="section-title">Файлы ТЗ и НМЦК</div>
            </div>

            <div v-loading="attachmentsLoading" class="attachments-grid">
              <div class="attachment-col attachment-panel">
                <div class="attachment-type-title">ТЗ</div>

                <input
                  ref="tzFileInputRef"
                  class="visually-hidden"
                  type="file"
                  accept=".doc,.docx,.xls,.xlsx,.pdf"
                  multiple
                  @change="(e) => onFilesSelected(e, 'tz')"
                />

                <div class="upload-row">
                  <el-button v-if="canEditFunctions" type="primary" plain @click="triggerTzFilePick">
                    Прикрепить файлы
                  </el-button>
                  <el-button
                    v-if="canEditFunctions"
                    type="primary"
                    :loading="attachmentsUploading"
                    :disabled="!tzSelectedFiles.length"
                    @click="upload('tz')"
                  >
                    Загрузить выбранные
                  </el-button>
                </div>
                <div v-if="canEditFunctions && tzSelectedFiles.length" class="selected-files-hint">
                  Выбрано файлов: {{ tzSelectedFiles.length }}
                </div>

                <el-empty
                  v-if="!attachments.filter((x) => x.type === 'tz').length"
                  description="Файлов ТЗ пока нет"
                  :image-size="72"
                />

                <div class="attachment-list">
                  <div v-for="a in attachments.filter((x) => x.type === 'tz')" :key="a.id" class="attachment-item">
                    <div class="attachment-name" :title="a.originalFileName">{{ a.originalFileName }}</div>
                    <div class="attachment-row-actions">
                      <el-button size="small" @click="download(a.id)">Скачать</el-button>
                      <el-button
                        v-if="canDelete"
                        size="small"
                        type="danger"
                        plain
                        @click="confirmDeleteAttachment(a.id)"
                      >
                        Удалить
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="attachment-col attachment-panel">
                <div class="attachment-type-title">НМЦК</div>

                <input
                  ref="nmckFileInputRef"
                  class="visually-hidden"
                  type="file"
                  accept=".doc,.docx,.xls,.xlsx,.pdf"
                  multiple
                  @change="(e) => onFilesSelected(e, 'nmck')"
                />

                <div class="upload-row">
                  <el-button v-if="canEditFunctions" type="primary" plain @click="triggerNmckFilePick">
                    Прикрепить файлы
                  </el-button>
                  <el-button
                    v-if="canEditFunctions"
                    type="primary"
                    :loading="attachmentsUploading"
                    :disabled="!nmckSelectedFiles.length"
                    @click="upload('nmck')"
                  >
                    Загрузить выбранные
                  </el-button>
                </div>
                <div v-if="canEditFunctions && nmckSelectedFiles.length" class="selected-files-hint">
                  Выбрано файлов: {{ nmckSelectedFiles.length }}
                </div>

                <el-empty
                  v-if="!attachments.filter((x) => x.type === 'nmck').length"
                  description="Файлов НМЦК пока нет"
                  :image-size="72"
                />

                <div class="attachment-list">
                  <div v-for="a in attachments.filter((x) => x.type === 'nmck')" :key="a.id" class="attachment-item">
                    <div class="attachment-name" :title="a.originalFileName">{{ a.originalFileName }}</div>
                    <div class="attachment-row-actions">
                      <el-button size="small" @click="download(a.id)">Скачать</el-button>
                      <el-button
                        v-if="canDelete"
                        size="small"
                        type="danger"
                        plain
                        @click="confirmDeleteAttachment(a.id)"
                      >
                        Удалить
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-drawer>

      <!-- Модалки -->
      <GKContractDialog
        v-model="contractDialogVisible"
        :mode="contractDialogMode"
        :initial-contract="contractDialogInitial"
        v-model:loading="contractDialogLoading"
        @saved="reloadContracts"
      />

      <GKFunctionDialog
        v-if="canEditFunctions"
        v-model="functionDialogVisible"
        :contract-id="selectedContractId"
        :stage-number="functionDialogStageNumber"
        :initial-function="functionDialogInitialFunction"
        :allow-links="authStore.canAccessExternalLinks"
        v-model:loading="functionDialogLoading"
        @saved="reloadContractDetails"
      />

      <ImportExcelDialog
        v-if="canEditFunctions"
        v-model="importVisible"
        mode="gkFunctions"
        :contractId="selectedContractId || undefined"
        @imported="reloadContractDetails"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { ContractAttachmentItem, ContractItem, GKContractDetails, GKFunction, GKStage } from '@/types'
import { fetchContracts } from '@/api/contracts'
import {
  createGKStage,
  deleteGKAttachment,
  deleteGKContract,
  deleteGKFunction,
  deleteGKStage,
  fetchGKContractDetails,
  fetchGKAttachments,
  downloadGKAttachment,
  uploadGKAttachments,
  updateGKContract,
  updateGKStage,
} from '@/api/gkContracts'
import { downloadGKFunctionsTemplate } from '@/utils/excelTemplates'
import GKContractDialog from '@/components/GKContractDialog.vue'
import GKFunctionDialog from '@/components/GKFunctionDialog.vue'
import ImportExcelDialog from '@/components/ImportExcelDialog.vue'

const router = useRouter()
const authStore = useAuthStore()

const canEditContract = computed(() => authStore.canEditGKContract)
const canEditStages = computed(() => authStore.canEditGKStages)
const canEditFunctions = computed(() => authStore.canEditGKFunctions)
const canDelete = computed(() => authStore.isSuperuser)

const loading = ref(false)
const contracts = ref<ContractItem[]>([])

const detailsVisible = ref(false)
const drawerLoading = ref(false)
const selectedContractId = ref<number | null>(null)
const contractDetails = ref<GKContractDetails | null>(null)

const contractForm = reactive<{
  name: string
  shortName: string
  useShortNameInTaskId: boolean
  description: string
}>({
  name: '',
  shortName: '',
  useShortNameInTaskId: false,
  description: '',
})

const saveLoading = ref(false)

const detailsTitle = computed(() =>
  contractDetails.value?.name ? `ГК — ${contractDetails.value.name}` : 'Детали ГК',
)

const drawerTitle = detailsTitle

const reloadToken = ref(0) // используется для надежного обновления формы при повторном открытии

// Dialogs
const contractDialogVisible = ref(false)
const contractDialogMode = ref<'create' | 'edit'>('create')
const contractDialogLoading = ref(false)
const contractDialogInitial = ref<any>(null)

const importVisible = ref(false)

const functionDialogVisible = ref(false)
const functionDialogStageNumber = ref(1)
const functionDialogInitialFunction = ref<GKFunction | null>(null)
const functionDialogLoading = ref(false)

const attachmentsLoading = ref(false)
const attachmentsUploading = ref(false)
const attachments = ref<ContractAttachmentItem[]>([])

const tzSelectedFiles = ref<File[]>([])
const nmckSelectedFiles = ref<File[]>([])
const tzFileInputRef = ref<HTMLInputElement | null>(null)
const nmckFileInputRef = ref<HTMLInputElement | null>(null)

function formatCreatedAt(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function shortText(value: string, maxLength = 80) {
  const text = (value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function fillContractForm(details: GKContractDetails) {
  contractForm.name = details.name || ''
  contractForm.shortName = details.shortName || ''
  contractForm.useShortNameInTaskId = Boolean(details.useShortNameInTaskId)
  contractForm.description = details.description || ''
}

async function reloadContracts() {
  try {
    loading.value = true
    contracts.value = await fetchContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки справочника ГК')
    contracts.value = []
  } finally {
    loading.value = false
  }
}

async function reloadContractDetails() {
  if (!selectedContractId.value) return
  try {
    drawerLoading.value = true
    contractDetails.value = await fetchGKContractDetails(selectedContractId.value)
    await nextTick()
    if (contractDetails.value) {
      fillContractForm(contractDetails.value)
    }

    await reloadAttachments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки деталей ГК')
  } finally {
    drawerLoading.value = false
  }
}

async function reloadAttachments() {
  if (!selectedContractId.value) return
  try {
    attachmentsLoading.value = true
    attachments.value = await fetchGKAttachments(selectedContractId.value)
  } catch {
    attachments.value = []
  } finally {
    attachmentsLoading.value = false
  }
}

function openContractDetails(id: number) {
  selectedContractId.value = id
  detailsVisible.value = true
  reloadContractDetails()
}

function handleRowClick(row: ContractItem) {
  openContractDetails(row.id)
}

function openCreateContract() {
  contractDialogMode.value = 'create'
  contractDialogInitial.value = null
  contractDialogVisible.value = true
}

async function handleSaveContract() {
  if (!selectedContractId.value) return
  try {
    saveLoading.value = true
    await updateGKContract(selectedContractId.value, {
      name: contractForm.name,
      shortName: contractForm.shortName?.trim() || '',
      useShortNameInTaskId: contractForm.useShortNameInTaskId,
      description: contractForm.description,
    })
    ElMessage.success('ГК сохранён')
    await reloadContractDetails()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения ГК')
  } finally {
    saveLoading.value = false
  }
}

async function handleAddStage() {
  if (!selectedContractId.value) return

  try {
    const { value: numberValue } = await ElMessageBox.prompt('Введите номер этапа (например, 1, 2, 3)', 'Добавить этап', {
      confirmButtonText: 'Добавить',
      cancelButtonText: 'Отмена',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: 'Введите положительное целое число',
    })

    const stageNumber = Number(numberValue)
    let nameValue = ''
    try {
      const res = await ElMessageBox.prompt(
        'Введите наименование этапа (необязательно)',
        `Этап ${stageNumber}`,
        {
          confirmButtonText: 'Сохранить',
          cancelButtonText: 'Пропустить',
          inputValue: '',
        },
      )
      nameValue = (res.value || '').trim()
    } catch {
      nameValue = ''
    }
    const created = await createGKStage(selectedContractId.value, {
      stageNumber,
      stageName: nameValue,
    })
    ElMessage.success(`Этап ${created.stageNumber} готов`)
    await reloadContractDetails()
  } catch {
    // cancel
  }
}

async function handleRenameStage(stage: GKStage) {
  if (!selectedContractId.value) return
  try {
    const { value } = await ElMessageBox.prompt(
      `Укажите наименование для этапа ${stage.stageNumber}`,
      'Переименование этапа',
      {
        confirmButtonText: 'Сохранить',
        cancelButtonText: 'Отмена',
        inputValue: (stage.stageName || '').trim(),
      },
    )
    await updateGKStage(selectedContractId.value, stage.stageNumber, (value || '').trim())
    ElMessage.success('Наименование этапа обновлено')
    await reloadContractDetails()
  } catch {
    // cancel
  }
}

function onFilesSelected(event: Event, type: 'tz' | 'nmck') {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (type === 'tz') tzSelectedFiles.value = files
  else nmckSelectedFiles.value = files
}

async function upload(type: 'tz' | 'nmck') {
  if (!selectedContractId.value) return

  const files = type === 'tz' ? tzSelectedFiles.value : nmckSelectedFiles.value
  if (!files.length) {
    ElMessage.warning('Сначала выберите файлы')
    return
  }

  try {
    attachmentsUploading.value = true
    await uploadGKAttachments(selectedContractId.value, type, files)
    ElMessage.success('Вложения загружены')

    tzSelectedFiles.value = []
    nmckSelectedFiles.value = []
    if (tzFileInputRef.value) tzFileInputRef.value.value = ''
    if (nmckFileInputRef.value) nmckFileInputRef.value.value = ''
    await reloadAttachments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки вложений')
  } finally {
    attachmentsUploading.value = false
  }
}

async function download(attachmentId: number) {
  try {
    const response = await downloadGKAttachment(attachmentId)
    const blob = response.data as Blob
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const item = attachments.value.find((x) => x.id === attachmentId)
    link.download = item?.originalFileName || 'download'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка скачивания')
  }
}

function openFunctionDialog(stageNumber: number, existing: GKFunction | null) {
  functionDialogStageNumber.value = stageNumber
  functionDialogInitialFunction.value = existing
  functionDialogVisible.value = true
}

function jiraHref(link?: string) {
  const u = (link || '').trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}

function stageCollapseTitle(stage: GKStage) {
  const n = stage.stageNumber
  const name = (stage.stageName || '').trim()
  if (name) return `Этап ${n} — ${name}`
  return `Этап ${n}`
}

function triggerTzFilePick() {
  tzFileInputRef.value?.click()
}

function triggerNmckFilePick() {
  nmckFileInputRef.value?.click()
}

async function confirmDeleteContract(row: ContractItem) {
  try {
    await ElMessageBox.confirm(
      `Удалить ГК «${row.name}» и все этапы, функции и файлы? Ссылки в предложениях на функции будут сняты.`,
      'Удаление ГК',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteGKContract(row.id)
    ElMessage.success('ГК удалён')
    if (selectedContractId.value === row.id) {
      detailsVisible.value = false
      selectedContractId.value = null
    }
    await reloadContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления ГК')
  }
}

async function confirmDeleteContractFromDrawer() {
  if (!selectedContractId.value || !contractDetails.value) return
  await confirmDeleteContract({
    id: selectedContractId.value,
    name: contractDetails.value.name,
  } as ContractItem)
}

async function confirmDeleteStage(stageNumber: number) {
  if (!selectedContractId.value) return
  try {
    await ElMessageBox.confirm(
      `Удалить этап ${stageNumber} и все функции ТЗ? Ссылки в предложениях будут сняты.`,
      'Удаление этапа',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteGKStage(selectedContractId.value, stageNumber)
    ElMessage.success('Этап удалён')
    await reloadContractDetails()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления этапа')
  }
}

async function confirmDeleteFunction(functionId: number) {
  if (!selectedContractId.value) return
  try {
    await ElMessageBox.confirm(
      'Удалить функцию ТЗ? Ссылка в карточках предложений будет снята.',
      'Удаление функции',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteGKFunction(selectedContractId.value, functionId)
    ElMessage.success('Функция удалена')
    await reloadContractDetails()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления функции')
  }
}

async function confirmDeleteAttachment(attachmentId: number) {
  try {
    await ElMessageBox.confirm('Удалить файл со всеми данными?', 'Удаление файла', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    })
  } catch {
    return
  }
  try {
    await deleteGKAttachment(attachmentId)
    ElMessage.success('Файл удалён')
    await reloadAttachments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления файла')
  }
}

function downloadGKTemplate() {
  downloadGKFunctionsTemplate()
}

// Initial load
onMounted(async () => {
  await reloadContracts()
})

watch(detailsVisible, (opened) => {
  if (!opened) return
  if (selectedContractId.value) {
    reloadContractDetails()
  }
})

onBeforeUnmount(() => {
  reloadToken.value++
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background: radial-gradient(circle at top left, #f4f8ff 0%, #f7f9fc 35%, #f3f5f8 100%);
  padding: 10px 15px 5px 15px;
  box-sizing: border-box;
}

.page-shell {
  width: 100%;
  display: grid;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
  color: #1f2937;
}

.meta {
  color: #667085;
  font-size: 14px;
  margin-top: 6px;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eaf2ff;
  color: #315ea8;
  font-size: 13px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.gkd-actions-cell {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
  padding: 8px 14px;
  margin: 0 auto;
  max-width: 100%;
  box-sizing: border-box;
}

.gkd-fn-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 14px;
  justify-content: center;
  align-items: center;
  padding: 2px 4px;
  box-sizing: border-box;
  white-space: nowrap;
}

.gkd-contracts-table :deep(.el-table__fixed-right .el-table__cell:last-child .cell),
.gkd-functions-table :deep(.el-table__fixed-right .el-table__cell:last-child .cell) {
  padding-left: 10px;
  padding-right: 10px;
}

.jira-table-link {
  color: #1e4d7b;
  font-size: 13px;
  word-break: break-all;
}

.muted-dash {
  color: #94a3b8;
}

.table-card {
  border-radius: 20px;
}

.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  word-break: break-word;
}

.gkd-drawer :deep(.el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-body {
  display: grid;
  gap: 20px;
  box-sizing: border-box;
}

.gkd-drawer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 0px 28px;
  box-sizing: border-box;
}

.section-card {
  border-radius: 16px;
  border: 1px solid #e7ecf3;
}

.section-card :deep(.el-card__body) {
  padding: 18px 20px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 4px;
}

.section-header--stages {
  align-items: center;
  flex-wrap: wrap;
}

.section-header--stages .section-title {
  flex: 1 1 auto;
  min-width: 120px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.01em;
}

.section-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.section-actions--split {
  flex-wrap: nowrap;
  max-width: min(100%, 520px);
}

.section-actions--split .section-actions-group--danger {
  margin-left: auto;
  padding-left: 14px;
  border-left: 1px solid #e7ecf3;
}

.section-actions--toolbar {
  gap: 8px;
}

.gkd-main-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.gkd-main-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.gkd-stages-collapse {
  border: none;
  margin-top: 8px;
}

.gkd-stages-collapse :deep(.el-collapse-item) {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  margin-bottom: 10px;
  overflow: hidden;
  background: #fff;
}

.gkd-stages-collapse :deep(.el-collapse-item:last-child) {
  margin-bottom: 0;
}

.gkd-stages-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 48px;
  line-height: 1.35;
  padding: 10px 14px 10px 16px;
  font-weight: 600;
  color: #1f2937;
  background: #fafbfd;
}

.gkd-stages-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.gkd-stages-collapse :deep(.el-collapse-item__content) {
  padding: 0 14px 16px 16px;
}

.gkd-stages-collapse :deep(.el-collapse-item__arrow) {
  margin: 0 0 0 10px;
}

.collapse-stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-right: 4px;
  box-sizing: border-box;
}

.collapse-stage-title-text {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 15px;
}

.collapse-stage-delete {
  flex-shrink: 0;
}

.collapse-stage-rename {
  flex-shrink: 0;
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
  font-weight: 700;
}

.readonly-value {
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937;
}

.stage-body {
  display: grid;
  gap: 14px;
}

.stage-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.attachments-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: stretch;
}

.attachment-col {
  display: grid;
  gap: 12px;
  align-content: start;
}

.attachment-panel {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  padding: 14px 16px 16px;
  background: #fafbfd;
  min-height: 200px;
}

.attachment-type-title {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.upload-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: stretch;
}

.upload-row :deep(.el-button) {
  margin: 0;
  width: 100%;
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

.selected-files-hint {
  font-size: 13px;
  color: #667085;
}

.attachment-row-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.attachment-list {
  display: grid;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e7ecf3;
  background: #fff;
}

.attachment-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #344054;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions {
    justify-content: flex-start;
  }

  .attachments-grid {
    grid-template-columns: 1fr;
  }

  .section-actions--split {
    flex-wrap: wrap;
    max-width: 100%;
  }

  .upload-row {
    grid-template-columns: 1fr;
  }
}
</style>

