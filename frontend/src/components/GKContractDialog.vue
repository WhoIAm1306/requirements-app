<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? 'Добавить ГК' : 'Редактировать ГК'"
    width="720px"
    @close="emit('update:modelValue', false)"
  >
    <el-form label-position="top">
      <el-form-item label="Наименование ГК">
        <el-input v-model="form.name" />
      </el-form-item>

      <el-form-item label="Описание / главная информация">
        <el-input v-model="form.description" type="textarea" :rows="4" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Отмена</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        Сохранить
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createGKContract, updateGKContract } from '@/api/gkContracts'
import type { CreateGKContractPayload, GKContractDetails, UpdateGKContractPayload } from '@/types'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  initialContract: Pick<GKContractDetails, 'id' | 'name' | 'description'> | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const loading = defineModel<boolean>('loading', { default: false })

const emptyForm = (): CreateGKContractPayload => ({
  name: '',
  description: '',
})

const form = reactive<CreateGKContractPayload & UpdateGKContractPayload>({
  name: '',
  description: '',
})

watch(
  () => [props.modelValue, props.mode, props.initialContract],
  ([opened]) => {
    if (!opened) return

    if (props.mode === 'edit' && props.initialContract) {
      form.name = props.initialContract.name || ''
      form.description = props.initialContract.description || ''
      return
    }

    Object.assign(form, emptyForm())
  },
  { immediate: true },
)

async function submit() {
  try {
    loading.value = true

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || '',
    }

    if (props.mode === 'create') {
      await createGKContract(payload)
      ElMessage.success('ГК создан')
    } else if (props.initialContract) {
      await updateGKContract(props.initialContract.id, payload)
      ElMessage.success('ГК обновлён')
    }

    emit('saved')
    emit('update:modelValue', false)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения ГК')
  } finally {
    loading.value = false
  }
}
</script>

