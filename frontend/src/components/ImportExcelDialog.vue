<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="620px"
    @close="emit('update:modelValue', false)"
  >
    <div class="import-body">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="description"
      />

      <div class="file-block">
        <input type="file" accept=".xlsx" @change="handleFileChange" />
      </div>

      <div v-if="selectedFile" class="file-name">
        Выбран файл: <strong>{{ selectedFile.name }}</strong>
      </div>

      <el-card v-if="result" class="result-card">
        <div><strong>Добавлено:</strong> {{ result.created }}</div>
        <div><strong>Обновлено:</strong> {{ result.updated }}</div>
        <div><strong>Ошибок:</strong> {{ result.failed }}</div>

        <div v-if="result.errors?.length" class="errors-block">
          <strong>Детали:</strong>
          <ul>
            <li v-for="(error, index) in result.errors" :key="index">{{ error }}</li>
          </ul>
        </div>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Закрыть</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        Загрузить
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { importRequirementsFile, importTZPointsFile, type ImportResult } from '@/api/imports'

const props = defineProps<{
  modelValue: boolean
  mode: 'requirements' | 'tz'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'imported'): void
}>()

const loading = ref(false)
const selectedFile = ref<File | null>(null)
const result = ref<ImportResult | null>(null)

const title = computed(() =>
  props.mode === 'requirements' ? 'Импорт предложений из Excel' : 'Импорт пунктов ТЗ из Excel',
)

const description = computed(() =>
  props.mode === 'requirements'
    ? 'Загрузите .xlsx файл с предложениями. Идентификаторы задач будут присвоены автоматически.'
    : 'Загрузите .xlsx файл со справочником пунктов ТЗ.',
)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  selectedFile.value = file
  result.value = null
}

async function submit() {
  if (!selectedFile.value) {
    ElMessage.warning('Сначала выберите .xlsx файл')
    return
  }

  try {
    loading.value = true

    if (props.mode === 'requirements') {
      result.value = await importRequirementsFile(selectedFile.value)
    } else {
      result.value = await importTZPointsFile(selectedFile.value)
    }

    ElMessage.success('Импорт завершён')
    emit('imported')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка импорта')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.import-body {
  display: grid;
  gap: 16px;
}

.file-block {
  padding: 8px 0;
}

.file-name {
  color: #606266;
}

.result-card {
  margin-top: 8px;
}

.errors-block {
  margin-top: 12px;
}

.errors-block ul {
  margin: 8px 0 0;
  padding-left: 18px;
}
</style>