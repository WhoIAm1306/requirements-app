<template>
  <div class="page">
    <div class="page-shell">
      <!-- Шапка -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title-row">
            <div class="page-title-block">
              <h2 class="page-title">Учет предложений</h2>
              <div class="meta">{{ authStore.fullName }}</div>
            </div>
            <el-popover
              trigger="hover"
              placement="bottom-start"
              popper-class="summary-popover-popper"
              :popper-style="{
                width: 'fit-content',
                maxWidth: 'calc(100vw - 24px)',
              }"
            >
              <template #reference>
                <el-card class="summary-card summary-card--main" shadow="hover">
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">Всего записей</span>
                    <span class="summary-value summary-value--inline">{{ items.length }}</span>
                  </div>
                </el-card>
              </template>
              <div class="summary-popover-grid">
                <div class="summary-popover-row summary-popover-row--statuses">
                  <el-card class="summary-card summary-card--mini status-card--processing" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">В обработку</span>
                      <span class="summary-value summary-value--inline">{{ countByStatus('В обработку') }}</span>
                    </div>
                  </el-card>
                  <el-card class="summary-card summary-card--mini status-card--new" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">Новое</span>
                      <span class="summary-value summary-value--inline">{{ countByStatus('Новое') }}</span>
                    </div>
                  </el-card>
                  <el-card class="summary-card summary-card--mini status-card--discussion" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">Требуется обсуждение</span>
                      <span class="summary-value summary-value--inline">
                        {{ countByStatus('Требуется обсуждение') }}
                      </span>
                    </div>
                  </el-card>
                  <el-card class="summary-card summary-card--mini status-card--accounted" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">Учтено</span>
                      <span class="summary-value summary-value--inline">{{ countByStatus('Учтено') }}</span>
                    </div>
                  </el-card>
                  <el-card class="summary-card summary-card--mini status-card--done" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">Выполнено</span>
                      <span class="summary-value summary-value--inline">{{ countByStatus('Выполнено') }}</span>
                    </div>
                  </el-card>
                  <el-card class="summary-card summary-card--mini status-card--other" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">Другие</span>
                      <span class="summary-value summary-value--inline">
                        {{
                          items.filter((item) => !isStandardRequirementStatus((item.statusText || '').trim()))
                            .length
                        }}
                      </span>
                    </div>
                  </el-card>
                </div>

                <div class="summary-popover-row summary-popover-row--queues">
                  <el-card
                    v-for="queue in queues"
                    :key="queue.id"
                    class="summary-card summary-card--mini"
                    :class="queueSummaryCardClass(queue.name)"
                    shadow="hover"
                  >
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">{{ queue.name }}</span>
                      <span class="summary-value summary-value--inline">{{ countByQueue(queue.name) }}</span>
                    </div>
                  </el-card>
                  <el-card class="summary-card summary-card--mini queue-card--default" shadow="hover">
                    <div class="summary-main-inline">
                      <span class="summary-label summary-label--inline">Другие очереди</span>
                      <span class="summary-value summary-value--inline">{{ countOtherQueues() }}</span>
                    </div>
                  </el-card>
                </div>
              </div>
            </el-popover>
            <span class="meta-badge">{{ authStore.organization }}</span>
          </div>
        </div>

        <div class="header-actions">
          <div class="header-before-avatar">
            <el-button
              v-if="authStore.isSuperuser"
              text
              class="header-btn-delete-all"
              :loading="deleteAllLoading"
              @click="handleDeleteAllRequirements"
            >
              Удалить все предложения
            </el-button>
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

      <!-- Фильтры -->
      <el-card class="toolbar-card" shadow="never">
        <div class="toolbar-row">
          <div class="toolbar-left">
            <div class="main-filters">
              <el-button
                :type="listFilterPreset === 'all' ? 'primary' : 'default'"
                @click="setListFilterPreset('all')"
              >
                Все
              </el-button>
              <el-button
                :type="listFilterPreset === 'sys112' ? 'primary' : 'default'"
                @click="setListFilterPreset('sys112')"
              >
                Система 112
              </el-button>
              <el-button
                :type="listFilterPreset === 'sys101' ? 'primary' : 'default'"
                @click="setListFilterPreset('sys101')"
              >
                Система 101
              </el-button>
              <el-button
                :type="listFilterPreset === 'tel112' ? 'primary' : 'default'"
                @click="setListFilterPreset('tel112')"
              >
                Телефония 112
              </el-button>
              <el-button
                :type="listFilterPreset === 'tel101' ? 'primary' : 'default'"
                @click="setListFilterPreset('tel101')"
              >
                Телефония 101
              </el-button>

              <el-tooltip content="Порядок списка по дате добавления записи (id)" placement="bottom">
                <label class="list-sort-toggle">
                  <span class="list-sort-toggle__label">Сначала новые</span>
                  <el-switch v-model="listSortNewestFirst" class="list-sort-switch" />
                </label>
              </el-tooltip>
            </div>

            <div class="search-row">
              <el-input
                v-model="search"
                placeholder="Поиск по всем полям карточки, включая ГК и примечание"
                clearable
                class="search-input"
                title="Поиск по подстроке: ГК, раздел, комментарии, обсуждение, примечание, п.п. ТЗ/НМЦК, статус, система, приоритет, автор и редактор"
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
                placeholder="Приоритет"
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

              <label class="filter-no-fn-toggle">
                <span class="filter-no-fn-toggle__label">Функция не указана</span>
                <el-switch v-model="filterNoFunction" class="filter-no-fn-switch" />
              </label>

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

      <!-- Таблица: пагинация на клиенте — в DOM только текущая страница (быстрее, чем сотни строк) -->
      <el-card class="table-card" shadow="never">
        <div class="table-stack">
          <div
            v-loading="loading"
            class="table-horizontal-wrap"
            element-loading-background="rgba(255, 255, 255, 0.72)"
          >
            <div class="table-width-box" :style="{ width: `${tableWidth}px` }">
              <div class="requirements-header-sticky">
                <table class="requirements-header-table" aria-hidden="true">
                  <colgroup>
                    <col style="width: 150px" />
                    <col style="width: 330px" />
                    <col style="width: 180px" />
                    <col style="width: 200px" />
                    <col style="width: 130px" />
                    <col style="width: 120px" />
                    <col style="width: 190px" />
                    <col style="width: 280px" />
                    <col style="width: 150px" />
                    <col style="width: 130px" />
                    <col style="width: 200px" />
                    <col style="width: 520px" />
                    <col style="width: 400px" />
                    <col style="width: 128px" />
                    <col style="width: 128px" />
                    <col style="width: 64px" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Наименование</th>
                      <th>Инициатор</th>
                      <th>Ответственный</th>
                      <th>Раздел</th>
                      <th>Приоритет</th>
                      <th>ГК</th>
                      <th>Функция НМЦК, ТЗ</th>
                      <th>Статус</th>
                      <th>Система</th>
                      <th>Письмо в ДИТ</th>
                      <th>Предложение</th>
                      <th>Комментарии и описание проблем</th>
                      <th>Дата создания</th>
                      <th>Дата выполнения</th>
                      <th></th>
                    </tr>
                  </thead>
                </table>
              </div>

              <el-table
                class="requirements-table"
                :data="pagedItems"
                @row-click="handleRowClick"
                row-key="id"
                stripe
                border
                empty-text="Нет предложений по выбранным условиям"
                :row-class-name="getRowClassName"
                table-layout="fixed"
                :fit="false"
                :show-header="false"
                :style="{ width: `${tableWidth}px` }"
              >
                <el-table-column prop="taskIdentifier" label="ID" width="150" />

                <el-table-column
                  prop="shortName"
                  label="Наименование"
                  width="330"
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

                <el-table-column
                  prop="sectionName"
                  label="Раздел"
                  width="130"
                  show-overflow-tooltip
                />

                <el-table-column prop="implementationQueue" label="Приоритет" width="120">
                  <template #default="{ row }">
                    <QueueTag :queue="row.implementationQueue" />
                  </template>
                </el-table-column>

                <el-table-column label="ГК" width="190" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span class="gk-cell">
                      {{ row.contractName || '—' }}
                      <span
                        v-if="row.contractUseShortNameInTaskId && (row.contractShortName || '').trim()"
                        class="gk-short-hint"
                      >
                        ({{ row.contractShortName }})
                      </span>
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="Функция НМЦК, ТЗ" width="280" class-name="tz-col">
                  <template #default="{ row }">
                    <button
                      type="button"
                      class="tz-cell-link"
                      :disabled="!tzCellLabel(row)"
                      :title="tzCellLabel(row) || undefined"
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

                <el-table-column label="Система" width="130">
                  <template #default="{ row }">
                    {{ systemTypeLabel(row.systemType) }}
                  </template>
                </el-table-column>

                <el-table-column label="Письмо в ДИТ" width="200" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ ditLetterCell(row) }}
                  </template>
                </el-table-column>

                <el-table-column label="Предложение" width="520">
                  <template #default="{ row }">
                    <span class="cell-clamp" :title="row.proposalText">
                      {{ shortText(row.proposalText, 90) }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="Комментарии и описание проблем" width="400">
                  <template #default="{ row }">
                    <span class="cell-clamp" :title="row.problemComment">
                      {{ shortText(row.problemComment, 90) }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="Дата создания" width="128">
                  <template #default="{ row }">
                    {{ formatTableDate(row.createdAt) }}
                  </template>
                </el-table-column>

                <el-table-column label="Дата выполнения" width="128">
                  <template #default="{ row }">
                    {{ formatTableDate(row.completedAt) }}
                  </template>
                </el-table-column>

                <el-table-column label="" width="64" align="center" class-name="row-menu-col">
                  <template #default="{ row }">
                    <el-dropdown trigger="click" @command="(cmd: string) => handleRowMenuCommand(cmd, row)">
                      <el-button size="small" circle class="row-menu-trigger" @click.stop>
                        <el-icon class="row-menu-ellipsis"><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="open">Просмотр</el-dropdown-item>
                          <template v-if="canEdit">
                            <el-dropdown-item command="delete" divided>Удалить</el-dropdown-item>
                            <el-dropdown-item v-if="!row.isArchived" command="archive">
                              В архив
                            </el-dropdown-item>
                            <el-dropdown-item v-else command="restore">Восстановить</el-dropdown-item>
                          </template>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          <div v-if="items.length > 0" class="table-pagination">
            <el-pagination
              v-model:current-page="tablePage"
              v-model:page-size="tablePageSize"
              :page-sizes="[25, 50, 100, 200]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="items.length"
              background
            />
          </div>
        </div>
      </el-card>

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
        @deleted="onRequirementDeletedFromDrawer"
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
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Close, MoreFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  archiveRequirement,
  deleteAllRequirements,
  deleteRequirement,
  exportRequirementsFile,
  fetchRequirements,
  restoreRequirement,
} from '@/api/requirements'
import { fetchQueues } from '@/api/queues'
import { debounce } from '@/utils/debounce'
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
import { systemTypeLabel } from '@/constants/systemTypes'
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
const deleteAllLoading = ref(false)
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
const items = shallowRef<Requirement[]>([])
const queues = ref<QueueItem[]>([])

/** Сумма ширин колонок (table-layout: fixed). */
const tableWidth = 3300

/** Клиентская пагинация: меньше узлов в DOM → отзывчивее интерфейс. */
const tablePage = ref(1)
const tablePageSize = ref(50)

const pagedItems = computed(() => {
  const list = items.value
  const start = (tablePage.value - 1) * tablePageSize.value
  return list.slice(start, start + tablePageSize.value)
})

/**
 * Фильтры списка.
 */
type ListFilterPreset = 'all' | 'sys112' | 'sys101' | 'tel112' | 'tel101'

const search = ref('')
const status = ref('')
const listFilterPreset = ref<ListFilterPreset>('all')
const implementationQueue = ref('')

const filterNoFunction = ref(false)

/** true — сначала новые (id desc), false — сначала старые (id asc). */
const listSortNewestFirst = ref(true)

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

/** Счётчик запросов списка: отбрасываем устаревшие ответы при гонке поиска и фильтров. */
let loadListSeq = 0

/** Перезагрузка списка после смены фильтров без лишних запросов подряд */
const debouncedReloadList = debounce(() => {
  void loadData()
}, 120)

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
 * Укорачиваем длинные тексты для таблицы.
 */
function shortText(value: string, maxLength = 80) {
  const text = (value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function listFilterQuery(): { systemType?: string; telephonySection?: 'true' | 'false' } {
  switch (listFilterPreset.value) {
    case 'all':
      return {}
    case 'sys112':
      return { systemType: '112', telephonySection: 'false' }
    case 'sys101':
      return { systemType: '101', telephonySection: 'false' }
    case 'tel112':
      return { systemType: '112', telephonySection: 'true' }
    case 'tel101':
      return { systemType: '101', telephonySection: 'true' }
  }
}

function setListFilterPreset(p: ListFilterPreset) {
  listFilterPreset.value = p
  clearSearchDebounce()
  debouncedReloadList()
}

function formatTableDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function ditLetterCell(row: Requirement) {
  const num = (row.ditOutgoingNumber || '').trim()
  const d = row.ditOutgoingDate
  if (!num && !d) return '—'
  const dateStr = d ? new Date(d).toLocaleDateString('ru-RU') : ''
  return [num && `№ ${num}`, dateStr].filter(Boolean).join(', ')
}

function exportFileBaseName() {
  switch (listFilterPreset.value) {
    case 'all':
      return 'Все требования'
    case 'sys112':
      return 'Требования 112'
    case 'sys101':
      return 'Требования 101'
    case 'tel112':
      return 'Требования Телефония 112'
    case 'tel101':
      return 'Требования Телефония 101'
  }
}

function buildExportFileName() {
  const now = new Date()
  const d = now.toLocaleDateString('ru-RU').replace(/\./g, '-')
  const t = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-')
  const raw = `${exportFileBaseName()} - ${d} - ${t}.xlsx`
  return raw.replace(/[/\\?%*:|"<>]/g, '-')
}

/**
 * Полный сброс фильтров.
 */
function resetFilters() {
  search.value = ''
  status.value = ''
  listFilterPreset.value = 'all'
  archiveFilterMode.value = 'active'
  implementationQueue.value = ''
  filterNoFunction.value = false
  listSortNewestFirst.value = true
  tablePage.value = 1
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

function countOtherQueues() {
  const knownQueues = new Set(queues.value.map((queue) => (queue.name || '').trim()).filter(Boolean))
  return items.value.filter((item) => {
    const queueName = (item.implementationQueue || '').trim()
    if (!queueName) return false
    return !knownQueues.has(queueName)
  }).length
}

function queueSummaryCardClass(queueName: string) {
  const value = (queueName || '').trim().toLowerCase()
  if (value.includes('1')) return 'queue-card--1'
  if (value.includes('2')) return 'queue-card--2'
  if (value.includes('3')) return 'queue-card--3'
  return 'queue-card--default'
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
  loading.value = true
  try {
    const arch = archiveQueryParams()
    const lf = listFilterQuery()
    const data = await fetchRequirements({
      ...lf,
      status: status.value || undefined,
      search: search.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
      noFunction: filterNoFunction.value || undefined,
      sortOrder: listSortNewestFirst.value ? 'desc' : 'asc',
      ...arch,
    })
    if (seq !== loadListSeq) return
    items.value = data
    tablePage.value = 1
    await nextTick()
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
    const lf = listFilterQuery()
    const blob = await exportRequirementsFile({
      ...lf,
      status: status.value || undefined,
      search: search.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
      noFunction: filterNoFunction.value || undefined,
      sortOrder: listSortNewestFirst.value ? 'desc' : 'asc',
      ...arch,
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildExportFileName()
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
  const n = (row.nmckPointText || '').trim()
  const t = (row.tzPointText || '').trim()
  if (n && t) return `${n} · ${t}`
  return n || t || ''
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

async function handleDeleteAllRequirements() {
  try {
    await ElMessageBox.confirm(
      'Будут удалены все предложения в базе (системы 112 и 101, в том числе из архива). Комментарии в карточках удаляются безвозвратно. Отменить операцию будет нельзя.',
      'Удалить все предложения',
      {
        type: 'error',
        confirmButtonText: 'Удалить все',
        cancelButtonText: 'Отмена',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  try {
    deleteAllLoading.value = true
    const res = await deleteAllRequirements()
    ElMessage.success(res.message || `Удалено записей: ${res.deleted}`)
    detailsVisible.value = false
    selectedRequirementId.value = null
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка массового удаления')
  } finally {
    deleteAllLoading.value = false
  }
}

/**
 * Открытие карточки записи.
 */
function handleRowClick(row: Requirement) {
  selectedRequirementId.value = row.id
  detailsVisible.value = true
}

function handleRowMenuCommand(cmd: string, row: Requirement) {
  if (cmd === 'open') {
    handleRowClick(row)
    return
  }
  if (cmd === 'delete') {
    void handleDelete(row)
    return
  }
  if (cmd === 'archive') {
    void handleArchive(row)
    return
  }
  if (cmd === 'restore') {
    void handleRestore(row)
  }
}

function getRowClassName({ row }: { row: Requirement }) {
  return row.isArchived ? 'archived-row' : ''
}

watch(
  () => [items.value.length, tablePageSize.value] as const,
  () => {
    const n = items.value.length
    const maxPage = Math.max(1, Math.ceil(n / tablePageSize.value) || 1)
    if (tablePage.value > maxPage) tablePage.value = maxPage
  },
)

watch(
  [status, implementationQueue, archiveFilterMode, filterNoFunction],
  () => {
    clearSearchDebounce()
    debouncedReloadList()
  },
)

watch(listSortNewestFirst, () => {
  clearSearchDebounce()
  debouncedReloadList()
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
function onRequirementDeletedFromDrawer() {
  selectedRequirementId.value = null
  void loadData()
}

onMounted(async () => {
  await Promise.all([loadQueues(), loadData()])
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
  display: flex;
  flex-direction: column;
}

.page-shell {
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 0;
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 56px;
  justify-content: center;
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
  margin-top: 0;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  background: #e2eaf4;
  color: #1e4d7b;
  font-size: 13px;
  font-weight: 600;
  align-self: center;
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

.header-btn-delete-all {
  color: rgb(236, 100, 82);
  font-weight: 500;
}

.header-btn-delete-all:hover {
  color: white;
  background-color: rgba(231, 101, 84, 0.56) !important;
}

/* После клика остаётся :focus — не показываем его как «наведение» */
.header-btn-delete-all:focus {
  outline: none;
  color: rgb(236, 100, 82) !important;
  background-color: transparent !important;
}

.header-btn-delete-all:focus:hover {
  color: white !important;
  background-color: rgba(231, 101, 84, 0.56) !important;
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

.filter-no-fn-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.filter-no-fn-toggle__label {
  font-size: 13px;
  color: #4b5565;
}

.filter-no-fn-switch :deep(.el-switch__core) {
  height: 18px;
}

.filter-no-fn-switch :deep(.el-switch__core::after) {
  width: 12px;
  height: 12px;
}

.list-sort-switch :deep(.el-switch__core) {
  height: 18px;
}

.list-sort-switch :deep(.el-switch__core::after) {
  width: 12px;
  height: 12px;
}

.list-sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4b5565;
  font-size: 13px;
  white-space: nowrap;
}

.list-sort-toggle__label {
  line-height: 1;
}

.list-sort-checkbox {
  display: inline-flex;
  align-items: center;
}

.list-sort-checkbox :deep(.el-checkbox__label) {
  display: none;
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

.summary-main-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.summary-label {
  color: #667085;
  font-size: 12px;
  margin-bottom: 6px;
  line-height: 1.2;
}

.summary-label--inline {
  margin-bottom: 0;
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: #1f2937;
}

.summary-value--inline {
  font-size: 20px;
}

.summary-card--main {
  width: 168px;
  height: 56px;
  cursor: default;
  margin-top: 0;
}

.summary-card--main :deep(.el-card__body) {
  height: 100%;
  padding: 8px 12px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.summary-popover-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  width: max-content;
}

.summary-popover-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 168px;
  gap: 12px;
  width: max-content;
}

.summary-popover-row--statuses,
.summary-popover-row--queues {
  align-items: center;
}

.summary-card--mini {
  width: 168px;
}

.summary-card--mini :deep(.el-card__body) {
  padding: 10px 12px;
}

.status-card--processing {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-7);
}

.status-card--new {
  background: var(--el-fill-color-lighter);
  border-color: var(--el-border-color);
}

.status-card--discussion {
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-7);
}

.status-card--accounted {
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-7);
}

.status-card--done {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.status-card--other {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.queue-card--1 {
  background: #f9dfe8;
  border-color: #f2c6d4;
}

.queue-card--2 {
  background: #fff4cc;
  border-color: #f3e3a2;
}

.queue-card--3 {
  background: #dff5df;
  border-color: #c5e7c7;
}

.queue-card--default {
  background: #eef2f7;
  border-color: #dde3eb;
}

/* Полу-прозрачный контейнер поповера. */
:deep(.summary-popover-popper) {
  background: rgba(255, 255, 255, 0.78) !important;
  backdrop-filter: blur(10px);
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  width: fit-content !important;
  max-width: calc(100vw - 24px) !important;
  overflow: hidden;
}

.toolbar-card,
.table-card {
  border-radius: 20px;
  border: 1px solid #e7ecf3;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  box-sizing: border-box;
}

.toolbar-card {
  min-width: 0;
}

.table-card {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  box-sizing: border-box;
}

.table-stack {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  gap: 0;
}

.table-horizontal-wrap {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 280px;
  overflow-x: auto;
  overflow-y: auto;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.table-horizontal-wrap::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.table-horizontal-wrap::-webkit-scrollbar-thumb {
  background: rgba(130, 146, 168, 0.45);
  border-radius: 6px;
}

.table-horizontal-wrap::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.55);
}

.table-pagination {
  flex-shrink: 0;
  padding-top: 12px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.requirements-table {
  width: 3300px;
}

.requirements-header-sticky {
  position: sticky;
  top: 0;
  z-index: 12;
}

.requirements-header-table {
  width: 3300px;
  border-collapse: collapse;
  table-layout: fixed;
  background: #f8fbff;
}

.requirements-header-table th {
  position: relative;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  color: #1f2937;
  background: #f8fbff;
  border: 1px solid var(--el-table-border-color);
}

.requirements-header-table th:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: #d8dee8;
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
  background: #f8fbff;
}

.requirements-table :deep(td.el-table__cell) {
  padding: 8px 8px;
  font-size: 13px;
  vertical-align: top;
}

.requirements-table :deep(.el-table__inner-wrapper) {
  overflow-x: hidden !important;
}

.requirements-table :deep(.el-table__body-wrapper) {
  overflow-x: hidden !important;
}

.requirements-table :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}

.requirements-table :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

.requirements-table :deep(.el-scrollbar__bar.is-vertical) {
  opacity: 1 !important;
  width: 8px;
}

.requirements-table :deep(.row-menu-col .cell) {
  padding: 8px 4px;
  overflow: visible;
}

.top-actions {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.main-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.list-sort-switch--toolbar {
  flex-shrink: 0;
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
  flex: 1 1 280px;
  min-width: 0;
  max-width: 480px;
}

.list-sort-switch {
  flex-shrink: 0;
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

.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  word-break: break-word;
}

.row-menu-trigger {
  padding: 6px;
}

.row-menu-ellipsis {
  transform: rotate(90deg);
}

.gk-cell {
  display: inline;
}

.gk-short-hint {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
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