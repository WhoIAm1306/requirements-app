<template>

  <el-dialog

    :model-value="modelValue"

    title="Сведения по функции НМЦК и ТЗ"

    width="560px"

    destroy-on-close

    @close="emit('update:modelValue', false)"

  >

    <div v-loading="loading" class="tz-dialog-body">

      <template v-if="info">

        <div v-if="!info.hasFunction && !hasAnyText" class="muted">

          Для этой записи не указаны п.п. ТЗ и привязка к функции справочника ГК.

        </div>



        <dl v-else class="def-list">

          <div class="row">

            <dt>ГК</dt>

            <dd>{{ info.contractName || '—' }}</dd>

          </div>

          <div v-if="info.hasFunction" class="row">

            <dt>Этап</dt>

            <dd>

              {{ info.stageName || `Этап ${info.stageNumber}` }}

              <span v-if="info.stageNumber" class="sub">(№ {{ info.stageNumber }})</span>

            </dd>

          </div>

          <div v-if="info.hasFunction" class="row">

            <dt>Наименование функции</dt>

            <dd>{{ info.functionName || '—' }}</dd>

          </div>

          <div class="row">

            <dt>п.п. ТЗ</dt>

            <dd>{{ info.tzPointText || info.tzSectionNumber || '—' }}</dd>

          </div>

          <div class="row">

            <dt>п.п. НМЦК</dt>

            <dd>{{ info.nmckPointText || info.nmckFunctionNumber || '—' }}</dd>

          </div>

          <div v-if="(info.jiraLink || '').trim()" class="row">

            <dt>Ссылка на Jira</dt>

            <dd>

              <a :href="normalizeUrl(info.jiraLink)" target="_blank" rel="noopener noreferrer" class="ext-link">

                {{ info.jiraLink }}

              </a>

            </dd>

          </div>

        </dl>

      </template>

    </div>

    <template #footer>

      <div class="tz-footer">

        <el-button

          v-if="canEdit && info?.hasFunction && editInitialFunction"

          @click="editFnVisible = true"

        >

          Редактировать функцию

        </el-button>

        <el-button type="primary" @click="emit('update:modelValue', false)">Закрыть</el-button>

      </div>

    </template>



    <GKFunctionDialog

      v-if="canEdit"

      v-model="editFnVisible"

      :contract-id="editContractId"

      :stage-number="editStageNumber"

      :initial-function="editInitialFunction"

      v-model:loading="editFnLoading"

      @saved="onFunctionSaved"

    />

  </el-dialog>

</template>



<script setup lang="ts">

import { computed, ref, watch } from 'vue'

import { ElMessage } from 'element-plus'

import { fetchRequirementGKLink, type RequirementGKLinkInfo } from '@/api/requirements'

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



const loading = ref(false)

const editFnVisible = ref(false)

const editFnLoading = ref(false)



const info = ref<RequirementGKLinkInfo | null>(null)



const editContractId = computed(() => {

  const i = info.value

  if (!i?.hasFunction || !i.contractId) return null

  return i.contractId

})



const editStageNumber = computed(() => info.value?.stageNumber ?? 0)



const editInitialFunction = computed<GKFunction | null>(() => {

  const i = info.value

  if (!i?.hasFunction || !i.functionId) return null

  return {

    id: i.functionId,

    contractId: i.contractId,

    contractStageId: i.contractStageId,

    functionName: i.functionName || '',

    nmckFunctionNumber: i.nmckFunctionNumber || '',

    tzSectionNumber: i.tzSectionNumber || '',

    jiraLink: i.jiraLink || '',

    createdAt: '',

    updatedAt: '',

  }

})



function normalizeUrl(url: string) {

  const u = (url || '').trim()

  if (/^https?:\/\//i.test(u)) return u

  return `https://${u}`

}



const hasAnyText = computed(() => {

  const i = info.value

  if (!i) return false

  return Boolean(

    (i.tzPointText || '').trim() ||

      (i.nmckPointText || '').trim() ||

      (i.tzSectionNumber || '').trim() ||

      (i.nmckFunctionNumber || '').trim() ||

      (i.jiraLink || '').trim(),

  )

})



async function reloadGkLink() {

  const id = props.requirementId

  if (!id) {

    info.value = null

    return

  }

  try {

    loading.value = true

    info.value = await fetchRequirementGKLink(id)

  } catch {

    info.value = null

  } finally {

    loading.value = false

  }

}



watch(

  () => [props.modelValue, props.requirementId] as const,

  async ([open, id]) => {

    if (!open || !id) {

      info.value = null

      editFnVisible.value = false

      return

    }

    await reloadGkLink()

  },

  { immediate: true },

)



async function onFunctionSaved() {

  await reloadGkLink()

  emit('updated')

  ElMessage.success('Функция обновлена')

}

</script>



<style scoped>

.tz-dialog-body {

  min-height: 80px;

}



.def-list {

  margin: 0;

  display: grid;

  gap: 14px;

}



.row {

  display: grid;

  gap: 4px;

}



dt {

  margin: 0;

  font-size: 12px;

  font-weight: 700;

  color: var(--app-text-muted, #5c6b7f);

  text-transform: none;

}



dd {

  margin: 0;

  font-size: 15px;

  line-height: 1.45;

  color: var(--app-text, #1a2332);

  white-space: pre-wrap;

  word-break: break-word;

}



.sub {

  font-size: 13px;

  color: #6b7280;

  margin-left: 6px;

}



.muted {

  color: #6b7280;

  font-size: 14px;

  line-height: 1.5;

}



.ext-link {

  color: #1e4d7b;

  word-break: break-all;

}



.tz-footer {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  justify-content: flex-end;

  width: 100%;

}

</style>

