<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="720px"
    @close="emit('update:modelValue', false)"
  >
    <el-form label-position="top">
      <el-form-item label="Наименование функции">
        <el-input v-model="form.functionName" type="textarea" :rows="3" />
      </el-form-item>

      <el-form-item label="Номер функции по НМЦК">
        <el-input v-model="form.nmckFunctionNumber" placeholder="Например, 1.1.2" style="width: 100%" />
      </el-form-item>

      <el-form-item label="Номер раздела по ТЗ">
        <el-input v-model="form.tzSectionNumber" />
      </el-form-item>

      <el-form-item label="Ссылка на Jira">
        <el-input v-model="form.jiraLink" placeholder="https://… (необязательно)" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Отмена</el-button>
      <el-button type="primary" :loading="loading" @click="submit">Сохранить</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { upsertGKFunction } from '@/api/gkContracts'
import type { GKFunction, UpsertGKFunctionPayload } from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    contractId: number | null
    stageNumber: number
    initialFunction?: GKFunction | null
  }>(),
  { initialFunction: null },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const loading = defineModel<boolean>('loading', { default: false })

const emptyForm = (): Omit<UpsertGKFunctionPayload, 'stageNumber'> => ({
  functionName: '',
  nmckFunctionNumber: '',
  tzSectionNumber: '',
  jiraLink: '',
})

const form = reactive<Omit<UpsertGKFunctionPayload, 'stageNumber'>>(emptyForm())

const dialogTitle = computed(() => {
  if (props.initialFunction?.id) {
    return `Редактировать функцию ТЗ (этап ${props.stageNumber})`
  }
  return `Добавить функцию ТЗ (этап ${props.stageNumber})`
})

watch(
  () => [props.modelValue, props.stageNumber, props.initialFunction?.id] as const,
  () => {
    if (!props.modelValue) return
    const fn = props.initialFunction
    if (fn && fn.id) {
      form.functionName = fn.functionName || ''
      form.nmckFunctionNumber = fn.nmckFunctionNumber || ''
      form.tzSectionNumber = fn.tzSectionNumber || ''
      form.jiraLink = fn.jiraLink || ''
    } else {
      Object.assign(form, emptyForm())
    }
  },
)

async function submit() {
  if (!props.contractId) return

  try {
    loading.value = true

    const payload: UpsertGKFunctionPayload = {
      stageNumber: props.stageNumber,
      functionName: form.functionName,
      nmckFunctionNumber: form.nmckFunctionNumber,
      tzSectionNumber: form.tzSectionNumber,
      jiraLink: form.jiraLink?.trim() || '',
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
</script>
