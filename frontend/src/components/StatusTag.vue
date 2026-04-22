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

  if (value === 'новое') return 'info'
  if (value === 'подтверждено') return 'primary'
  if (value === 'требуется обсуждение') return 'warning'
  if (value === 'учтено') return 'success'
  if (value === 'выполнено') return 'success'

  return 'info'
})
</script>