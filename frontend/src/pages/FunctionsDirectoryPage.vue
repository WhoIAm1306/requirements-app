<template>
  <div class="page">
    <div class="page-shell">
      <div class="page-header">
        <div>
          <div class="page-title-row">
            <h2 class="page-title">Справочник функций</h2>
            <span class="meta-badge">{{ authStore.organization }}</span>
          </div>
          <div class="meta">{{ authStore.fullName }}</div>
        </div>
        <div class="header-actions">
          <el-button @click="router.push('/requirements')">Назад</el-button>
        </div>
      </div>

      <el-card class="toolbar-card" shadow="never">
        <div class="selectors">
          <div class="selector-block">
            <div class="selector-title">ГК</div>
            <div class="buttons-wrap">
              <el-button
                v-for="c in contracts"
                :key="c.id"
                :type="selectedContractId === c.id ? 'primary' : 'default'"
                @click="selectContract(c.id)"
              >
                {{ c.name }}
              </el-button>
            </div>
          </div>
          <div class="selector-block" v-if="selectedContractId">
            <div class="selector-title">Этапы</div>
            <div class="buttons-wrap">
              <el-button
                v-for="s in stages"
                :key="s.id"
                :type="selectedStageNumber === s.stageNumber ? 'primary' : 'default'"
                @click="selectStage(s.stageNumber)"
              >
                {{ stageLabel(s) }}
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <el-table
          :data="functions"
          v-loading="loading"
          border
          stripe
          row-key="id"
          empty-text="Выберите ГК и этап"
          @row-click="openFunctionCard"
        >
          <el-table-column prop="functionName" label="Наименование функции" min-width="320" show-overflow-tooltip />
          <el-table-column prop="nmckFunctionNumber" label="п.п. НМЦК" width="160" />
          <el-table-column prop="tzSectionNumber" label="п.п. ТЗ" width="160" />
        </el-table>
      </el-card>

      <el-dialog
        :model-value="functionDialogVisible"
        width="1200px"
        :title="activeFunction ? `Функция: ${activeFunction.functionName}` : 'Карточка функции'"
        @close="functionDialogVisible = false"
      >
        <template v-if="activeFunction">
          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="Наименование функции">
                  <el-input v-model="editForm.functionName" :disabled="!canEditFunctions" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="п.п. НМЦК">
                  <el-input v-model="editForm.nmckFunctionNumber" :disabled="!canEditFunctions" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="п.п. ТЗ">
                  <el-input v-model="editForm.tzSectionNumber" :disabled="!canEditFunctions" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="Ссылки Confluence">
              <div class="links-group">
                <div v-for="(link, idx) in editForm.confluenceLinks" :key="`cf-${idx}`" class="link-row">
                  <a :href="linkHref(link)" class="link-view" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                  <el-button v-if="canEditFunctions" type="danger" plain @click="removeConfluence(idx)">Удалить</el-button>
                </div>
                <div v-if="canEditFunctions" class="link-add-row">
                  <el-input v-model="newConfluenceLink" placeholder="https://confluence..." />
                  <el-button type="primary" plain @click="addConfluence">Добавить</el-button>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="Ссылки Jira Epic">
              <div class="links-group">
                <div v-for="(link, idx) in editForm.jiraEpicLinks" :key="`je-${idx}`" class="link-row">
                  <a :href="linkHref(link)" class="link-view" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                  <el-button v-if="canEditFunctions" type="danger" plain @click="removeJiraEpic(idx)">Удалить</el-button>
                </div>
                <div v-if="canEditFunctions" class="link-add-row">
                  <el-input v-model="newJiraEpicLink" placeholder="https://jira.../browse/KEY-123" />
                  <el-button type="primary" plain @click="addJiraEpic">Добавить</el-button>
                </div>
              </div>
            </el-form-item>
          </el-form>

          <el-divider />
          <div class="requirements-title">Привязанные требования</div>
          <el-table
            :data="boundRequirements"
            border
            stripe
            row-key="id"
            @selection-change="onBoundSelectionChange"
          >
            <el-table-column v-if="canEditFunctions" type="selection" width="48" />
            <el-table-column prop="taskIdentifier" label="ID" width="150" />
            <el-table-column prop="shortName" label="Наименование" min-width="260" show-overflow-tooltip />
            <el-table-column prop="statusText" label="Статус" width="180" />
          </el-table>

          <div v-if="canEditFunctions" class="section-actions">
            <el-button type="danger" plain :disabled="boundSelectedIds.length === 0" @click="unbindSelected">
              Отвязать выбранные
            </el-button>
          </div>

          <el-divider />
          <div class="requirements-title">Привязать требования к функции</div>
          <div class="search-row">
            <el-input v-model="requirementsSearch" placeholder="Поиск требований по ID/наименованию" clearable />
            <el-button @click="searchRequirements">Поиск</el-button>
          </div>
          <el-table
            :data="searchResults"
            border
            stripe
            row-key="id"
            @selection-change="onSearchSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="taskIdentifier" label="ID" width="150" />
            <el-table-column prop="shortName" label="Наименование" min-width="260" show-overflow-tooltip />
            <el-table-column prop="statusText" label="Статус" width="180" />
          </el-table>

          <div class="section-actions">
            <el-button type="primary" :disabled="searchSelectedIds.length === 0" @click="bindSelected">
              Привязать выбранные
            </el-button>
          </div>
        </template>

        <template #footer>
          <el-button @click="functionDialogVisible = false">Закрыть</el-button>
          <el-button v-if="canEditFunctions" type="primary" :loading="saveLoading" @click="saveFunction">
            Сохранить
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { ContractItem, GKFunction, GKStage, Requirement } from '@/types'
import { fetchContracts } from '@/api/contracts'
import {
  bindRequirementsToFunction,
  fetchFunctionRequirements,
  fetchGKFunctionsForStage,
  fetchGKStages,
  unbindRequirementsFromFunction,
  upsertGKFunction,
} from '@/api/gkContracts'
import { fetchRequirements } from '@/api/requirements'

const router = useRouter()
const authStore = useAuthStore()
const canEditFunctions = computed(() => authStore.canEditGKFunctions)

const loading = ref(false)
const saveLoading = ref(false)
const contracts = ref<ContractItem[]>([])
const stages = ref<GKStage[]>([])
const functions = ref<GKFunction[]>([])
const selectedContractId = ref<number | null>(null)
const selectedStageNumber = ref<number | null>(null)

const functionDialogVisible = ref(false)
const activeFunction = ref<GKFunction | null>(null)
const boundRequirements = ref<Requirement[]>([])
const searchResults = ref<Requirement[]>([])
const requirementsSearch = ref('')
const boundSelectedIds = ref<number[]>([])
const searchSelectedIds = ref<number[]>([])

const editForm = reactive({
  functionName: '',
  nmckFunctionNumber: '',
  tzSectionNumber: '',
  confluenceLinks: [] as string[],
  jiraEpicLinks: [] as string[],
})
const newConfluenceLink = ref('')
const newJiraEpicLink = ref('')

function normalizeLink(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

function linkHref(value: string) {
  return normalizeLink(value)
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function stageLabel(stage: GKStage) {
  const name = (stage.stageName || '').trim()
  return name ? `Этап ${stage.stageNumber} — ${name}` : `Этап ${stage.stageNumber}`
}

async function loadContracts() {
  contracts.value = await fetchContracts()
  if (!selectedContractId.value && contracts.value.length > 0) {
    await selectContract(contracts.value[0].id)
  }
}

async function selectContract(contractId: number) {
  selectedContractId.value = contractId
  selectedStageNumber.value = null
  functions.value = []
  stages.value = await fetchGKStages(contractId)
  if (stages.value.length > 0) {
    await selectStage(stages.value[0].stageNumber)
  }
}

async function selectStage(stageNumber: number) {
  if (!selectedContractId.value) return
  selectedStageNumber.value = stageNumber
  loading.value = true
  try {
    functions.value = await fetchGKFunctionsForStage(selectedContractId.value, stageNumber)
  } finally {
    loading.value = false
  }
}

function fillForm(fn: GKFunction) {
  editForm.functionName = fn.functionName || ''
  editForm.nmckFunctionNumber = fn.nmckFunctionNumber || ''
  editForm.tzSectionNumber = fn.tzSectionNumber || ''
  editForm.confluenceLinks = Array.isArray(fn.confluenceLinks) ? [...fn.confluenceLinks] : []
  const epicLinks = Array.isArray(fn.jiraEpicLinks) ? [...fn.jiraEpicLinks] : []
  const legacyJiraLink = (fn.jiraLink || '').trim()
  if (legacyJiraLink && !epicLinks.some((x) => x.trim().toLowerCase() === legacyJiraLink.toLowerCase())) {
    epicLinks.unshift(legacyJiraLink)
  }
  editForm.jiraEpicLinks = epicLinks
  newConfluenceLink.value = ''
  newJiraEpicLink.value = ''
}

async function openFunctionCard(row: GKFunction) {
  activeFunction.value = row
  fillForm(row)
  functionDialogVisible.value = true
  boundSelectedIds.value = []
  searchSelectedIds.value = []
  requirementsSearch.value = ''
  searchResults.value = []
  await reloadBoundRequirements()
}

async function reloadBoundRequirements() {
  if (!selectedContractId.value || !activeFunction.value) return
  boundRequirements.value = await fetchFunctionRequirements(selectedContractId.value, activeFunction.value.id)
}

async function saveFunction() {
  if (!selectedContractId.value || !selectedStageNumber.value || !activeFunction.value) return
  try {
    saveLoading.value = true
    await upsertGKFunction(selectedContractId.value, {
      stageNumber: selectedStageNumber.value,
      functionName: editForm.functionName,
      nmckFunctionNumber: editForm.nmckFunctionNumber,
      tzSectionNumber: editForm.tzSectionNumber,
      confluenceLinks: editForm.confluenceLinks.map((x) => x.trim()).filter(Boolean),
      jiraEpicLinks: editForm.jiraEpicLinks.map((x) => x.trim()).filter(Boolean),
    })
    ElMessage.success('Функция сохранена')
    await selectStage(selectedStageNumber.value)
    const updated = functions.value.find((f) => f.id === activeFunction.value?.id)
    if (updated) {
      activeFunction.value = updated
      fillForm(updated)
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения функции')
  } finally {
    saveLoading.value = false
  }
}

function onBoundSelectionChange(rows: Requirement[]) {
  boundSelectedIds.value = rows.map((x) => x.id)
}

function onSearchSelectionChange(rows: Requirement[]) {
  searchSelectedIds.value = rows.map((x) => x.id)
}

async function searchRequirements() {
  const list = await fetchRequirements({
    search: requirementsSearch.value.trim() || undefined,
    includeArchived: true,
    sortOrder: 'desc',
  })
  const boundSet = new Set(boundRequirements.value.map((x) => x.id))
  searchResults.value = list.filter((x) => !boundSet.has(x.id))
}

async function bindSelected() {
  if (!selectedContractId.value || !activeFunction.value || searchSelectedIds.value.length === 0) return
  try {
    await bindRequirementsToFunction(selectedContractId.value, activeFunction.value.id, searchSelectedIds.value)
    ElMessage.success('Требования привязаны')
    searchSelectedIds.value = []
    await Promise.all([reloadBoundRequirements(), searchRequirements(), selectStage(selectedStageNumber.value!)])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка привязки требований')
  }
}

async function unbindSelected() {
  if (!selectedContractId.value || !activeFunction.value || boundSelectedIds.value.length === 0) return
  try {
    await unbindRequirementsFromFunction(selectedContractId.value, activeFunction.value.id, boundSelectedIds.value)
    ElMessage.success('Требования отвязаны')
    boundSelectedIds.value = []
    await Promise.all([reloadBoundRequirements(), searchRequirements(), selectStage(selectedStageNumber.value!)])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка отвязки требований')
  }
}

function addConfluence() {
  const next = normalizeLink(newConfluenceLink.value)
  if (!next) return
  if (!isValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Confluence')
    return
  }
  if (!editForm.confluenceLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    editForm.confluenceLinks.push(next)
  }
  newConfluenceLink.value = ''
}
function removeConfluence(index: number) {
  editForm.confluenceLinks.splice(index, 1)
}
function addJiraEpic() {
  const next = normalizeLink(newJiraEpicLink.value)
  if (!next) return
  if (!isValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Jira Epic')
    return
  }
  if (!editForm.jiraEpicLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    editForm.jiraEpicLinks.push(next)
  }
  newJiraEpicLink.value = ''
}
function removeJiraEpic(index: number) {
  editForm.jiraEpicLinks.splice(index, 1)
}

onMounted(async () => {
  try {
    loading.value = true
    await loadContracts()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 10px 15px 5px; background: #f3f5f8; box-sizing: border-box; }
.page-shell { display: grid; gap: 14px; }
.page-header { display: flex; justify-content: space-between; gap: 12px; }
.page-title-row { display: flex; align-items: center; gap: 10px; }
.page-title { margin: 0; font-size: 28px; }
.meta { color: #667085; }
.meta-badge { padding: 4px 10px; border-radius: 14px; background: #eaf2ff; color: #315ea8; font-size: 13px; }
.header-actions { display: flex; gap: 8px; }
.selectors { display: grid; gap: 12px; }
.selector-block { display: grid; gap: 8px; }
.selector-title { font-weight: 700; color: #1f2937; }
.buttons-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
.toolbar-card,.table-card { border-radius: 16px; }
.requirements-title { margin-bottom: 8px; font-size: 16px; font-weight: 700; }
.search-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 8px; }
.section-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
.links-group { width: 100%; display: grid; gap: 8px; }
.link-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.link-add-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.link-view {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: #1e4d7b;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}
</style>
