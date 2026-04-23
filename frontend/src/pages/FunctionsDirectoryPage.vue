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

          <div class="filter-row">
            <el-input v-model="search" clearable placeholder="Поиск по функции, НМЦК, ТЗ" />
            <label class="filter-flag">
              <span>Только с привязками</span>
              <el-switch v-model="withBoundOnly" />
            </label>
            <label class="filter-flag">
              <span>Только с Jira Epic</span>
              <el-switch v-model="withJiraOnly" />
            </label>
          </div>
        </div>
      </el-card>

      <el-card class="board-card" shadow="never">
        <div v-loading="loading" class="board-wrap">
          <div v-if="filteredFunctions.length > 0" class="functions-board">
            <article
              v-for="fn in filteredFunctions"
              :key="fn.id"
              class="function-card"
              role="button"
              tabindex="0"
              @click="openFunctionCard(fn)"
            >
              <div class="function-card__title">{{ fn.functionName || 'Без наименования' }}</div>
              <div class="function-card__meta">НМЦК: {{ fn.nmckFunctionNumber || '—' }}</div>
              <div class="function-card__meta">ТЗ: {{ fn.tzSectionNumber || '—' }}</div>

              <div class="function-card__tags">
                <el-tag size="small" type="info">Привязки: {{ requirementsCountByFunction[fn.id] ?? 0 }}</el-tag>
                <el-tag size="small" type="success">Confluence: {{ fn.confluenceCount }}</el-tag>
                <el-tag size="small" type="warning">Jira Epic: {{ fn.jiraEpicCount }}</el-tag>
              </div>

              <div class="function-card__epics">
                <a
                  v-for="(epic, idx) in functionEpicPreview(fn.id)"
                  :key="`epic-preview-${fn.id}-${idx}`"
                  :href="linkHref(epic.link || '')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="epic-preview"
                  @click.stop
                >
                  <div class="epic-preview__head">
                    <span class="epic-preview__key">{{ epic.epicKey || 'Epic' }}</span>
                    <span class="epic-preview__status">{{ epic.status || (epic.syncStatus === 'error' ? 'Ошибка' : '—') }}</span>
                  </div>
                  <div class="epic-preview__summary">
                    {{ epic.summary || 'Наименование эпика пока не получено' }}
                  </div>
                  <div class="epic-progress epic-progress--lg">
                    <span
                      v-for="n in 4"
                      :key="`epic-preview-progress-${fn.id}-${idx}-${n}`"
                      class="epic-progress__part"
                      :class="epicProgressPartClass(epic, n)"
                    />
                  </div>
                </a>
                <div v-if="functionEpicRest(fn.id) > 0" class="epic-preview__more">Еще {{ functionEpicRest(fn.id) }} epic(ов)</div>
              </div>
            </article>
          </div>
          <el-empty v-else description="Нет функций по выбранным фильтрам" />
        </div>
      </el-card>

      <GKFunctionDialog
        v-if="activeFunction"
        v-model="functionDialogVisible"
        :contract-id="selectedContractId"
        :stage-number="selectedStageNumber || 0"
        :initial-function="activeFunction"
        :readonly="!canEditFunctions"
        :allow-links="authStore.canAccessExternalLinks"
        :show-requirements="true"
        v-model:loading="saveLoading"
        @saved="onFunctionDialogSaved"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import GKFunctionDialog from '@/components/GKFunctionDialog.vue'
import type { ContractItem, GKFunction, GKFunctionCardView, GKStage, JiraEpicStatusItem, Requirement } from '@/types'
import { fetchContracts } from '@/api/contracts'
import {
  bindRequirementsToFunction,
  fetchStageJiraEpicStatuses,
  previewJiraEpicStatuses,
  fetchFunctionRequirements,
  fetchGKFunctionsForStage,
  fetchGKStages,
  normalizeGKFunctionCardsWithStatuses,
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
const functionCards = ref<GKFunctionCardView[]>([])
const requirementsCountByFunction = ref<Record<number, number>>({})
const epicStatusesByFunction = ref<Record<number, JiraEpicStatusItem[]>>({})
const selectedContractId = ref<number | null>(null)
const selectedStageNumber = ref<number | null>(null)
const search = ref('')
const withBoundOnly = ref(false)
const withJiraOnly = ref(false)

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
const epicLinksSaving = ref(false)

const filteredFunctions = computed(() => {
  const q = search.value.trim().toLowerCase()
  return functionCards.value.filter((fn) => {
    if (withJiraOnly.value && fn.jiraEpicCount === 0) return false
    const boundCount = requirementsCountByFunction.value[fn.id] ?? 0
    if (withBoundOnly.value && boundCount === 0) return false
    if (!q) return true
    return (
      fn.functionName.toLowerCase().includes(q) ||
      fn.nmckFunctionNumber.toLowerCase().includes(q) ||
      fn.tzSectionNumber.toLowerCase().includes(q)
    )
  })
})

const activeFunctionEpicStatuses = computed(() => {
  const id = activeFunction.value?.id
  if (!id) return []
  return epicStatusesByFunction.value[id] || []
})

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
    epicStatusesByFunction.value = await fetchStageJiraEpicStatuses(selectedContractId.value, stageNumber)
    functionCards.value = normalizeGKFunctionCardsWithStatuses(functions.value, epicStatusesByFunction.value)
    await loadRequirementCounts()
  } finally {
    loading.value = false
  }
}

async function loadRequirementCounts() {
  if (!selectedContractId.value) return
  const ids = functionCards.value.map((x) => x.id)
  const next: Record<number, number> = {}
  await Promise.all(
    ids.map(async (id) => {
      try {
        const items = await fetchFunctionRequirements(selectedContractId.value!, id)
        next[id] = items.length
      } catch {
        next[id] = 0
      }
    }),
  )
  requirementsCountByFunction.value = next
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

async function openFunctionCard(row: GKFunction | GKFunctionCardView) {
  const fullRow = functions.value.find((x) => x.id === row.id) || (row as GKFunction)
  if (!fullRow?.id) return
  activeFunction.value = fullRow
  functionDialogVisible.value = true
}

async function onFunctionDialogSaved() {
  if (!selectedStageNumber.value) return
  await selectStage(selectedStageNumber.value)
  if (activeFunction.value?.id) {
    const updated = functions.value.find((f) => f.id === activeFunction.value?.id)
    if (updated) activeFunction.value = updated
  }
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
    if (activeFunction.value?.id) {
      void refreshEpicStatusByLink(activeFunction.value.id, next)
    }
  }
  newJiraEpicLink.value = ''
}
function removeJiraEpic(index: number) {
  const prev = [...editForm.jiraEpicLinks]
  editForm.jiraEpicLinks.splice(index, 1)
  void persistActiveFunctionEpicLinks(prev)
}

function removeJiraEpicByLink(link: string) {
  const prev = [...editForm.jiraEpicLinks]
  const normalized = link.trim().toLowerCase()
  editForm.jiraEpicLinks = editForm.jiraEpicLinks.filter((x) => x.trim().toLowerCase() !== normalized)
  if (activeFunction.value?.id) {
    epicStatusesByFunction.value[activeFunction.value.id] = (epicStatusesByFunction.value[activeFunction.value.id] || []).filter(
      (x) => (x.link || '').trim().toLowerCase() !== normalized,
    )
  }
  void persistActiveFunctionEpicLinks(prev)
}

function upsertEpicStatus(functionId: number, item: JiraEpicStatusItem) {
  const list = [...(epicStatusesByFunction.value[functionId] || [])]
  const normalized = (item.link || '').trim().toLowerCase()
  if (!normalized) return
  const idx = list.findIndex((x) => (x.link || '').trim().toLowerCase() === normalized)
  if (idx >= 0) list[idx] = item
  else list.push(item)
  epicStatusesByFunction.value = { ...epicStatusesByFunction.value, [functionId]: list }
}

async function refreshEpicStatusByLink(functionId: number, link: string) {
  try {
    const preview = await previewJiraEpicStatuses([link])
    if (preview.length > 0) upsertEpicStatus(functionId, preview[0])
  } catch {
    // keep placeholder until regular sync
  }
}

async function persistActiveFunctionEpicLinks(previousLinks: string[]) {
  if (!selectedContractId.value || !selectedStageNumber.value || !activeFunction.value || !canEditFunctions.value) return
  try {
    epicLinksSaving.value = true
    await upsertGKFunction(selectedContractId.value, {
      stageNumber: selectedStageNumber.value,
      functionName: editForm.functionName,
      nmckFunctionNumber: editForm.nmckFunctionNumber,
      tzSectionNumber: editForm.tzSectionNumber,
      confluenceLinks: editForm.confluenceLinks.map((x) => x.trim()).filter(Boolean),
      jiraEpicLinks: editForm.jiraEpicLinks.map((x) => x.trim()).filter(Boolean),
    })
    await selectStage(selectedStageNumber.value)
    const updated = functions.value.find((f) => f.id === activeFunction.value?.id)
    if (updated) {
      activeFunction.value = updated
      fillForm(updated)
    }
  } catch (error: any) {
    editForm.jiraEpicLinks = previousLinks
    ElMessage.error(error?.response?.data?.message || 'Не удалось удалить Jira Epic')
  } finally {
    epicLinksSaving.value = false
  }
}

function functionEpicPreview(functionId: number) {
  return (epicStatusesByFunction.value[functionId] || []).slice(0, 2)
}

function functionEpicRest(functionId: number) {
  const total = (epicStatusesByFunction.value[functionId] || []).length
  return total > 2 ? total - 2 : 0
}

function epicStageIndex(item: JiraEpicStatusItem) {
  const status = normalizeEpicStatus(item.status || '')
  if (status.includes('закрыт')) return 4
  if (status.includes('тест') && status.includes('dev')) return 3
  if (status.includes('разработ')) return 2
  if (status.includes('аналит')) return 1
  if (status.includes('открыт')) return 0
  return item.syncStatus === 'error' ? 0 : 1
}

function epicProgressPartClass(item: JiraEpicStatusItem, part: number) {
  const stage = epicStageIndex(item)
  const active = part <= stage
  if (!active) return 'is-idle'
  const status = normalizeEpicStatus(item.status || '')
  if (status.includes('закрыт')) return 'is-closed'
  if (status.includes('тест') && status.includes('dev')) return 'is-devtest'
  if (status.includes('разработ')) return 'is-dev'
  if (status.includes('аналит')) return 'is-analysis'
  return 'is-open'
}

function normalizeEpicStatus(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function toggleBoundSelection(id: number, checked: boolean) {
  const next = new Set(boundSelectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  boundSelectedIds.value = Array.from(next)
}

function toggleSearchSelection(id: number, checked: boolean) {
  const next = new Set(searchSelectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  searchSelectedIds.value = Array.from(next)
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
.toolbar-card,.board-card { border-radius: 16px; }
.filter-row { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; }
.filter-flag { display: inline-flex; align-items: center; gap: 8px; color: #4b5565; font-size: 13px; }
.board-wrap { min-height: 300px; }
.functions-board { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
.function-card {
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  display: grid;
  gap: 8px;
  cursor: pointer;
}
.function-card:hover { border-color: #b7c9e3; box-shadow: 0 4px 12px rgba(23, 57, 102, 0.08); }
.function-card__title { font-weight: 700; color: #1f2937; line-height: 1.35; }
.function-card__meta { color: #4b5565; font-size: 13px; }
.function-card__tags { display: flex; flex-wrap: wrap; gap: 6px; }
.function-card__epics { display: grid; gap: 8px; margin-top: 2px; }
.epic-preview { border: 1px solid #d8e2ef; border-radius: 10px; padding: 8px; display: grid; gap: 6px; text-decoration: none; background: #fff; }
.epic-preview__head { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; align-items: center; }
.epic-preview__key { font-weight: 700; color: #1f2937; }
.epic-preview__status { color: #4b5565; }
.epic-preview__summary { font-size: 12px; color: #4b5565; line-height: 1.35; word-break: break-word; }
.epic-preview__more { font-size: 12px; color: #667085; }
.requirements-title { margin-bottom: 8px; font-size: 16px; font-weight: 700; }
.search-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 8px; }
.section-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
.links-group { width: 100%; display: grid; gap: 8px; }
.dialog-layout { min-height: 72vh; max-height: 72vh; display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; overflow: hidden; }
.dialog-pane { min-height: 0; display: grid; gap: 10px; }
.dialog-pane--right { grid-template-rows: 1fr 1fr; }
.requirements-block { border: 1px solid #e3e9f3; border-radius: 12px; background: #fbfcff; padding: 10px; display: grid; min-height: 0; grid-template-rows: auto auto 1fr auto; }
.requirements-cards { overflow: auto; display: grid; gap: 8px; align-content: start; padding-right: 2px; }
.requirement-card { border: 1px solid #d8e2ef; border-radius: 10px; background: #fff; padding: 8px 10px; display: grid; gap: 4px; grid-template-columns: auto 1fr; column-gap: 8px; align-items: start; }
.requirement-card input { margin-top: 3px; }
.requirement-card__id { grid-column: 2; font-size: 12px; color: #1f2937; font-weight: 700; }
.requirement-card__name { grid-column: 2; font-size: 13px; color: #374151; line-height: 1.3; }
.requirement-card__status { grid-column: 2; font-size: 12px; color: #6b7280; }
.links-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.links-section { border: 1px solid #e3e9f3; border-radius: 12px; padding: 10px; background: #fbfcff; }
.links-section__title { font-weight: 700; font-size: 13px; color: #273247; margin-bottom: 8px; }
.link-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.link-add-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.link-view {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: #1e4d7b;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
  border-radius: 8px;
  background: #f6f9ff;
  padding: 6px 8px;
}

.epic-status-list { display: grid; gap: 8px; margin-top: 4px; }
.epic-status-card {
  border: 1px solid #d8e2ef;
  border-radius: 10px;
  background: #fff;
  padding: 8px 10px;
  display: grid;
  gap: 6px;
  text-decoration: none;
  color: #1f2937;
}
.epic-status-card__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.epic-status-card__key {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
}
.epic-status-card__summary {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.35;
  word-break: break-word;
}
.epic-status-caption { font-size: 14px; color: #1f2937; font-weight: 600; }
.epic-progress { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.epic-progress--lg .epic-progress__part { height: 8px; border-radius: 999px; }
.epic-progress--xl .epic-progress__part { height: 12px; border-radius: 999px; }
.epic-progress__part { background: #e5e7eb; }
.epic-progress__part.is-idle { background: #e5e7eb; }
.epic-progress__part.is-open { background: #9ca3af; }
.epic-progress__part.is-analysis { background: #8fb8ff; }
.epic-progress__part.is-dev { background: #4c86ff; }
.epic-progress__part.is-devtest { background: #1f4fc9; }
.epic-progress__part.is-closed { background: #22c55e; }

@media (max-width: 980px) {
  .dialog-layout { grid-template-columns: 1fr; max-height: none; min-height: 0; }
  .dialog-pane--right { grid-template-rows: auto auto; }
  .links-grid {
    grid-template-columns: 1fr;
  }
}
</style>
