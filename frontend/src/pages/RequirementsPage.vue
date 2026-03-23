<template>
  <div class="page">
    <div class="page-shell">
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-title-row">
            <h2 class="page-title">Учет предложений</h2>
            <span class="meta-badge">{{ authStore.organization }}</span>
          </div>
          <div class="meta">{{ authStore.fullName }}</div>
        </div>

        <div class="header-actions">
          <el-button type="primary" @click="createDialogVisible = true">Добавить запись</el-button>
          <el-button @click="importRequirementsVisible = true">Импорт предложений</el-button>
          <el-button @click="importTZVisible = true">Импорт ТЗ</el-button>
          <el-button @click="downloadRequirementsTemplate()">Шаблон предложений</el-button>
          <el-button @click="downloadTZTemplate()">Шаблон ТЗ</el-button>
          <el-button @click="handleExport">Экспорт Excel</el-button>
          <el-button @click="handleLogout">Выйти</el-button>
        </div>
      </div>

      <div class="summary-grid summary-grid-all">
        <el-card class="summary-card" shadow="hover">
          <div class="summary-label">Всего записей</div>
          <div class="summary-value">{{ items.length }}</div>
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
            {{ items.filter(item => !['Новое', 'Учтено', 'Выполнено'].includes((item.statusText || '').trim())).length }}
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

      <el-card class="toolbar-card" shadow="never">
        <div class="top-actions">
          <div class="main-filters">
            <el-button :type="systemType === '112' ? 'primary' : 'default'" @click="setSystem('112')">
              Система 112
            </el-button>
            <el-button :type="systemType === '101' ? 'primary' : 'default'" @click="setSystem('101')">
              Система 101
            </el-button>
            <el-button :type="systemType === '' ? 'primary' : 'default'" @click="setSystem('')">
              Все
            </el-button>
          </div>

          <div class="search-row">
            <el-input
              v-model="search"
              placeholder="Поиск по ID, названию, инициатору, ответственному"
              clearable
              class="search-input"
              @keyup.enter="loadData"
            />

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

            <el-select
              v-model="status"
              placeholder="Статус"
              clearable
              filterable
              allow-create
              default-first-option
              class="status-select"
            >
              <el-option label="Новое" value="Новое" />
              <el-option label="Учтено" value="Учтено" />
              <el-option label="Выполнено" value="Выполнено" />
            </el-select>

            <el-checkbox v-model="includeArchived" @change="loadData">Показывать архив</el-checkbox>

            <el-button type="primary" @click="loadData">Найти</el-button>
            <el-button @click="resetFilters">Сбросить</el-button>
            <el-button @click="loadData">Обновить</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <div class="table-scroll">
          <el-table
            class="requirements-table"
            :data="items"
            v-loading="loading"
            @row-click="handleRowClick"
            row-key="id"
            stripe
            border
            empty-text="Нет данных"
            :row-class-name="getRowClassName"
          >
            <el-table-column prop="taskIdentifier" label="Идентификатор" width="150" fixed="left" />
            <el-table-column
              prop="shortName"
              label="Краткое наименование предложения"
              min-width="300"
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
              width="210"
              show-overflow-tooltip
            />
            <el-table-column
              prop="sectionName"
              label="Раздел"
              width="180"
              show-overflow-tooltip
            />
            <el-table-column prop="implementationQueue" label="Очередь" width="130">
              <template #default="{ row }">
                <QueueTag :queue="row.implementationQueue" />
              </template>
            </el-table-column>
            <el-table-column prop="statusText" label="Статус" width="150">
              <template #default="{ row }">
                <StatusTag :status="row.statusText" />
              </template>
            </el-table-column>

            <el-table-column prop="systemType" label="Система" width="100" />

            <el-table-column
              prop="contractName"
              label="ГК"
              width="180"
              show-overflow-tooltip
            />

            <el-table-column
              prop="tzPointText"
              label="Пункт ТЗ"
              min-width="220"
              show-overflow-tooltip
            />

            <el-table-column label="Предложение" min-width="260">
              <template #default="{ row }">
                <el-tooltip
                  v-if="row.proposalText"
                  :content="row.proposalText"
                  placement="top"
                  effect="dark"
                >
                  <span>{{ shortText(row.proposalText, 90) }}</span>
                </el-tooltip>
                <span v-else></span>
              </template>
            </el-table-column>

            <el-table-column label="Комментарии и описание проблем" min-width="260">
              <template #default="{ row }">
                <el-tooltip
                  v-if="row.problemComment"
                  :content="row.problemComment"
                  placement="top"
                  effect="dark"
                >
                  <span>{{ shortText(row.problemComment, 90) }}</span>
                </el-tooltip>
                <span v-else></span>
              </template>
            </el-table-column>

            <el-table-column prop="createdAt" label="Создано" width="170">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column label="Действия" width="110" fixed="right" align="center">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-tooltip content="Открыть" placement="top">
                    <el-button size="small" circle @click.stop="handleRowClick(row)">
                      <el-icon><View /></el-icon>
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
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <RequirementFormDialog
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
        v-model="importRequirementsVisible"
        mode="requirements"
        @imported="loadData"
      />

      <ImportExcelDialog
        v-model="importTZVisible"
        mode="tz"
        @imported="loadData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { FolderDelete, RefreshRight, View } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { archiveRequirement, fetchRequirements, restoreRequirement } from '@/api/requirements'
import { exportRequirementsFile } from '@/api/export'
import { downloadRequirementsTemplate, downloadTZTemplate } from '@/utils/excelTemplates'
import RequirementFormDialog from '@/components/RequirementFormDialog.vue'
import RequirementDetailsDrawer from '@/components/RequirementDetailsDrawer.vue'
import ImportExcelDialog from '@/components/ImportExcelDialog.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { QueueItem, Requirement } from '@/types'
import { fetchQueues } from '@/api/queues'
import QueueTag from '@/components/QueueTag.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const createLoading = ref(false)
const createDialogVisible = ref(false)
const detailsVisible = ref(false)
const importRequirementsVisible = ref(false)
const importTZVisible = ref(false)
const selectedRequirementId = ref<number | null>(null)

const items = ref<Requirement[]>([])
const search = ref('')
const status = ref('')
const systemType = ref('')
const includeArchived = ref(false)

function shortText(value: string, maxLength = 80) {
  const text = (value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function setSystem(value: string) {
  systemType.value = value
  loadData()
}

function resetFilters() {
  search.value = ''
  status.value = ''
  systemType.value = ''
  includeArchived.value = false
  implementationQueue.value = ''
  loadData()
}

function countByStatus(statusName: string) {
  return items.value.filter((item) => (item.statusText || '').trim() === statusName).length
}

async function loadData() {
  try {
    loading.value = true
    items.value = await fetchRequirements({
      systemType: systemType.value || undefined,
      status: status.value || undefined,
      search: search.value || undefined,
      includeArchived: includeArchived.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
    })
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки')
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  try {
    const blob = await exportRequirementsFile({
      systemType: systemType.value || undefined,
      status: status.value || undefined,
      search: search.value || undefined,
      includeArchived: includeArchived.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
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

async function handleArchive(row: Requirement) {
  try {
    await archiveRequirement(row.id)
    ElMessage.success('Запись отправлена в архив')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка архивирования')
  }
}

async function handleRestore(row: Requirement) {
  try {
    await restoreRequirement(row.id)
    ElMessage.success('Запись восстановлена')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка восстановления')
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function handleRowClick(row: Requirement) {
  selectedRequirementId.value = row.id
  detailsVisible.value = true
}

function getRowClassName({ row }: { row: Requirement }) {
  return row.isArchived ? 'archived-row' : ''
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('ru-RU')
}

onMounted(async () => {
  await loadQueues()
  await loadData()
})

const queues = ref<QueueItem[]>([])
const implementationQueue = ref('')

async function loadQueues() {
  try {
    queues.value = await fetchQueues()
  } catch {
    queues.value = []
  }
}

function countByQueue(queueName: string) {
  return items.value.filter((item) => (item.implementationQueue || '').trim() === queueName).length
}
</script>

<style scoped>
 .page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, #f4f8ff 0%, #f7f9fc 35%, #f3f5f8 100%);
  padding: 16px;
}

.page-shell {
  width: 100%;
  max-width: none;
  margin: 0;
  display: grid;
  gap: 14px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header-left {
  display: grid;
  gap: 6px;
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

/* DASHBOARD */
.summary-grid-all {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 1365px) {
  .summary-grid-all {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .summary-grid-all {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .summary-grid-all {
    grid-template-columns: 1fr;
  }
}

.summary-card {
  border-radius: 14px;
  border: 1px solid #e7ecf3;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.queue-summary-card {
  border-radius: 14px;
  border: 1px solid #c4c4c4;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  background-color: #f8f8f8;
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
}

.top-actions {
  display: grid;
  gap: 12px;
}

.main-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* FILTERS */
.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.search-input {
  width: 360px;
  flex: 0 0 360px;
}

.status-select {
  width: 180px;
  flex: 0 0 180px;
}

.queue-select {
  width: 170px;
  flex: 0 0 170px;
}

.table-card {
  overflow: hidden;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.requirements-table {
  min-width: 1700px;
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

.row-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.archived-row td {
  opacity: 0.7;
}

/* NOTEBOOK / SMALLER */
@media (max-width: 1365px) {
  .summary-grid-main {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .summary-grid-queues {
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

/* TABLET */
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

  .summary-grid-main,
  .summary-grid-queues {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* MOBILE */
@media (max-width: 560px) {
  .summary-grid-main,
  .summary-grid-queues {
    grid-template-columns: 1fr;
  }
}
</style>