<template>
  <el-dialog
    :model-value="showLoaderDialog"
    title="Загрузка функции"
    width="360px"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
  >
    <div v-loading="true" class="loader-body" />
  </el-dialog>

  <GKFunctionDialog
    v-if="dialogReady"
    v-model="innerVisible"
    :contract-id="dialogContractId"
    :stage-number="dialogStageNumber"
    :initial-function="dialogInitialFunction"
    :readonly="!canEdit"
    :allow-links="authStore.canAccessExternalLinks"
    :show-requirements="true"
    v-model:loading="dialogLoading"
    @saved="onFunctionSaved"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { fetchRequirementGKLink, type RequirementGKLinkInfo } from '@/api/requirements'
import { fetchGKFunctionsForStage } from '@/api/gkContracts'
import type { GKFunction } from '@/types'
import GKFunctionDialog from '@/components/GKFunctionDialog.vue'

const props = defineProps<{
  modelValue: boolean
  requirementId: number | null
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}>()
const authStore = useAuthStore()

const info = ref<RequirementGKLinkInfo | null>(null)
const fullFunction = ref<GKFunction | null>(null)
const dialogReady = ref(false)
const dialogLoading = ref(false)

const canEdit = computed(() => !!props.canEdit)
const showLoaderDialog = computed(() => !!props.modelValue && dialogLoading.value && !dialogReady.value)

const dialogContractId = computed<number | null>(() => {
  const i = info.value
  if (!i?.hasFunction || !i.contractId) return null
  return i.contractId
})

const dialogStageNumber = computed(() => info.value?.stageNumber ?? 0)

const dialogInitialFunction = computed<GKFunction | null>(() => fullFunction.value)

const innerVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

async function openDialogFromRequirement(requirementId: number) {
  dialogReady.value = false
  info.value = null
  fullFunction.value = null
  dialogLoading.value = true
  try {
    const loaded = await fetchRequirementGKLink(requirementId)
    if (!loaded?.hasFunction || !loaded.functionId || !loaded.contractId || !loaded.stageNumber) {
      ElMessage.info('Для записи не выбрана функция из справочника ГК')
      emit('update:modelValue', false)
      return
    }

    const functions = await fetchGKFunctionsForStage(loaded.contractId, loaded.stageNumber)
    const linked = functions.find((fn) => fn.id === loaded.functionId)

    info.value = loaded
    fullFunction.value = linked || {
      id: loaded.functionId,
      contractId: loaded.contractId,
      contractStageId: loaded.contractStageId,
      functionName: loaded.functionName || '',
      nmckFunctionNumber: loaded.nmckFunctionNumber || loaded.nmckPointText || '',
      tzSectionNumber: loaded.tzSectionNumber || loaded.tzPointText || '',
      jiraLink: loaded.jiraLink || '',
      confluenceLinks: Array.isArray(loaded.confluenceLinks) ? [...loaded.confluenceLinks] : [],
      jiraEpicLinks: Array.isArray(loaded.jiraEpicLinks) ? [...loaded.jiraEpicLinks] : [],
      createdAt: '',
      updatedAt: '',
    }
    dialogReady.value = true
  } catch {
    ElMessage.error('Не удалось загрузить сведения о функции')
    emit('update:modelValue', false)
  } finally {
    dialogLoading.value = false
  }
}

watch(
  () => [props.modelValue, props.requirementId] as const,
  async ([open, id]) => {
    if (!open || !id) {
      dialogReady.value = false
      info.value = null
      fullFunction.value = null
      return
    }
    await openDialogFromRequirement(id)
  },
  { immediate: true },
)

async function onFunctionSaved() {
  const id = props.requirementId
  if (id) {
    await openDialogFromRequirement(id)
  }
  emit('updated')
}
</script>

<style scoped>
.loader-body {
  min-height: 88px;
}
</style>
