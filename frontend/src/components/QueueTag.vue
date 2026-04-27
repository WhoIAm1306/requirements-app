<template>
  <span class="queue-tag" :class="queueClass">
    {{ queue || '—' }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  queue: string
}>()

const queueClass = computed(() => {
  const value = (props.queue || '').trim().toLowerCase()

  if (value.includes('1')) return 'queue-1'
  if (value.includes('2')) return 'queue-2'
  if (value.includes('3')) return 'queue-3'

  return 'queue-default'
})
</script>

<style scoped>
.queue-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  border: 0;
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: none;
}

.queue-1 {
  background: #f9dfe8;
  color: #8a4b5f;
}

.queue-2 {
  background: #fff4cc;
  color: #7e6220;
}

.queue-3 {
  background: #dff5df;
  color: #2f6d37;
}

.queue-default {
  background: #eef2f7;
  color: #556070;
}
</style>