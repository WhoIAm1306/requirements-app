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
            <el-input
              v-model="form.taskIdentifier"
              clearable
              placeholder="Пусто — сгенерируется автоматически"
            />
            <div class="field-hint">Формат зависит от очереди и настроек выбранной ГК.</div>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="Система">
            <el-select v-model="form.systemType" style="width: 100%" @change="onSystemTypeChange">
              <el-option
                v-for="opt in SYSTEM_TYPE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
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
            <el-select
              v-model="form.statusText"
              placeholder="Статус"
              clearable
              filterable
              allow-create
              default-first-option
              style="width: 100%"
            >
              <el-option v-for="s in STANDARD_REQUIREMENT_STATUSES" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="ГК">
        <el-select
          v-model="form.contractName"
          placeholder="Выберите или введите наименование ГК"
          style="width: 100%"
          filterable
          allow-create
          default-first-option
          clearable
          @change="onContractChange"
        >
          <el-option
            v-for="c in contractSelectOptions"
            :key="`${c.id}-${c.name}`"
            :label="c.name"
            :value="c.name"
          />
          <template #empty>
            <span class="select-empty">В справочнике пока нет ГК — введите наименование вручную.</span>
          </template>
        </el-select>
      </el-form-item>

      <el-divider />

      <el-form-item label="Этап">
        <el-select
          v-model="selectedStageNumber"
          placeholder="Сначала выберите ГК"
          style="width: 100%"
          :disabled="!selectedContractId"
          filterable
          @change="handleStageChange"
        >
          <el-option
            v-for="stage in stages"
            :key="stage.id"
            :label="stage.stageName || `Этап ${stage.stageNumber}`"
            :value="stage.stageNumber"
          />
          <template #empty>
            <span class="select-empty">К выбранной ГК не добавлены этапы (справочник ГК).</span>
          </template>
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="п.п. НМЦК — функция">
            <el-select
              v-model="selectedFunctionId"
              placeholder="Сначала выберите этап"
              style="width: 100%"
              :disabled="!selectedStageNumber"
              filterable
              clearable
              @change="handleFunctionSelected"
            >
              <el-option
                v-for="fn in sortedFunctions"
                :key="fn.id"
                :label="nmckFunctionOptionLabel(fn)"
                :value="fn.id"
              />
              <template #empty>
                <span class="select-empty">Для выбранного этапа нет функций в справочнике ГК.</span>
              </template>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="п.п. ТЗ">
            <el-input
              :model-value="form.tzPointText"
              type="textarea"
              :rows="2"
              readonly
              disabled
              placeholder="Подставится после выбора функции НМЦК"
              class="tz-autofill-input"
            />
          </el-form-item>
        </el-col>
      </el-row>

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
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createRequirement } from '@/api/requirements'
import { createQueue, fetchQueues } from '@/api/queues'
import { fetchContracts } from '@/api/contracts'
import { useAuthStore } from '@/stores/auth'
import { fetchGKFunctionsForStage, fetchGKStages } from '@/api/gkContracts'
import type { GKFunction, GKStage, QueueItem, RequirementPayload } from '@/types'
import {
  DEFAULT_REQUIREMENT_STATUS,
  STANDARD_REQUIREMENT_STATUSES,
} from '@/constants/requirementStatuses'
import { SYSTEM_TYPE_OPTIONS } from '@/constants/systemTypes'
import { initiatorForSystemType } from '@/constants/initiatorBySystem'

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
const contracts = ref<{ id: number; name: string }[]>([])

const selectedContractId = ref<number | null>(null)
const stages = ref<GKStage[]>([])
const functions = ref<GKFunction[]>([])
const selectedStageNumber = ref<number | null>(null)
const selectedFunctionId = ref<number | null>(null)

const emptyForm = (): RequirementPayload => ({
  taskIdentifier: '',
  shortName: '',
  initiator: initiatorForSystemType('112'),
  responsiblePerson: authStore.fullName,
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: '1 очередь',
  noteText: '',
  tzPointText: '',
  nmckPointText: '',
  contractTZFunctionId: null,
  statusText: DEFAULT_REQUIREMENT_STATUS,
  systemType: '112',
  contractName: '',
})

const form = reactive<RequirementPayload>(emptyForm())

const contractSelectOptions = computed(() => {
  const list = contracts.value.map((c) => ({ id: c.id, name: c.name }))
  const cur = (form.contractName || '').trim()
  if (!cur) return list
  const exists = list.some((c) => (c.name || '').trim().toLowerCase() === cur.toLowerCase())
  if (exists) return list
  return [{ id: -1, name: cur }, ...list]
})

/** Функции этапа в списке по номеру НМЦК для выбора «п.п. НМЦК — функция». */
const sortedFunctions = computed(() => {
  return [...functions.value].sort((a, b) => {
    const cmp = (a.nmckFunctionNumber || '').localeCompare(b.nmckFunctionNumber || '', undefined, {
      numeric: true,
    })
    if (cmp !== 0) return cmp
    return (a.functionName || '').localeCompare(b.functionName || '', undefined, { sensitivity: 'base' })
  })
})

function nmckFunctionOptionLabel(fn: GKFunction) {
  const n = (fn.nmckFunctionNumber || '').trim()
  const name = (fn.functionName || '').trim()
  if (n && name) return `${n} — ${name}`
  return name || n || '—'
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      await loadQueues()
      await loadContracts()
      Object.assign(form, emptyForm())
      selectedContractId.value = null
      stages.value = []
      functions.value = []
      selectedStageNumber.value = null
      selectedFunctionId.value = null
      if (queues.value.length && !form.implementationQueue) {
        form.implementationQueue = queues.value[0].name
      }
    }
  },
)

async function loadQueues() {
  try {
    queues.value = await fetchQueues()
  } catch (error: any) {
    console.error('queues load error', error)
    queues.value = []
  }
}

async function loadContracts() {
  try {
    contracts.value = await fetchContracts()
  } catch {
    contracts.value = []
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

function resolveContractIdByName(contractName: string) {
  const name = (contractName || '').trim().toLowerCase()
  if (!name) return null
  const c = contracts.value.find((x) => (x.name || '').trim().toLowerCase() === name)
  return c?.id ?? null
}

async function onContractChange(value: string | null | undefined) {
  const name = typeof value === 'string' ? value : ''
  form.contractName = name
  const id = resolveContractIdByName(name)
  selectedContractId.value = id

  selectedStageNumber.value = null
  selectedFunctionId.value = null
  stages.value = []
  functions.value = []

  form.contractTZFunctionId = null
  form.tzPointText = ''
  form.nmckPointText = ''

  if (!name.trim()) return
  if (!id) return
  stages.value = await fetchGKStages(id)
}

async function handleStageChange(stageNumber: number | null) {
  selectedFunctionId.value = null
  functions.value = []
  form.contractTZFunctionId = null
  form.tzPointText = ''
  form.nmckPointText = ''

  if (!selectedContractId.value || !stageNumber) return
  functions.value = await fetchGKFunctionsForStage(selectedContractId.value, stageNumber)
}

function handleFunctionSelected(functionId: number | null) {
  if (!functionId) {
    form.contractTZFunctionId = null
    form.tzPointText = ''
    form.nmckPointText = ''
    return
  }

  const fn = functions.value.find((x) => x.id === functionId)
  if (!fn) return

  form.contractTZFunctionId = functionId
  form.tzPointText = `${fn.tzSectionNumber} — ${fn.functionName}`
  form.nmckPointText = (fn.nmckFunctionNumber || '').trim()
}

async function submit() {
  try {
    loading.value = true
    const payload: RequirementPayload = { ...form }
    if (!(payload.taskIdentifier || '').trim()) {
      delete payload.taskIdentifier
    }
    await createRequirement(payload)
    ElMessage.success('Предложение создано')
    emit('saved')
    emit('update:modelValue', false)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка создания предложения')
  } finally {
    loading.value = false
  }
}

function onSystemTypeChange() {
  form.initiator = initiatorForSystemType(form.systemType)
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

.select-empty {
  display: block;
  padding: 10px 12px;
  font-size: 13px;
  color: #5c6b7f;
  line-height: 1.4;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}

:deep(.tz-autofill-input.is-disabled .el-textarea__inner) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

</style>