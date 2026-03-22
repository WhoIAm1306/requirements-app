<template>
  <el-dialog
    :model-value="modelValue"
    title="Добавить предложение"
    width="900px"
    @close="emit('update:modelValue', false)"
  >
    <el-form label-position="top">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Идентификатор задачи">
            <el-input value="Будет присвоен автоматически" disabled />
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

      <el-row :gutter="16">
        <el-col :span="24">
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
        </el-col>
      </el-row>

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

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Отмена</el-button>
      <el-button type="primary" :loading="loading" @click="submit">Сохранить</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createRequirement } from '@/api/requirements'
import { fetchTZPointSuggestions } from '@/api/dictionaries'
import { createQueue, fetchQueues } from '@/api/queues'
import { useAuthStore } from '@/stores/auth'
import type { QueueItem, RequirementPayload } from '@/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const authStore = useAuthStore()
const loading = defineModel<boolean>('loading', { default: false })
const queues = ref<QueueItem[]>([])

const emptyForm = (): RequirementPayload => ({
  shortName: '',
  initiator: '',
  responsiblePerson: authStore.fullName,
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: '1 очередь',
  noteText: '',
  tzPointText: '',
  statusText: 'Новое',
  systemType: '112',
})

const form = reactive<RequirementPayload>(emptyForm())

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      await loadQueues()
      Object.assign(form, emptyForm())
      if (queues.value.length && !form.implementationQueue) {
        form.implementationQueue = queues.value[0].name
      }
    }
  },
)

async function loadQueues() {
  try {
    queues.value = await fetchQueues()
    console.log('queues loaded', queues.value)
  } catch (error: any) {
    console.error('queues load error', error)
    queues.value = []
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

async function querySearchTZ(queryString: string, cb: (arg: Array<{ value: string }>) => void) {
  try {
    const data = await fetchTZPointSuggestions(queryString)
    cb(data.map((item) => ({ value: item })))
  } catch {
    cb([])
  }
}

async function submit() {
  try {
    loading.value = true
    await createRequirement(form)
    ElMessage.success('Предложение создано')
    emit('saved')
    emit('update:modelValue', false)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка создания предложения')
  } finally {
    loading.value = false
  }
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

</script>

<style scoped>
.queue-add-col {
  display: flex;
  align-items: flex-end;
}

.queue-select-footer {
  padding-top: 8px;
  display: flex;
  justify-content: flex-start;
}

</style>