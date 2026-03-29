<template>
  <el-tag :type="tagType" effect="light">
    {{ status || 'Без статуса' }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const tagType = computed(() => {
  const value = (props.status || '').trim().toLowerCase()

  if (value === 'в обработку') return 'warning'
  if (value === 'новое') return 'info'
  if (value === 'учтено') return 'success'
  if (value === 'выполнено') return 'primary'

  return 'info'
})
</script>