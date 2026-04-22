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

      <el-form-item label="Ссылки на Confluence">
        <div class="links-group">
          <div v-for="(link, idx) in form.confluenceLinks" :key="`cf-${idx}`" class="link-row">
            <a :href="linkHref(link)" class="link-view" target="_blank" rel="noopener noreferrer">{{ link }}</a>
            <el-button type="danger" plain @click="removeConfluenceLink(idx)">Удалить</el-button>
          </div>
          <div class="link-add-row">
            <el-input v-model="newConfluenceLink" placeholder="https://confluence..." />
            <el-button type="primary" plain @click="addConfluenceLink">Добавить</el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="Ссылки на Jira Epic">
        <div class="links-group">
          <div v-for="(link, idx) in form.jiraEpicLinks" :key="`je-${idx}`" class="link-row">
            <a :href="linkHref(link)" class="link-view" target="_blank" rel="noopener noreferrer">{{ link }}</a>
            <el-button type="danger" plain @click="removeJiraEpicLink(idx)">Удалить</el-button>
          </div>
          <div class="link-add-row">
            <el-input v-model="newJiraEpicLink" placeholder="https://jira.../browse/KEY-123" />
            <el-button type="primary" plain @click="addJiraEpicLink">Добавить</el-button>
          </div>
        </div>
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

function normalizeLink(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

function linkHref(value: string) {
  return normalizeLink(value)
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

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
      form.confluenceLinks = Array.isArray(fn.confluenceLinks) ? [...fn.confluenceLinks] : []
      const epicLinks = Array.isArray(fn.jiraEpicLinks) ? [...fn.jiraEpicLinks] : []
      const legacyJiraLink = (fn.jiraLink || '').trim()
      if (legacyJiraLink && !epicLinks.some((x) => x.trim().toLowerCase() === legacyJiraLink.toLowerCase())) {
        epicLinks.unshift(legacyJiraLink)
      }
      form.jiraEpicLinks = epicLinks
    } else {
      Object.assign(form, emptyForm())
    }
    newConfluenceLink.value = ''
    newJiraEpicLink.value = ''
  },
)

function addConfluenceLink() {
  const next = normalizeLink(newConfluenceLink.value)
  if (!next) return
  if (!isValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Confluence')
    return
  }
  if (!form.confluenceLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    form.confluenceLinks = [...(form.confluenceLinks || []), next]
  }
  newConfluenceLink.value = ''
}

function removeConfluenceLink(index: number) {
  form.confluenceLinks = (form.confluenceLinks || []).filter((_, i) => i !== index)
}

function addJiraEpicLink() {
  const next = normalizeLink(newJiraEpicLink.value)
  if (!next) return
  if (!isValidHttpUrl(next)) {
    ElMessage.warning('Некорректная ссылка Jira Epic')
    return
  }
  if (!form.jiraEpicLinks.some((x) => x.trim().toLowerCase() === next.toLowerCase())) {
    form.jiraEpicLinks = [...(form.jiraEpicLinks || []), next]
  }
  newJiraEpicLink.value = ''
}

function removeJiraEpicLink(index: number) {
  form.jiraEpicLinks = (form.jiraEpicLinks || []).filter((_, i) => i !== index)
}

async function submit() {
  if (!props.contractId) return

  try {
    loading.value = true

    const payload: UpsertGKFunctionPayload = {
      stageNumber: props.stageNumber,
      functionName: form.functionName,
      nmckFunctionNumber: form.nmckFunctionNumber,
      tzSectionNumber: form.tzSectionNumber,
      jiraLink: '',
      confluenceLinks: (form.confluenceLinks || []).map((x) => x.trim()).filter(Boolean),
      jiraEpicLinks: (form.jiraEpicLinks || []).map((x) => x.trim()).filter(Boolean),
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

<style scoped>
.links-group {
  width: 100%;
  display: grid;
  gap: 8px;
}

.link-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.link-add-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.link-view {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: #1e4d7b;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}
</style>
