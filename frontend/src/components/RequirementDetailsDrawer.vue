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
                  <el-input v-model="form.contractName" />
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
                    <el-option label="Новое" value="Новое" />
                    <el-option label="Учтено" value="Учтено" />
                    <el-option label="Выполнено" value="Выполнено" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Система">
                  <el-select v-model="form.systemType" style="width: 100%">
                    <el-option label="112" value="112" />
                    <el-option label="101" value="101" />
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

              <el-col :span="12">
                <el-form-item label="Пункт ТЗ">
                  <el-input v-model="form.tzPointText" />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="Примечание">
                  <el-input v-model="form.noteText" />
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
              <div class="readonly-value">{{ item.systemType || '—' }}</div>
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

            <div class="readonly-card">
              <div class="readonly-label">Пункт ТЗ</div>
              <div class="readonly-value">{{ item.tzPointText || '—' }}</div>
            </div>

            <div class="readonly-card">
              <div class="readonly-label">Примечание</div>
              <div class="readonly-value">{{ item.noteText || '—' }}</div>
            </div>
          </div>
        </template>

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
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { fetchQueues } from '@/api/queues'
import {
  addRequirementComment,
  archiveRequirement,
  fetchRequirementById,
  restoreRequirement,
  updateRequirement,
} from '@/api/requirements'
import type { QueueItem, Requirement, RequirementPayload } from '@/types'

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

/**
 * Текст нового комментария.
 */
const newCommentText = ref('')

/**
 * Локальная форма редактирования.
 */
const form = reactive<RequirementPayload>({
  shortName: '',
  initiator: '',
  responsiblePerson: '',
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: '',
  contractName: '',
  noteText: '',
  tzPointText: '',
  statusText: '',
  systemType: '',
})

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
  form.shortName = data.shortName || ''
  form.initiator = data.initiator || ''
  form.responsiblePerson = data.responsiblePerson || ''
  form.sectionName = data.sectionName || ''
  form.proposalText = data.proposalText || ''
  form.problemComment = data.problemComment || ''
  form.discussionSummary = data.discussionSummary || ''
  form.implementationQueue = data.implementationQueue || ''
  form.contractName = data.contractName || ''
  form.noteText = data.noteText || ''
  form.tzPointText = data.tzPointText || ''
  form.statusText = data.statusText || ''
  form.systemType = data.systemType || ''
}

/**
 * Загрузка карточки предложения.
 */
async function loadItem() {
  if (!props.requirementId) return

  try {
    loading.value = true
    const data = await fetchRequirementById(props.requirementId)
    item.value = data
    fillForm(data)
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