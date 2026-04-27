<template>
  <span class="status-tag" :class="statusClass">
    {{ status || 'Без статуса' }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusClass = computed(() => {
  const value = (props.status || '').trim().toLowerCase()

  if (value === 'новое') return 'status-new'
  if (value === 'подтверждено') return 'status-confirmed'
  if (value === 'требуется обсуждение') return 'status-discussion'
  if (value === 'учтено') return 'status-accounted'
  if (value === 'выполнено') return 'status-done'

  return 'status-default'
})
</script>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid transparent;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.status-new {
  background: #eef2f7;
  color: #556070;
  border-color: #d8e0ea;
}

.status-confirmed {
  background: #e6eefb;
  color: #1e4d7b;
  border-color: #c8d9f3;
}

.status-discussion {
  background: #fff4cc;
  color: #7e6220;
  border-color: #efd98f;
}

.status-accounted {
  background: #dff5df;
  color: #2f6d37;
  border-color: #b7dbbb;
}

.status-done {
  background: #d7f2e5;
  color: #21644c;
  border-color: #b8e3d1;
}

.status-default {
  background: #eef2f7;
  color: #556070;
  border-color: #d8e0ea;
}
</style>