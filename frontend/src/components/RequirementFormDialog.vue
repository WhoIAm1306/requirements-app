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
            <div class="field-hint">Формат зависит от приоритета (очереди) и настроек выбранной ГК.</div>
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

      <el-form-item label="Раздел">
        <el-select
          v-model="form.sectionName"
          style="width: 100%"
          filterable
          allow-create
          default-first-option
          placeholder="Например, Телефония или свой текст"
        >
          <el-option :label="TELEPHONY_SECTION" :value="TELEPHONY_SECTION" />
        </el-select>
        <div v-if="isTelephonySectionName(form.sectionName)" class="field-hint">
          Для раздела «{{ TELEPHONY_SECTION }}» выберите систему 112 или 101 в поле «Система».
        </div>
      </el-form-item>

      <el-form-item label="Предложение">
        <el-input v-model="form.proposalText" type="textarea" :rows="4" />
      </el-form-item>

      <el-form-item label="Комментарии и описание проблем">
        <el-input v-model="form.problemComment" type="textarea" :rows="4" />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="16">
          <el-form-item label="Приоритет">
            <el-select v-model="form.implementationQueue" style="width: 100%">
              <el-option
                v-for="queue in queues"
                :key="queue.id"
                :label="queue.name"
                :value="queue.name"
              />

              <template #footer>
                <div class="queue-select-footer">
                  <el-button class="queue-select-add-btn" text @click="openAddQueueDialog">
                    <span class="queue-select-add-btn__plus">+</span>
                    <span>Добавить новую очередь</span>
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

      <div class="tz-mode-toggle">
        <label class="tz-mode-toggle__row">
          <span class="tz-mode-toggle__label">Выбрать через ТЗ</span>
          <el-switch v-model="selectViaTz" :disabled="!selectedStageNumber" />
        </label>
      </div>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="п.п. НМЦК">
            <el-select
              v-model="selectedNmckFunctionId"
              :placeholder="selectViaTz ? 'Сначала выберите п.п. ТЗ' : 'Сначала выберите этап'"
              style="width: 100%"
              :disabled="nmckSelectDisabled"
              filterable
              clearable
              @change="handleNmckSelected"
            >
              <el-option
                v-for="opt in nmckFunctionOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
              <template #empty>
                <span class="select-empty">{{ nmckEmptyText }}</span>
              </template>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="п.п. ТЗ">
            <el-select
              v-if="selectViaTz"
              v-model="selectedTzSectionNumber"
              placeholder="Сначала выберите этап"
              style="width: 100%"
              :disabled="!selectedStageNumber"
              filterable
              clearable
              @change="handleTzSelected"
            >
              <el-option v-for="opt in tzSectionOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              <template #empty>
                <span class="select-empty">Для выбранного этапа нет пунктов ТЗ.</span>
              </template>
            </el-select>
            <el-input
              v-else
              :model-value="form.tzPointText"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
              :readonly="true"
              placeholder="Подставится после выбора п.п. НМЦК"
              class="tz-autofill-input"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Дата выполнения">
            <el-date-picker
              v-model="form.completedAt"
              type="date"
              style="width: 100%"
              value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
              clearable
              placeholder="По умолчанию при статусе «Выполнено»"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Письмо в ДИТ — номер исходящего">
            <el-input v-model="form.ditOutgoingNumber" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Письмо в ДИТ — дата">
            <el-date-picker
              v-model="form.ditOutgoingDate"
              type="date"
              style="width: 100%"
              value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
              clearable
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Примечание">
        <el-input
          v-model="form.noteText"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 12 }"
          class="note-textarea"
        />
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
import { TELEPHONY_SECTION, isTelephonySectionName } from '@/constants/telephonySection'
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
const DEFAULT_QUEUE_NAME = 'Не определена'

const selectedContractId = ref<number | null>(null)
const stages = ref<GKStage[]>([])
const functions = ref<GKFunction[]>([])
const selectedStageNumber = ref<number | null>(null)
const selectViaTz = ref(false)
const selectedTzSectionNumber = ref('')
const selectedNmckFunctionId = ref<number | null>(null)

const emptyForm = (): RequirementPayload => ({
  taskIdentifier: '',
  shortName: '',
  initiator: initiatorForSystemType('112'),
  responsiblePerson: authStore.fullName,
  sectionName: '',
  proposalText: '',
  problemComment: '',
  discussionSummary: '',
  implementationQueue: DEFAULT_QUEUE_NAME,
  noteText: '',
  tzPointText: '',
  nmckPointText: '',
  contractTZFunctionId: null,
  statusText: DEFAULT_REQUIREMENT_STATUS,
  systemType: '112',
  contractName: '',
  completedAt: null,
  ditOutgoingNumber: '',
  ditOutgoingDate: null,
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
      selectViaTz.value = false
      selectedTzSectionNumber.value = ''
      selectedNmckFunctionId.value = null
      if (queues.value.length && !form.implementationQueue) {
        form.implementationQueue = queues.value[0].name
      }
    }
  },
)

async function loadQueues() {
  try {
    const loaded = await fetchQueues()
    if (loaded.some((q) => (q.name || '').trim() === DEFAULT_QUEUE_NAME)) {
      queues.value = loaded
    } else {
      queues.value = [
        { id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' },
        ...loaded,
      ]
    }
  } catch (error: any) {
    console.error('queues load error', error)
    queues.value = [{ id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' }]
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
  selectViaTz.value = false
  selectedTzSectionNumber.value = ''
  selectedNmckFunctionId.value = null
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
  selectViaTz.value = false
  selectedTzSectionNumber.value = ''
  selectedNmckFunctionId.value = null
  functions.value = []
  form.contractTZFunctionId = null
  form.tzPointText = ''
  form.nmckPointText = ''

  if (!selectedContractId.value || !stageNumber) return
  functions.value = await fetchGKFunctionsForStage(selectedContractId.value, stageNumber)
}

function handleTzSelected(tzValue: string | null) {
  const tz = tzValue ? tzValue.trim() : ''
  selectedTzSectionNumber.value = tz

  selectedNmckFunctionId.value = null

  form.contractTZFunctionId = null
  form.tzPointText = tz
  form.nmckPointText = ''
}

function syncFunctionSelection(fn: GKFunction | null) {
  if (!fn) {
    form.contractTZFunctionId = null
    form.tzPointText = selectViaTz.value ? selectedTzSectionNumber.value || '' : ''
    form.nmckPointText = ''
    return
  }

  selectedTzSectionNumber.value = (fn.tzSectionNumber || '').trim()
  form.contractTZFunctionId = fn.id
  form.tzPointText = (fn.tzSectionNumber || '').trim()
  form.nmckPointText = (fn.nmckFunctionNumber || '').trim()
}

function handleNmckSelected(functionId: number | null) {
  selectedNmckFunctionId.value = functionId
  const fn = functions.value.find((x) => x.id === functionId) || null
  syncFunctionSelection(fn)
}

const tzSectionOptions = computed(() => {
  const byTz = new Map<string, GKFunction>()
  for (const fn of functions.value) {
    const tz = (fn.tzSectionNumber || '').trim()
    if (tz && !byTz.has(tz)) byTz.set(tz, fn)
  }

  return Array.from(byTz.entries()).map(([tz, fn]) => ({
    value: tz,
    label: fn.functionName ? `${tz} — ${fn.functionName}` : tz,
  }))
})

const nmckFunctionOptions = computed(() => {
  const tz = (selectedTzSectionNumber.value || '').trim()
  const list =
    selectViaTz.value && tz
      ? functions.value.filter((fn) => (fn.tzSectionNumber || '').trim() === tz)
      : functions.value

  const byId = new Map<number, GKFunction>()
  for (const fn of list) {
    if ((fn.nmckFunctionNumber || '').trim()) byId.set(fn.id, fn)
  }

  return Array.from(byId.values()).map((fn) => ({
    value: fn.id,
    label: nmckFunctionOptionLabel(fn),
  }))
})

const nmckSelectDisabled = computed(() => {
  if (!selectedStageNumber.value) return true
  if (selectViaTz.value && !selectedTzSectionNumber.value) return true
  return false
})

const nmckEmptyText = computed(() => {
  if (!selectedStageNumber.value) return 'Сначала выберите этап.'
  if (selectViaTz.value && !selectedTzSectionNumber.value) return 'Сначала выберите п.п. ТЗ.'
  return 'Для выбранных параметров нет значений НМЦК.'
})

async function submit() {
  try {
    if (!form.systemType || (form.systemType !== '112' && form.systemType !== '101')) {
      ElMessage.warning('Выберите систему 112 или 101')
      return
    }
    if (isTelephonySectionName(form.sectionName) && form.systemType !== '112' && form.systemType !== '101') {
      ElMessage.warning('Для раздела «Телефония» укажите систему 112 или 101')
      return
    }
    loading.value = true
    const payload: RequirementPayload = { ...form }
    if (!(payload.taskIdentifier || '').trim()) {
      delete payload.taskIdentifier
    }
    if (!payload.completedAt) delete payload.completedAt
    if (!payload.ditOutgoingDate) delete payload.ditOutgoingDate
    if (!(payload.ditOutgoingNumber || '').trim()) delete payload.ditOutgoingNumber
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
  margin: 6px -12px -8px;
  padding: 8px 8px 6px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
}

.queue-select-add-btn {
  width: 100%;
  justify-content: flex-start;
  color: var(--el-color-primary);
  border-radius: 8px;
  padding: 8px 10px;
}

.queue-select-add-btn:hover {
  background: var(--el-color-primary-light-9);
}

.queue-select-add-btn__plus {
  font-size: 16px;
  line-height: 1;
  font-weight: 600;
  margin-right: 8px;
}

.select-empty {
  display: block;
  padding: 10px 12px;
  font-size: 13px;
  color: #5c6b7f;
  line-height: 1.4;
}

.tz-mode-toggle {
  margin-bottom: 10px;
}

.tz-mode-toggle__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tz-mode-toggle__label {
  font-size: 13px;
  color: #4b5565;
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

/* Readonly вместо disabled: нужно сохранить возможность выделения/копирования текста. */
:deep(.tz-autofill-input .el-textarea__inner[readonly]) {
  color: var(--el-text-color-regular);
  -webkit-text-fill-color: var(--el-text-color-regular);
}

/* Минимальная высота для «Примечание». */
:deep(.note-textarea .el-textarea__inner) {
  min-height: 30px;
}

</style>