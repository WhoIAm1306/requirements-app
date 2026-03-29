<template>
  <div class="page">
    <div class="page-shell">
      <!-- Шапка -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title-row">
            <h2 class="page-title">Учет предложений</h2>
            <span class="meta-badge">{{ authStore.organization }}</span>
          </div>
          <div class="meta">{{ authStore.fullName }}</div>
        </div>

        <div class="header-actions">
          <div class="header-before-avatar">
            <el-button v-if="authStore.isSuperuser" @click="router.push('/admin/users')">
              Пользователи
            </el-button>
            <el-button @click="router.push('/gk-directory')">Справочник ГК</el-button>
          </div>
          <el-dropdown trigger="click" placement="bottom-end" @command="handleUserMenuCommand">
            <button type="button" class="user-avatar-btn" :title="authStore.fullName">
              {{ userAvatarLetters }}
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">Профиль</el-dropdown-item>
                <el-dropdown-item divided command="logout">Выйти</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- Дашборд -->
      <div class="summary-grid-all">
        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">Всего записей</div>
          <div class="summary-value">{{ items.length }}</div>
        </el-card>

        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">В обработку</div>
          <div class="summary-value">{{ countByStatus('В обработку') }}</div>
        </el-card>

        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">Новое</div>
          <div class="summary-value">{{ countByStatus('Новое') }}</div>
        </el-card>

        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">Учтено</div>
          <div class="summary-value">{{ countByStatus('Учтено') }}</div>
        </el-card>

        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">Выполнено</div>
          <div class="summary-value">{{ countByStatus('Выполнено') }}</div>
        </el-card>

        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">Другие статусы</div>
          <div class="summary-value">
            {{
              items.filter((item) => !isStandardRequirementStatus((item.statusText || '').trim()))
                .length
            }}
          </div>
        </el-card>

        <el-card
          v-for="queue in queues"
          :key="queue.id"
          class="summary-card queue-summary-card"
          shadow="hover"
        >
          <div class="summary-label">{{ queue.name }}</div>
          <div class="summary-value">{{ countByQueue(queue.name) }}</div>
        </el-card>
      </div>

      <!-- Фильтры -->
      <el-card class="toolbar-card" shadow="never">
        <div class="toolbar-row">
          <div class="toolbar-left">
            <div class="main-filters">
              <el-button
                :type="systemType === '112' ? 'primary' : 'default'"
                @click="setSystem('112')"
              >
                Система 112
              </el-button>

              <el-button
                :type="systemType === '101' ? 'primary' : 'default'"
                @click="setSystem('101')"
              >
                Система 101
              </el-button>

              <el-button
                :type="systemType === '' ? 'primary' : 'default'"
                @click="setSystem('')"
              >
                Все
              </el-button>
            </div>

            <div class="search-row">
              <el-input
                v-model="search"
                placeholder="Поиск по ID, названию, инициатору, ответственному"
                clearable
                class="search-input"
              />

              <el-select
                v-model="status"
                placeholder="Статус"
                clearable
                filterable
                allow-create
                default-first-option
                class="status-select"
              >
                <el-option
                  v-for="s in STANDARD_REQUIREMENT_STATUSES"
                  :key="s"
                  :label="s"
                  :value="s"
                />
              </el-select>

              <el-select
                v-model="implementationQueue"
                placeholder="Очередь"
                clearable
                class="queue-select"
              >
                <el-option
                  v-for="queue in queues"
                  :key="queue.id"
                  :label="queue.name"
                  :value="queue.name"
                />
              </el-select>

              <el-select v-model="archiveFilterMode" placeholder="Записи" class="archive-filter-select">
                <el-option label="Только активные" value="active" />
                <el-option label="Активные и архив" value="all" />
                <el-option label="Только архивные" value="archived_only" />
              </el-select>

              <el-checkbox v-model="filterNoFunction" class="filter-no-fn">
                Функция не указана
              </el-checkbox>

              <el-tooltip content="Сбросить фильтры" placement="top">
                <el-button class="reset-filters-btn" circle size="small" @click="resetFilters">
                  <el-icon><Close /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>

          <div class="toolbar-right">
            <el-button v-if="canEdit" type="primary" @click="createDialogVisible = true">
              Добавить запись
            </el-button>
            <el-dropdown v-if="canEdit" trigger="click" @command="handleImportMenuCommand">
              <el-button>
                Ещё
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="import">Импорт предложений</el-dropdown-item>
                  <el-dropdown-item command="template">Шаблон предложений (Excel)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button @click="handleExport">Экспорт Excel</el-button>
          </div>
        </div>
      </el-card>

      <!-- Таблица -->
      <el-card class="table-card" shadow="never">
        <div
          ref="tableHorizontalWrapRef"
          class="table-horizontal-wrap"
          @scroll="handleTableScroll"
        >
          <div class="table-width-box" :style="{ width: `${tableWidth}px` }">
            <el-table
              class="requirements-table"
              :data="items"
              v-loading="loading"
              @row-click="handleRowClick"
              row-key="id"
              stripe
              border
              empty-text="Нет предложений по выбранным условиям"
              :row-class-name="getRowClassName"
              table-layout="fixed"
              :fit="false"
              :style="{ width: `${tableWidth}px` }"
            >
              <el-table-column prop="taskIdentifier" label="ID" width="150" />

              <el-table-column
                prop="shortName"
                label="Наименование"
                width="300"
                show-overflow-tooltip
              />

              <el-table-column
                prop="initiator"
                label="Инициатор"
                width="180"
                show-overflow-tooltip
              />

              <el-table-column
                prop="responsiblePerson"
                label="Ответственный"
                width="200"
                show-overflow-tooltip
              />

              <el-table-column prop="implementationQueue" label="Очередь" width="120">
                <template #default="{ row }">
                  <QueueTag :queue="row.implementationQueue" />
                </template>
              </el-table-column>

              <el-table-column
                prop="contractName"
                label="ГК"
                width="230"
                show-overflow-tooltip
              />

              <el-table-column label="п.п. ТЗ" width="220" class-name="tz-col">
                <template #default="{ row }">
                  <button
                    type="button"
                    class="tz-cell-link"
                    :disabled="!tzCellLabel(row)"
                    @click.stop="openTzInfo(row)"
                  >
                    {{ tzCellLabel(row) || '—' }}
                  </button>
                </template>
              </el-table-column>

              <el-table-column prop="statusText" label="Статус" width="150">
                <template #default="{ row }">
                  <StatusTag :status="row.statusText" />
                </template>
              </el-table-column>

              <el-table-column prop="systemType" label="Система" width="100" />

              <el-table-column label="Предложение" width="400">
                <template #default="{ row }">
                  <span class="cell-clamp" :title="row.proposalText">
                    {{ shortText(row.proposalText, 90) }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column label="Комментарии и описание проблем" width="350">
                <template #default="{ row }">
                  <span class="cell-clamp" :title="row.problemComment">
                    {{ shortText(row.problemComment, 90) }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column prop="createdAt" label="Создано" width="110">
                <template #default="{ row }">
                  {{ formatDateShort(row.createdAt) }}
                </template>
              </el-table-column>

              <!--
                В read-only режиме оставляем только кнопку открытия карточки.
              -->
              <el-table-column label="" width="200" align="center">
                <template #default="{ row }">
                  <div class="row-actions">
                    <el-tooltip content="Открыть" placement="top">
                      <el-button size="small" circle @click.stop="handleRowClick(row)">
                        <el-icon><View /></el-icon>
                      </el-button>
                    </el-tooltip>

                    <template v-if="canEdit">
                      <el-tooltip content="Удалить запись" placement="top">
                        <el-button size="small" circle type="danger" plain @click.stop="handleDelete(row)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </el-tooltip>

                      <el-tooltip v-if="!row.isArchived" content="В архив" placement="top">
                        <el-button size="small" circle type="warning" @click.stop="handleArchive(row)">
                          <el-icon><FolderDelete /></el-icon>
                        </el-button>
                      </el-tooltip>

                      <el-tooltip v-else content="Восстановить" placement="top">
                        <el-button size="small" circle type="success" @click.stop="handleRestore(row)">
                          <el-icon><RefreshRight /></el-icon>
                        </el-button>
                      </el-tooltip>
                    </template>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-card>

      <!-- Плавающий нижний scrollbar -->
      <div
        v-show="showFloatingScrollbar"
        ref="floatingScrollbarRef"
        class="floating-horizontal-scroll"
        :style="floatingScrollbarStyle"
        @scroll="handleFloatingScrollbarScroll"
      >
        <div
          class="floating-horizontal-scroll__inner"
          :style="{ width: `${tableWidth}px` }"
        ></div>
      </div>

      <!-- Модалки -->
      <RequirementFormDialog
        v-if="canEdit"
        v-model="createDialogVisible"
        v-model:loading="createLoading"
        @saved="loadData"
      />

      <RequirementDetailsDrawer
        v-model="detailsVisible"
        :requirement-id="selectedRequirementId"
        @updated="loadData"
      />

      <ImportExcelDialog
        v-if="canEdit"
        v-model="importRequirementsVisible"
        mode="requirements"
        @imported="loadData"
      />

      <ProfileDrawer v-model="profileDrawerVisible" />

      <RequirementTzInfoDialog
        v-model="tzInfoVisible"
        :requirement-id="tzInfoRequirementId"
        :can-edit="canEdit"
        @updated="loadData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Close, Delete, FolderDelete, RefreshRight, View } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  archiveRequirement,
  deleteRequirement,
  fetchRequirements,
  restoreRequirement,
} from '@/api/requirements'
import { exportRequirementsFile } from '@/api/export'
import { fetchQueues } from '@/api/queues'
import { downloadRequirementsTemplate } from '@/utils/excelTemplates'
import RequirementFormDialog from '@/components/RequirementFormDialog.vue'
import RequirementDetailsDrawer from '@/components/RequirementDetailsDrawer.vue'
import ImportExcelDialog from '@/components/ImportExcelDialog.vue'
import ProfileDrawer from '@/components/ProfileDrawer.vue'
import RequirementTzInfoDialog from '@/components/RequirementTzInfoDialog.vue'
import StatusTag from '@/components/StatusTag.vue'
import QueueTag from '@/components/QueueTag.vue'
import {
  STANDARD_REQUIREMENT_STATUSES,
  isStandardRequirementStatus,
} from '@/constants/requirementStatuses'
import type { QueueItem, Requirement } from '@/types'

/**
 * Router для переходов между страницами.
 */
const router = useRouter()

/**
 * Текущий пользователь из store.
 */
const authStore = useAuthStore()

/**
 * Пользователь может изменять данные только если у него edit или superuser.
 */
const canEdit = computed(() => authStore.isSuperuser || authStore.accessLevel === 'edit')

/**
 * Состояния страницы.
 */
const loading = ref(false)
const createLoading = ref(false)
const createDialogVisible = ref(false)
const detailsVisible = ref(false)
const profileDrawerVisible = ref(false)
const importRequirementsVisible = ref(false)
const selectedRequirementId = ref<number | null>(null)
const tzInfoVisible = ref(false)
const tzInfoRequirementId = ref<number | null>(null)

const archiveFilterMode = ref<'active' | 'all' | 'archived_only'>('active')

/**
 * Основные данные таблицы и справочники.
 */
const items = ref<Requirement[]>([])
const queues = ref<QueueItem[]>([])

/**
 * Фильтры списка.
 */
const search = ref('')
const status = ref('')
const systemType = ref('')
const implementationQueue = ref('')

/**
 * DOM-ссылки для горизонтального скролла.
 */
const tableHorizontalWrapRef = ref<HTMLElement | null>(null)
const floatingScrollbarRef = ref<HTMLElement | null>(null)

/**
 * Ширина таблицы = сумма ширин колонок.
 */
/** Сумма фиксированных ширин колонок (table-layout: fixed). */
const tableWidth = 2710

const filterNoFunction = ref(false)

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

/** Счётчик запросов списка: отбрасываем устаревшие ответы при гонке поиска и фильтров. */
let loadListSeq = 0

function clearSearchDebounce() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

const userAvatarLetters = computed(() => {
  const name = (authStore.fullName || '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

/**
 * Состояние плавающего scrollbar.
 */
const showFloatingScrollbar = ref(false)
const floatingLeft = ref(0)
const floatingWidth = ref(0)

/**
 * Флаг против зацикливания scroll-событий.
 */
let isSyncingScroll = false

/**
 * Укорачиваем длинные тексты для таблицы.
 */
function shortText(value: string, maxLength = 80) {
  const text = (value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Короткий формат даты.
 */
function formatDateShort(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('ru-RU')
}

/**
 * Быстрый фильтр по системе.
 */
function setSystem(value: string) {
  systemType.value = value
}

/**
 * Полный сброс фильтров.
 */
function resetFilters() {
  search.value = ''
  status.value = ''
  systemType.value = ''
  archiveFilterMode.value = 'active'
  implementationQueue.value = ''
  filterNoFunction.value = false
  clearSearchDebounce()
  loadData()
}

/**
 * Подсчёт записей по статусу.
 */
function countByStatus(statusName: string) {
  return items.value.filter((item) => (item.statusText || '').trim() === statusName).length
}

/**
 * Подсчёт записей по очереди.
 */
function countByQueue(queueName: string) {
  return items.value.filter((item) => (item.implementationQueue || '').trim() === queueName).length
}

/**
 * Загрузка очередей.
 */
async function loadQueues() {
  try {
    queues.value = await fetchQueues()
  } catch {
    queues.value = []
  }
}

/**
 * Загрузка таблицы.
 */
function archiveQueryParams() {
  const mode = archiveFilterMode.value
  if (mode === 'archived_only') {
    return { archivedOnly: true as const }
  }
  if (mode === 'all') {
    return { includeArchived: true as const }
  }
  return {}
}

async function loadData() {
  const seq = ++loadListSeq
  try {
    loading.value = true

    const arch = archiveQueryParams()
    const data = await fetchRequirements({
      systemType: systemType.value || undefined,
      status: status.value || undefined,
      search: search.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
      noFunction: filterNoFunction.value || undefined,
      ...arch,
    })
    if (seq !== loadListSeq) return
    items.value = data
  } catch (error: any) {
    if (seq !== loadListSeq) return
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки')
  } finally {
    if (seq === loadListSeq) loading.value = false
  }
}

/**
 * Экспорт Excel.
 */
async function handleExport() {
  try {
    const arch = archiveQueryParams()
    const blob = await exportRequirementsFile({
      systemType: systemType.value || undefined,
      status: status.value || undefined,
      search: search.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
      noFunction: filterNoFunction.value || undefined,
      ...arch,
    })

    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.download = 'requirements_export.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка экспорта')
  }
}

/**
 * Архивирование записи.
 */
async function handleArchive(row: Requirement) {
  try {
    await archiveRequirement(row.id)
    ElMessage.success('Запись отправлена в архив')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка архивирования')
  }
}

/**
 * Восстановление записи.
 */
async function handleRestore(row: Requirement) {
  try {
    await restoreRequirement(row.id)
    ElMessage.success('Запись восстановлена')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка восстановления')
  }
}

/**
 * Выход.
 */
function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function handleUserMenuCommand(cmd: string) {
  if (cmd === 'profile') {
    profileDrawerVisible.value = true
    return
  }
  if (cmd === 'logout') {
    handleLogout()
  }
}

function handleImportMenuCommand(cmd: string) {
  if (cmd === 'import') {
    importRequirementsVisible.value = true
    return
  }
  if (cmd === 'template') {
    downloadRequirementsTemplate()
  }
}

function tzCellLabel(row: Requirement) {
  const t = (row.tzPointText || '').trim()
  if (t) return t
  const n = (row.nmckPointText || '').trim()
  if (n) return `НМЦК: ${n}`
  return ''
}

function openTzInfo(row: Requirement) {
  if (!tzCellLabel(row)) return
  tzInfoRequirementId.value = row.id
  tzInfoVisible.value = true
}

async function handleDelete(row: Requirement) {
  try {
    await ElMessageBox.confirm(
      'Удалить запись? Она исчезнет из списков. Это не архив: архивные записи можно фильтром «Только архивные».',
      'Удаление предложения',
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
    await deleteRequirement(row.id)
    ElMessage.success('Запись удалена')
    if (selectedRequirementId.value === row.id) {
      detailsVisible.value = false
      selectedRequirementId.value = null
    }
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления')
  }
}

/**
 * Открытие карточки записи.
 */
function handleRowClick(row: Requirement) {
  selectedRequirementId.value = row.id
  detailsVisible.value = true
}

/**
 * Приглушаем архивные строки.
 */
function getRowClassName({ row }: { row: Requirement }) {
  return row.isArchived ? 'archived-row' : ''
}

/**
 * Стиль плавающего scrollbar.
 */
const floatingScrollbarStyle = computed(() => ({
  left: `${floatingLeft.value}px`,
  width: `${floatingWidth.value}px`,
}))

/**
 * Пересчитываем плавающий scrollbar.
 */
function updateFloatingScrollbar() {
  const wrap = tableHorizontalWrapRef.value
  if (!wrap) {
    showFloatingScrollbar.value = false
    return
  }

  const rect = wrap.getBoundingClientRect()
  const hasOverflow = tableWidth > wrap.clientWidth + 1
  const isTableVisibleInViewport = rect.bottom > 80 && rect.top < window.innerHeight - 40

  showFloatingScrollbar.value = hasOverflow && isTableVisibleInViewport
  floatingLeft.value = rect.left
  floatingWidth.value = rect.width

  if (floatingScrollbarRef.value) {
    floatingScrollbarRef.value.scrollLeft = wrap.scrollLeft
  }
}

/**
 * Скролл таблицы -> двигаем плавающий scrollbar.
 */
function handleTableScroll() {
  const wrap = tableHorizontalWrapRef.value
  const floating = floatingScrollbarRef.value
  if (!wrap || !floating || isSyncingScroll) return

  isSyncingScroll = true
  floating.scrollLeft = wrap.scrollLeft

  requestAnimationFrame(() => {
    isSyncingScroll = false
  })
}

/**
 * Скролл плавающего scrollbar -> двигаем таблицу.
 */
function handleFloatingScrollbarScroll() {
  const wrap = tableHorizontalWrapRef.value
  const floating = floatingScrollbarRef.value
  if (!wrap || !floating || isSyncingScroll) return

  isSyncingScroll = true
  wrap.scrollLeft = floating.scrollLeft

  requestAnimationFrame(() => {
    isSyncingScroll = false
  })
}

watch(
  [status, implementationQueue, archiveFilterMode, filterNoFunction],
  () => {
    clearSearchDebounce()
    loadData()
  },
)

watch(systemType, () => {
  clearSearchDebounce()
  loadData()
})

watch(search, () => {
  clearSearchDebounce()
  searchDebounceTimer = setTimeout(() => {
    loadData()
  }, 400)
})

/**
 * Инициализация страницы.
 */
onMounted(async () => {
  await loadQueues()
  await loadData()

  await nextTick()
  updateFloatingScrollbar()

  window.addEventListener('resize', updateFloatingScrollbar)
  window.addEventListener('scroll', updateFloatingScrollbar, { passive: true })
})

/**
 * После изменения таблицы пересчитываем scrollbar.
 */
watch(items, async () => {
  await nextTick()
  updateFloatingScrollbar()
})

/**
 * После изменения очередей тоже пересчитываем scrollbar.
 */
watch(queues, async () => {
  await nextTick()
  updateFloatingScrollbar()
})

/**
 * Чистим listeners.
 */
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateFloatingScrollbar)
  window.removeEventListener('scroll', updateFloatingScrollbar)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background: linear-gradient(165deg, #e8eef6 0%, #f2f5f9 40%, #edf1f7 100%);
  padding: 16px;
  box-sizing: border-box;
}

.page-shell {
  width: 100%;
  max-width: none;
  min-width: 0;
  margin: 0;
  display: grid;
  gap: 14px;
  overflow-x: hidden;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.page-header-left {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 700;
  color: #142032;
  letter-spacing: -0.02em;
}

.meta {
  color: #667085;
  font-size: 14px;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e2eaf4;
  color: #1e4d7b;
  font-size: 13px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.header-before-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.toolbar-left {
  flex: 1;
  min-width: 280px;
  display: grid;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.reset-filters-btn {
  flex-shrink: 0;
}

.filter-no-fn {
  margin-right: 4px;
  white-space: nowrap;
}

.user-avatar-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #c5d2e3;
  background: linear-gradient(145deg, #1e4d7b, #2d6a4f);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(30, 77, 123, 0.25);
}

.user-avatar-btn:hover {
  filter: brightness(1.05);
}

.archive-filter-select {
  width: 200px;
  flex: 0 0 200px;
}

.tz-cell-link {
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  color: #1e4d7b;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.4;
}

.tz-cell-link:hover:not(:disabled) {
  color: #163a5e;
}

.tz-cell-link:disabled {
  color: inherit;
  text-decoration: none;
  cursor: default;
}

.summary-grid-all {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  min-width: 0;
}

.summary-card {
  border-radius: 14px;
  border: 1px solid #e7ecf3;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.summary-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.summary-label {
  color: #667085;
  font-size: 12px;
  margin-bottom: 6px;
  line-height: 1.2;
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: #1f2937;
}

.toolbar-card,
.table-card {
  border-radius: 20px;
  border: 1px solid #e7ecf3;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  min-width: 0;
  box-sizing: border-box;
}

.table-card {
  overflow: visible;
}

.top-actions {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.main-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-width: 0;
}

.search-input {
  width: 360px;
  flex: 0 0 360px;
  min-width: 0;
}

.status-select {
  width: 180px;
  flex: 0 0 180px;
  min-width: 0;
}

.queue-select {
  width: 170px;
  flex: 0 0 170px;
  min-width: 0;
}

/*
  Единственный реальный горизонтальный scroll-контейнер.
*/
.table-horizontal-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: visible;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.table-horizontal-wrap::-webkit-scrollbar {
  height: 0;
}

/*
  Внутренний блок с шириной таблицы.
*/
.table-width-box {
  width: 2880px;
}

/*
  Таблица ровно на ширину колонок.
*/
.requirements-table {
  width: 2880px;
}

.requirements-table :deep(td.tz-col) {
  vertical-align: top;
}

.requirements-table :deep(td.tz-col .cell) {
  white-space: normal !important;
  word-break: break-word;
  line-height: 1.4;
}

.requirements-table :deep(th.el-table__cell) {
  padding: 10px 8px;
  font-size: 13px;
}

.requirements-table :deep(td.el-table__cell) {
  padding: 8px 8px;
  font-size: 13px;
  vertical-align: top;
}

/*
  Закрепляем заголовки таблицы.
  Теперь шапка остаётся видимой при вертикальной прокрутке страницы.
*/
.requirements-table :deep(.el-table__header-wrapper) {
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 1px 0 #edf1f7;
}

.requirements-table :deep(.el-table__header-wrapper th.el-table__cell) {
  background: #f8fbff;
}

/*
  Убираем родной нижний горизонтальный scrollbar Element Plus.
*/
.requirements-table :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

.floating-horizontal-scroll {
  position: fixed;
  bottom: 10px;
  z-index: 200;
  height: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dfe7f3;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  scrollbar-width: thin;
}

.floating-horizontal-scroll__inner {
  height: 1px;
}

.floating-horizontal-scroll::-webkit-scrollbar {
  height: 12px;
}

.floating-horizontal-scroll::-webkit-scrollbar-thumb {
  background: rgba(130, 146, 168, 0.55);
  border-radius: 999px;
}

.floating-horizontal-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  word-break: break-word;
}

.row-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0 auto;
  padding: 0 8px;
  box-sizing: border-box;
}

@media (max-width: 1365px) {
  .summary-grid-all {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .search-row {
    flex-wrap: wrap;
  }

  .search-input,
  .status-select,
  .queue-select {
    width: 100%;
    flex: 1 1 100%;
  }
}

@media (max-width: 900px) {
  .page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .summary-grid-all {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .summary-grid-all {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.archived-row td {
  opacity: 0.7;
}
</style>