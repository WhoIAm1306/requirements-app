<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    class="gk-function-dialog proposal-modal-theme"
    width="min(1360px, 97vw)"
    top="4vh"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-tabs v-model="activeTab" class="dialog-tabs">
      <el-tab-pane label="Функция и ссылки" name="function">
        <div class="function-tab-layout">
          <section class="pane">
            <h4 class="pane-title">Параметры функции</h4>
            <el-form label-position="top" class="form-grid form-grid--inline">
              <el-form-item label="Наименование функции">
                <el-input v-model="form.functionName" :disabled="!canEditCoreFields" />
              </el-form-item>
              <el-form-item label="Номер функции по НМЦК">
                <el-input v-model="form.nmckFunctionNumber" placeholder="Например, 1.1.2" :disabled="!canEditCoreFields" />
              </el-form-item>
              <el-form-item label="Номер раздела по ТЗ">
                <el-input v-model="form.tzSectionNumber" :disabled="!canEditCoreFields" />
              </el-form-item>
            </el-form>
          </section>

          <section v-if="canSeeLinks" class="pane">
            <h4 class="pane-title">Ссылки</h4>
            <div class="links-grid">
              <article class="links-card links-card--confluence">
                <div class="links-card__title">Confluence</div>
                <div class="link-add-row">
                  <el-input v-model="newConfluenceLink" placeholder="https://confluence..." :disabled="!canEdit" />
                  <el-button type="primary" plain :disabled="!canEdit" @click="addConfluenceLink">Добавить</el-button>
                </div>
                <div v-if="form.confluenceLinks.length" ref="confluenceListRef" class="links-list">
                  <div v-for="(link, idx) in form.confluenceLinks" :key="`cf-${idx}`" class="link-row">
                    <a :href="linkHref(link)" class="link-view" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                    <el-button type="danger" plain :disabled="!canEdit" @click="removeConfluenceLink(idx)">Удалить</el-button>
                  </div>
                </div>
                <div v-else class="links-empty">Ссылки не добавлены</div>
              </article>

              <article class="links-card links-card--jira">
                <div class="links-card__title">Jira Epic</div>
                <div class="link-add-row">
                  <el-input v-model="newJiraEpicLink" placeholder="https://jira.../browse/KEY-123" :disabled="!canEdit" />
                  <el-button type="primary" plain :disabled="!canEdit || epicLinksSaving" @click="addJiraEpicLink">Добавить</el-button>
                </div>

                <div v-if="form.jiraEpicLinks.length" class="epic-list-wrap">
                  <div ref="epicListRef" class="epic-list">
                    <div
                      v-for="(link, idx) in form.jiraEpicLinks"
                      :key="`je-${idx}`"
                      class="epic-card"
                      role="link"
                      tabindex="0"
                      @click="openEpic(link)"
                      @keydown.enter.prevent="openEpic(link)"
                    >
                      <div class="epic-card__head">
                        <span class="epic-card__key">{{ statusForLink(link)?.epicKey || extractEpicKey(link) || link }}</span>
                        <el-button
                          type="danger"
                          plain
                          size="small"
                          :disabled="!canEdit || epicLinksSaving"
                          @click.stop="removeJiraEpicLink(idx)"
                        >
                          Удалить
                        </el-button>
                      </div>
                      <div class="epic-card__summary">
                        {{ statusForLink(link)?.summary || 'Наименование эпика пока не получено' }}
                      </div>
                      <div class="epic-card__status">
                        {{ statusForLink(link)?.status || epicStatusPlaceholder(link) }}
                      </div>
                      <div class="epic-progress">
                        <span
                          v-for="part in 4"
                          :key="`progress-${idx}-${part}`"
                          class="epic-progress__part"
                          :class="epicProgressPartClass(statusForLink(link), part)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="links-empty">Ссылки не добавлены</div>
              </article>
            </div>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="showRequirements" label="Предложения" name="requirements">
        <section class="pane pane--requirements-tab">
          <div class="requirements-block requirements-block--bound">
            <div class="requirements-title">Привязанные требования</div>
            <div ref="boundCardsRef" class="requirements-cards">
              <label v-for="item in boundRequirements" :key="`bound-${item.id}`" class="requirement-card">
                <input
                  v-if="canEdit"
                  type="checkbox"
                  :checked="boundSelectedIds.includes(item.id)"
                  @change="toggleBoundSelection(item.id, ($event.target as HTMLInputElement).checked)"
                />
                <div class="requirement-card__id">{{ item.taskIdentifier }}</div>
                <div class="requirement-card__name">{{ item.shortName }}</div>
                <div class="requirement-card__status">{{ item.statusText }}</div>
              </label>
              <el-empty v-if="boundRequirements.length === 0" :image-size="40" description="Нет привязанных требований" />
            </div>
            <div v-if="canEdit" class="section-actions">
              <el-button type="danger" plain :disabled="boundSelectedIds.length === 0" @click="unbindSelected">
                Отвязать выбранные
              </el-button>
            </div>
          </div>

          <div class="requirements-block requirements-block--search">
            <div class="requirements-title">Привязать требования</div>
            <div class="search-row">
              <el-input v-model="requirementsSearch" placeholder="Поиск требований по ID/наименованию" clearable />
              <el-button @click="searchRequirements">Поиск</el-button>
            </div>
            <div ref="searchCardsRef" class="requirements-cards">
              <label v-for="item in searchResults" :key="`search-${item.id}`" class="requirement-card">
                <input
                  v-if="canEdit"
                  type="checkbox"
                  :checked="searchSelectedIds.includes(item.id)"
                  @change="toggleSearchSelection(item.id, ($event.target as HTMLInputElement).checked)"
                />
                <div class="requirement-card__id">{{ item.taskIdentifier }}</div>
                <div class="requirement-card__name">{{ item.shortName }}</div>
                <div class="requirement-card__status">{{ item.statusText }}</div>
              </label>
              <el-empty v-if="searchResults.length === 0" :image-size="40" description="Нет результатов поиска" />
            </div>
            <div v-if="canEdit" class="section-actions">
              <el-button type="primary" :disabled="searchSelectedIds.length === 0" @click="bindSelected">
                Привязать выбранные
              </el-button>
            </div>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ canEdit ? 'Отмена' : 'Закрыть' }}
      </el-button>
      <el-button v-if="canEdit" type="primary" :loading="loading" @click="submit">Сохранить</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  bindRequirementsToFunction,
  fetchFunctionRequirements,
  fetchStageJiraEpicStatuses,
  previewJiraEpicStatuses,
  unbindRequirementsFromFunction,
  upsertGKFunction,
} from '@/api/gkContracts'
import { fetchRequirements } from '@/api/requirements'
import type { GKFunction, JiraEpicStatusItem, Requirement, UpsertGKFunctionPayload } from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    contractId: number | null
    stageNumber: number
    initialFunction?: GKFunction | null
    readonly?: boolean
    lockCoreFields?: boolean
    showRequirements?: boolean
    allowLinks?: boolean
  }>(),
  { initialFunction: null, readonly: false, lockCoreFields: false, showRequirements: false, allowLinks: true },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const loading = defineModel<boolean>('loading', { default: false })
const canEdit = computed(() => !props.readonly)
const canEditCoreFields = computed(() => canEdit.value && !props.lockCoreFields)
const canSeeLinks = computed(() => !!props.allowLinks)
const showRequirements = computed(() => !!props.showRequirements && !!props.contractId && !!props.initialFunction?.id)
const activeTab = ref<'function' | 'requirements'>('function')

type FunctionDialogForm = Omit<UpsertGKFunctionPayload, 'stageNumber'> & {
  confluenceLinks: string[]
  jiraEpicLinks: string[]
}

const emptyForm = (): FunctionDialogForm => ({
  functionName: '',
  nmckFunctionNumber: '',
  tzSectionNumber: '',
  jiraLink: '',
  confluenceLinks: [],
  jiraEpicLinks: [],
})

const form = reactive<FunctionDialogForm>(emptyForm())
const newConfluenceLink = ref('')
const newJiraEpicLink = ref('')
const epicStatuses = ref<JiraEpicStatusItem[]>([])
const epicLinksSaving = ref(false)
const boundRequirements = ref<Requirement[]>([])
const searchResults = ref<Requirement[]>([])
const requirementsSearch = ref('')
const boundSelectedIds = ref<number[]>([])
const searchSelectedIds = ref<number[]>([])
const confluenceListRef = ref<HTMLElement | null>(null)
const epicListRef = ref<HTMLElement | null>(null)
const boundCardsRef = ref<HTMLElement | null>(null)
const searchCardsRef = ref<HTMLElement | null>(null)

const dialogTitle = computed(() => {
  const name = (form.functionName || '').trim() || (props.initialFunction?.functionName || '').trim()
  return name ? `Функция: ${name}` : 'Функция'
})

watch(
  () => [props.modelValue, props.stageNumber, props.initialFunction?.id] as const,
  async () => {
    if (!props.modelValue) return
    activeTab.value = 'function'
    const fn = props.initialFunction
    if (fn && fn.id) {
      form.functionName = fn.functionName || ''
      form.nmckFunctionNumber = fn.nmckFunctionNumber || ''
      form.tzSectionNumber = fn.tzSectionNumber || ''
      form.confluenceLinks = Array.isArray(fn.confluenceLinks) ? [...fn.confluenceLinks] : []
      const epicLinks = Array.isArray(fn.jiraEpicLinks) ? [...fn.jiraEpicLinks] : []
      const legacyJiraLink = (fn.jiraLink || '').trim()
      if (legacyJiraLink && !epicLinks.some((x) => x.trim().toLowerCase() === legacyJiraLink.toLowerCase())) {
        epicLinks.unshift(legacyJiraLink)
      }
      form.jiraEpicLinks = epicLinks
      if (props.contractId) {
        try {
          const byFunction = await fetchStageJiraEpicStatuses(props.contractId, props.stageNumber)
          epicStatuses.value = byFunction[fn.id] || []
        } catch {
          epicStatuses.value = []
        }
      } else {
        epicStatuses.value = []
      }
    } else {
      Object.assign(form, emptyForm())
      epicStatuses.value = []
    }
    newConfluenceLink.value = ''
    newJiraEpicLink.value = ''
    boundRequirements.value = []
    searchResults.value = []
    requirementsSearch.value = ''
    boundSelectedIds.value = []
    searchSelectedIds.value = []
    if (showRequirements.value) {
      await reloadBoundRequirements()
    }
    await nextTick()
    resetInnerScrolls()
  },
  { immediate: true },
)

watch(showRequirements, (enabled) => {
  if (!enabled && activeTab.value === 'requirements') {
    activeTab.value = 'function'
  }
})

function resetInnerScrolls() {
  if (confluenceListRef.value) confluenceListRef.value.scrollTop = 0
  if (epicListRef.value) epicListRef.value.scrollTop = 0
  if (boundCardsRef.value) boundCardsRef.value.scrollTop = 0
  if (searchCardsRef.value) searchCardsRef.value.scrollTop = 0
}

function normalizeLink(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

function linkHref(value: string) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const key = extractEpicKey(trimmed)
  if (key) return `https://jira.avilex.ru/browse/${key}`
  return normalizeLink(trimmed)
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeStatusName(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function epicStageIndex(status?: string) {
  const v = normalizeStatusName(status || '')
  if (v.includes('закрыт')) return 4
  if (v.includes('тест') && v.includes('dev')) return 3
  if (v.includes('разработ')) return 2
  if (v.includes('аналит')) return 1
  if (v.includes('открыт')) return 0
  return 1
}

function epicProgressPartClass(item: JiraEpicStatusItem | undefined, part: number) {
  const status = item?.status || ''
  const stage = epicStageIndex(status)
  if (part > stage) return 'is-idle'
  const v = normalizeStatusName(status)
  if (v.includes('закрыт')) return 'is-closed'
  if (v.includes('тест') && v.includes('dev')) return 'is-devtest'
  if (v.includes('разработ')) return 'is-dev'
  if (v.includes('аналит')) return 'is-analysis'
  return 'is-open'
}

function extractEpicKey(link: string) {
  const match = (link || '').match(/([A-Z][A-Z0-9]+-\d+)/i)
  return match ? match[1].toUpperCase() : ''
}

function openEpic(link: string) {
  const href = linkHref(link)
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}

function statusForLink(link: string) {
  const normalized = link.trim().toLowerCase()
  return epicStatuses.value.find((x) => (x.link || '').trim().toLowerCase() === normalized)
}

function epicStatusPlaceholder(_link: string) {
  return 'Статус будет получен из Jira'
}

function upsertEpicStatus(item: JiraEpicStatusItem) {
  const normalized = (item.link || '').trim().toLowerCase()
  if (!normalized) return
  const idx = epicStatuses.value.findIndex((x) => (x.link || '').trim().toLowerCase() === normalized)
  if (idx >= 0) {
    epicStatuses.value[idx] = item
    return
  }
  epicStatuses.value = [...epicStatuses.value, item]
}

async function refreshEpicStatusByLink(link: string) {
  try {
    const preview = await previewJiraEpicStatuses([link])
    if (preview.length > 0) upsertEpicStatus(preview[0])
  } catch {
    // ignore preview errors; keep placeholder until next sync
  }
}

function addConfluenceLink() {
  const next = normalizeLink(newConfluenceLink.value)
  if (!next) return
  if (!isValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Confluence')
    return
  }
  if (!form.confluenceLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    form.confluenceLinks = [...form.confluenceLinks, next]
  }
  newConfluenceLink.value = ''
}

function removeConfluenceLink(index: number) {
  form.confluenceLinks = form.confluenceLinks.filter((_, i) => i !== index)
}

function addJiraEpicLink() {
  const next = normalizeLink(newJiraEpicLink.value)
  if (!next) return
  if (!isValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Jira Epic')
    return
  }
  if (!form.jiraEpicLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    form.jiraEpicLinks = [...form.jiraEpicLinks, next]
    void refreshEpicStatusByLink(next)
  }
  newJiraEpicLink.value = ''
}

function removeJiraEpicLink(index: number) {
  const prev = [...form.jiraEpicLinks]
  const next = form.jiraEpicLinks.filter((_, i) => i !== index)
  form.jiraEpicLinks = next
  epicStatuses.value = epicStatuses.value.filter((x) =>
    next.some((link) => link.trim().toLowerCase() === (x.link || '').trim().toLowerCase()),
  )
  void persistJiraEpicLinks(prev)
}

async function persistJiraEpicLinks(previousLinks: string[]) {
  if (!canEdit.value || !props.contractId) return
  try {
    epicLinksSaving.value = true
    await upsertGKFunction(props.contractId, {
      stageNumber: props.stageNumber,
      functionName: form.functionName,
      nmckFunctionNumber: form.nmckFunctionNumber,
      tzSectionNumber: form.tzSectionNumber,
      jiraLink: '',
      confluenceLinks: form.confluenceLinks.map((x) => x.trim()).filter(Boolean),
      jiraEpicLinks: form.jiraEpicLinks.map((x) => x.trim()).filter(Boolean),
    })
  } catch (error: any) {
    form.jiraEpicLinks = previousLinks
    ElMessage.error(error?.response?.data?.message || 'Не удалось удалить Jira Epic')
  } finally {
    epicLinksSaving.value = false
  }
}

async function submit() {
  if (!canEdit.value) return
  if (!props.contractId) return
  try {
    loading.value = true
    const payload: UpsertGKFunctionPayload = {
      stageNumber: props.stageNumber,
      functionName: form.functionName,
      nmckFunctionNumber: form.nmckFunctionNumber,
      tzSectionNumber: form.tzSectionNumber,
      jiraLink: '',
      confluenceLinks: form.confluenceLinks.map((x) => x.trim()).filter(Boolean),
      jiraEpicLinks: form.jiraEpicLinks.map((x) => x.trim()).filter(Boolean),
    }
    if (!payload.functionName.trim()) {
      ElMessage.warning('Введите наименование функции')
      return
    }
    if (!payload.nmckFunctionNumber.trim()) {
      ElMessage.warning('Введите номер функции по НМЦК')
      return
    }
    if (!payload.tzSectionNumber.trim()) {
      ElMessage.warning('Введите номер раздела по ТЗ')
      return
    }
    await upsertGKFunction(props.contractId, payload)
    ElMessage.success('Функция ТЗ сохранена')
    emit('saved')
    emit('update:modelValue', false)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения функции')
  } finally {
    loading.value = false
  }
}

async function reloadBoundRequirements() {
  if (!props.contractId || !props.initialFunction?.id) return
  boundRequirements.value = await fetchFunctionRequirements(props.contractId, props.initialFunction.id)
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
  if (!props.contractId || !props.initialFunction?.id || searchSelectedIds.value.length === 0) return
  try {
    await bindRequirementsToFunction(props.contractId, props.initialFunction.id, searchSelectedIds.value)
    ElMessage.success('Требования привязаны')
    searchSelectedIds.value = []
    await Promise.all([reloadBoundRequirements(), searchRequirements()])
    emit('saved')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка привязки требований')
  }
}

async function unbindSelected() {
  if (!props.contractId || !props.initialFunction?.id || boundSelectedIds.value.length === 0) return
  try {
    await unbindRequirementsFromFunction(props.contractId, props.initialFunction.id, boundSelectedIds.value)
    ElMessage.success('Требования отвязаны')
    boundSelectedIds.value = []
    await Promise.all([reloadBoundRequirements(), searchRequirements()])
    emit('saved')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка отвязки требований')
  }
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
</script>

<style scoped>
.dialog-tabs {
  min-height: 0;
}

.function-tab-layout {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}

.pane {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  background: #fff;
  padding: 14px;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.pane--requirements-tab {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  height: min(64vh, 640px);
  overflow: hidden;
}

.pane-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.form-grid :deep(.el-form-item) {
  margin-bottom: 12px;
}

.form-grid--inline {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.form-grid--inline :deep(.el-form-item) {
  margin-bottom: 0;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
  min-height: 0;
  height: auto;
}

.links-card {
  border: 1px solid #edf1f6;
  border-radius: 12px;
  padding: 10px;
  background: #fbfdff;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  height: min(42vh, 420px);
  box-sizing: border-box;
  overflow: hidden;
}

.links-card--confluence {
  min-height: 0;
}

.links-card--jira {
  min-height: 0;
}

.links-card__title {
  font-size: 12px;
  font-weight: 700;
  color: #5c6b7f;
}

.link-add-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
}

.link-add-row :deep(.el-input) {
  align-self: start;
}

.link-add-row :deep(.el-input__wrapper) {
  min-height: 32px;
}

.links-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
  height: 100%;
  max-height: 100%;
  padding-right: 6px;
  scrollbar-gutter: stable;
}

.link-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.link-view {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--el-color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

.links-empty {
  color: #6b7280;
  font-size: 13px;
}

.epic-list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  height: 100%;
  padding-bottom: 0;
}

.epic-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 6px 10px 0;
  box-sizing: border-box;
  align-content: start;
  scrollbar-gutter: stable;
}

.epic-card {
  border: 1px solid #d9e2ef;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.epic-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.epic-card__key {
  color: #1f2937;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
  word-break: break-all;
}

.epic-card__summary {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.4;
  word-break: break-word;
}

.epic-card__status {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

.epic-progress {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.epic-progress__part {
  height: 12px;
  border-radius: 999px;
  background: #e6ecf5;
}

.epic-progress__part.is-open {
  background: #b8c1cf;
}

.epic-progress__part.is-analysis {
  background: #c9ddff;
}

.epic-progress__part.is-dev {
  background: #7daeff;
}

.epic-progress__part.is-devtest {
  background: #245cc4;
}

.epic-progress__part.is-closed {
  background: #2fa36b;
}

.epic-progress__part.is-idle {
  background: #e6ecf5;
}

.requirements-block {
  border: 1px solid #e3e9f3;
  border-radius: 12px;
  background: #fbfcff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: auto;
  overflow: hidden;
}

.requirements-block--bound {
  min-height: 0;
}

.requirements-block--search {
  min-height: 0;
}

.requirements-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}

.requirements-cards {
  display: grid;
  gap: 8px;
  align-content: start;
  overflow: auto;
  min-height: 0;
  flex: 1 1 auto;
  max-height: 100%;
  padding-right: 2px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 138, 165, 0.6) transparent;
}

.requirements-cards::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.requirements-cards::-webkit-scrollbar-track {
  background: transparent;
}

.requirements-cards::-webkit-scrollbar-thumb {
  background: rgba(120, 138, 165, 0.6);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.requirements-cards::-webkit-scrollbar-thumb:hover {
  background: rgba(94, 116, 148, 0.78);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.requirement-card {
  border: 1px solid #d8e2ef;
  border-radius: 10px;
  background: #fff;
  padding: 8px 10px;
  display: grid;
  gap: 4px;
  grid-template-columns: auto 1fr;
  column-gap: 8px;
  align-items: start;
}

.requirement-card input { margin-top: 3px; }
.requirement-card__id { grid-column: 2; font-size: 12px; color: #1f2937; font-weight: 700; }
.requirement-card__name { grid-column: 2; font-size: 13px; color: #374151; line-height: 1.3; }
.requirement-card__status { grid-column: 2; font-size: 12px; color: #6b7280; }

.section-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
}

@media (max-width: 960px) {
  .form-grid--inline {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .pane--requirements-tab {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }
  .requirements-block {
    height: auto;
    overflow: visible;
  }
  .links-card--confluence,
  .links-card--jira {
    height: auto;
    overflow: visible;
  }
  .links-grid {
    height: auto;
    align-items: start;
  }
  .epic-list-wrap {
    height: auto;
    padding-bottom: 0;
    overflow: visible;
  }
  .epic-list,
  .links-list {
    overflow: visible;
    height: auto;
    padding-right: 0;
  }
  .links-grid {
    grid-template-columns: 1fr;
  }
}

</style>

<style>
.gk-function-dialog.el-dialog {
  max-height: 92vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.gk-function-dialog .el-dialog__body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: calc(92vh - 132px) !important;
  max-height: calc(92vh - 132px) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  scrollbar-gutter: stable !important;
}

.gk-function-dialog .el-dialog__body::-webkit-scrollbar {
  width: 10px;
}

.gk-function-dialog .el-dialog__body::-webkit-scrollbar-track {
  background: transparent;
}

.gk-function-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background: rgba(120, 138, 165, 0.75);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.gk-function-dialog .el-dialog__body::-webkit-scrollbar-thumb:hover {
  background: rgba(94, 116, 148, 0.9);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.el-overlay-dialog:has(.gk-function-dialog) {
  overflow: hidden !important;
}
</style>
