<template>
  <el-drawer
    :model-value="modelValue"
    title="Карточка предложения"
    size="55%"
    @close="emit('update:modelValue', false)"
  >
    <div v-loading="loading">
      <template v-if="item">
        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Идентификатор задачи">
                <el-input :model-value="item.taskIdentifier" disabled />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="Система">
                <el-select v-model="form.systemType" style="width: 100%">
                  <el-option label="Система 112" value="112" />
                  <el-option label="Система 101" value="101" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="Краткое наименование предложения">
            <el-input v-model="form.shortName" />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Инициатор предложения">
                <el-input v-model="form.initiator" />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="Ответственный за предложение">
                <el-input v-model="form.responsiblePerson" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="Условное разделение">
            <el-input v-model="form.sectionName" />
          </el-form-item>

          <el-form-item label="Предложение">
            <el-input v-model="form.proposalText" type="textarea" :rows="4" />
          </el-form-item>

          <el-form-item label="Комментарии и описание проблем">
            <el-input v-model="form.problemComment" type="textarea" :rows="4" />
          </el-form-item>

          <el-form-item label="Обсуждение (кратко)">
            <el-input v-model="form.discussionSummary" type="textarea" :rows="3" />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="16">
              <el-form-item label="Номер очереди при реализации">
                <el-select v-model="form.implementationQueue" style="width: 100%">
                  <el-option
                    v-for="queue in queues"
                    :key="queue.id"
                    :label="queue.name"
                    :value="queue.name"
                  />

                  <template #footer>
                    <div class="queue-select-footer">
                      <el-button text bg size="small" @click="openAddQueueDialog">
                        Добавить очередь
                      </el-button>
                    </div>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="Статус">
            <el-autocomplete
              v-model="form.statusText"
              :fetch-suggestions="querySearchStatus"
              placeholder="Введите статус"
              clearable
              style="width: 100%"
              :trigger-on-focus="true"
            />
          </el-form-item>

          <el-form-item label="ГК">
            <el-autocomplete
              v-model="form.contractName"
              :fetch-suggestions="querySearchContracts"
              placeholder="Выберите или введите ГК"
              clearable
              style="width: 100%"
              :trigger-on-focus="true"
            />
          </el-form-item>

          <el-form-item label="Пункт ТЗ">
            <el-autocomplete
              v-model="form.tzPointText"
              :fetch-suggestions="querySearchTZ"
              placeholder="Выберите или введите свой вариант"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="Примечание">
            <el-input v-model="form.noteText" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>

        <div class="service-meta">
          <div><strong>Создал:</strong> {{ item.authorName }} ({{ item.authorOrg }})</div>
          <div><strong>Дата создания:</strong> {{ formatDate(item.createdAt) }}</div>
          <div><strong>Последнее изменение:</strong> {{ item.lastEditedBy }} ({{ item.lastEditedOrg }})</div>
          <div><strong>Дата изменения:</strong> {{ formatDate(item.updatedAt) }}</div>
          <div v-if="item.isArchived"><strong>В архиве:</strong> Да</div>
          <div v-if="item.archivedBy"><strong>Архивировал:</strong> {{ item.archivedBy }} ({{ item.archivedByOrg }})</div>
          <div v-if="item.archivedAt"><strong>Дата архивирования:</strong> {{ formatDate(item.archivedAt) }}</div>
        </div>

        <div class="drawer-actions">
          <el-button type="primary" :loading="saving" @click="save">Сохранить изменения</el-button>
        </div>

        <div class="comments-block">
          <h3>Обсуждение</h3>

          <div v-if="item.comments?.length" class="comments-list">
            <el-card v-for="comment in item.comments" :key="comment.id" class="comment-card">
              <div class="comment-meta">
                <strong>{{ comment.authorName }}</strong>
                <span>({{ comment.authorOrg }})</span>
                <span>{{ formatDate(comment.createdAt) }}</span>
              </div>
              <div class="comment-text">{{ comment.commentText }}</div>
            </el-card>
          </div>

          <el-empty v-else description="Комментариев пока нет" />

          <el-input
            v-model="newComment"
            type="textarea"
            :rows="4"
            placeholder="Введите комментарий"
          />

          <div class="comment-actions">
            <el-button type="primary" :loading="commentLoading" @click="sendComment">
              Добавить комментарий
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addRequirementComment, fetchRequirementById, updateRequirement } from '@/api/requirements'
import { fetchTZPointSuggestions } from '@/api/dictionaries'
import { createQueue, fetchQueues } from '@/api/queues'
import type { QueueItem, Requirement, RequirementPayload } from '@/types'
import { searchContracts } from '@/api/contracts'

const props = defineProps<{
  modelValue: boolean
  requirementId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}>()

const loading = ref(false)
const saving = ref(false)
const commentLoading = ref(false)
const item = ref<Requirement | null>(null)
const newComment = ref('')
const queues = ref<QueueItem[]>([])

const form = reactive<RequirementPayload>({
  shortName: '',
  initiator: '',
  responsiblePerson: '',
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: '1 очередь',
  noteText: '',
  tzPointText: '',
  statusText: 'Новое',
  systemType: '112',
  contractName: '',
})

function fillForm(data: Requirement) {
  form.shortName = data.shortName || ''
  form.initiator = data.initiator || ''
  form.responsiblePerson = data.responsiblePerson || ''
  form.sectionName = data.sectionName || ''
  form.proposalText = data.proposalText || ''
  form.problemComment = data.problemComment || ''
  form.discussionSummary = data.discussionSummary || ''
  form.implementationQueue = data.implementationQueue || '1 очередь'
  form.noteText = data.noteText || ''
  form.tzPointText = data.tzPointText || ''
  form.statusText = data.statusText || 'Новое'
  form.systemType = data.systemType || '112'
  form.contractName = data.contractName || ''
}

async function loadQueues() {
  try {
    queues.value = await fetchQueues()
  } catch {
    queues.value = []
  }
}

async function loadData() {
  if (!props.requirementId) return

  try {
    loading.value = true
    await loadQueues()
    const data = await fetchRequirementById(props.requirementId)
    item.value = data
    fillForm(data)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки карточки')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.requirementId],
  async ([opened, id]) => {
    if (opened && id) {
      newComment.value = ''
      await loadData()
    }
  },
  { immediate: true },
)

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

async function querySearchTZ(queryString: string, cb: (arg: Array<{ value: string }>) => void) {
  try {
    const data = await fetchTZPointSuggestions(queryString)
    cb(data.map((item) => ({ value: item })))
  } catch {
    cb([])
  }
}

async function save() {
  if (!props.requirementId) return

  try {
    saving.value = true
    await updateRequirement(props.requirementId, form)
    await loadData()
    ElMessage.success('Изменения сохранены')
    emit('updated')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения')
  } finally {
    saving.value = false
  }
}

async function sendComment() {
  if (!props.requirementId) return
  if (!newComment.value.trim()) {
    ElMessage.warning('Введите комментарий')
    return
  }

  try {
    commentLoading.value = true
    await addRequirementComment(props.requirementId, newComment.value)
    newComment.value = ''
    await loadData()
    emit('updated')
    ElMessage.success('Комментарий добавлен')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка добавления комментария')
  } finally {
    commentLoading.value = false
  }
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('ru-RU')
}

const baseStatuses = ['Новое', 'Учтено', 'Выполнено']

function querySearchStatus(queryString: string, cb: (arg: Array<{ value: string }>) => void) {
  const value = queryString.trim().toLowerCase()

  if (!value) {
    cb(baseStatuses.map((item) => ({ value: item })))
    return
  }

  const results = baseStatuses
    .filter((item) => item.toLowerCase().includes(value))
    .map((item) => ({ value: item }))

  cb(results)
}

async function querySearchContracts(queryString: string, cb: (arg: Array<{ value: string }>) => void) {
  try {
    const data = await searchContracts(queryString)
    cb(data.map((item) => ({ value: item })))
  } catch {
    cb([])
  }
}
</script>

<style scoped>
.queue-add-col {
  display: flex;
  align-items: flex-end;
}

.service-meta {
  margin: 20px 0;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 10px;
  display: grid;
  gap: 8px;
}

.drawer-actions {
  margin-bottom: 24px;
}

.comments-block {
  margin-top: 24px;
}

.comments-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.comment-card {
  border-radius: 12px;
}

.comment-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #606266;
  font-size: 13px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.comment-text {
  white-space: pre-wrap;
}

.comment-actions {
  margin-top: 12px;
}

.queue-select-footer {
  padding-top: 8px;
  display: flex;
  justify-content: flex-start;
}
</style>