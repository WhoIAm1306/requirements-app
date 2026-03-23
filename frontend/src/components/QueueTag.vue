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
  min-height: 15px;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid transparent;
}

.queue-1 {
  background: #f9dfe8;
  color: #8a4b5f;
  border-color: #f2c6d4;
}

.queue-2 {
  background: #fff4cc;
  color: #8a6d1f;
  border-color: #f3e3a2;
}

.queue-3 {
  background: #dff5df;
  color: #3f7a45;
  border-color: #c5e7c7;
}

.queue-default {
  background: #eef2f7;
  color: #556070;
  border-color: #dde3eb;
}
</style>