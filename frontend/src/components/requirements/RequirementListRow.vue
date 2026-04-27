<template>
  <div
    class="requirements-list-row"
    :class="{
      'is-selected': isSelected,
      'is-archived-completed': row.isArchived && row.archivedReason === 'completed',
      'is-archived-outdated': row.isArchived && row.archivedReason !== 'completed',
    }"
    :style="{ gridTemplateColumns: columnsTemplate }"
    @click="emit('open')"
  >
    <div v-if="selectionMode" class="row-cell row-cell--checkbox" @click.stop>
      <button type="button" class="select-box" :class="{ 'is-active': isSelected }" @click="emit('toggle-select', !isSelected)">
        <span v-if="isSelected">✓</span>
      </button>
    </div>

    <div class="row-cell row-cell--center">{{ row.sequenceNumber || '—' }}</div>
    <div class="row-cell row-cell--center">
      <span class="id-chip">{{ row.taskIdentifier || `#${row.id}` }}</span>
    </div>
    <div class="row-cell"><span class="line-clamp-2">{{ row.shortName || '—' }}</span></div>
    <div class="row-cell row-cell--center"><span class="line-clamp-2">{{ row.initiator || '—' }}</span></div>
    <div class="row-cell"><span class="line-clamp-2">{{ row.responsiblePerson || '—' }}</span></div>
    <div class="row-cell"><span class="line-clamp-2">{{ row.sectionName || '—' }}</span></div>
    <div class="row-cell row-cell--center"><QueueTag :queue="row.implementationQueue" /></div>
    <div class="row-cell row-cell--center"><span class="line-clamp-2">{{ row.contractName || '—' }}</span></div>
    <div class="row-cell">
      <button
        type="button"
        class="tz-link line-clamp-2"
        :disabled="!tzCellLabel"
        @click.stop="emit('open-tz')"
      >
        {{ tzCellLabel || '—' }}
      </button>
    </div>
    <div class="row-cell row-cell--center"><StatusTag :status="row.statusText" /></div>
    <div class="row-cell row-cell--center">{{ systemTypeLabel(row.systemType) }}</div>
    <div class="row-cell"><span class="line-clamp-2">{{ ditLetterCell }}</span></div>
    <div class="row-cell"><span class="line-clamp-2">{{ row.proposalText || '—' }}</span></div>
    <div class="row-cell"><span class="line-clamp-2">{{ row.problemComment || '—' }}</span></div>
    <div class="row-cell row-cell--center">{{ formatDate(row.createdAt) }}</div>
    <div class="row-cell row-cell--center">{{ formatDate(row.completedAt) }}</div>
    <div class="row-cell row-cell--actions" @click.stop>
      <el-dropdown trigger="click" @command="(cmd: string) => emit('menu-command', cmd)">
        <el-button size="small" circle class="row-menu-trigger">
          <el-icon class="row-menu-ellipsis"><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="open">Просмотр</el-dropdown-item>
            <el-dropdown-item v-if="canDeleteRequirements" command="delete" divided>Удалить</el-dropdown-item>
            <el-dropdown-item v-if="canEdit && !row.isArchived" command="archive">В архив</el-dropdown-item>
            <el-dropdown-item v-if="canEdit && row.isArchived" command="restore">Восстановить</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
import QueueTag from '@/components/QueueTag.vue'
import StatusTag from '@/components/StatusTag.vue'
import { systemTypeLabel } from '@/constants/systemTypes'
import type { Requirement } from '@/types'

const props = defineProps<{
  row: Requirement
  columnsTemplate: string
  selectionMode: boolean
  isSelected: boolean
  canEdit: boolean
  canDeleteRequirements: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-select', checked: boolean): void
  (e: 'open'): void
  (e: 'open-tz'): void
  (e: 'menu-command', cmd: string): void
}>()

const tzCellLabel = computed(() => {
  const n = (props.row.nmckPointText || '').trim()
  const t = (props.row.tzPointText || '').trim()
  if (n && t) return `${n} · ${t}`
  return n || t || ''
})

const ditLetterCell = computed(() => {
  const num = (props.row.ditOutgoingNumber || '').trim()
  const d = props.row.ditOutgoingDate
  if (!num && !d) return '—'
  const dateStr = d ? new Date(d).toLocaleDateString('ru-RU') : ''
  return [num && `№ ${num}`, dateStr].filter(Boolean).join(', ')
})

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}
</script>

<style scoped>
.requirements-list-row {
  display: grid;
  align-items: center;
  min-height: 44px;
  border: 1px solid #e8eef6;
  border-left: 0;
  border-right: 0;
  border-radius: 0;
  border-bottom: 0;
  background: #fff;
  transition: border-color 0.14s ease, background-color 0.14s ease;
  cursor: pointer;
}

.requirements-list-row:hover {
  border-color: #c8d8ef;
  background: #f6faff;
}

.requirements-list-row.is-selected {
  background: #edf4ff;
  border-left: 3px solid #3b82f6;
}

.requirements-list-row.is-archived-completed {
  background: #dff5df;
}

.requirements-list-row.is-archived-outdated {
  background: #fff4cc;
}

.row-cell {
  padding: 6px 6px;
  font-size: 12.5px;
  color: #1f2937;
  border-right: 1px solid #f0f4fa;
  min-width: 0;
  display: flex;
  align-items: center;
}

.row-cell:last-child {
  border-right: 0;
}

.row-cell--center,
.row-cell--checkbox,
.row-cell--actions {
  justify-content: center;
  text-align: center;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  word-break: break-word;
}

.id-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  padding: 1px 5px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  background: #eef3f9;
  border: 1px solid #d6e1ee;
  line-height: 1.2;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.tz-link {
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  text-align: left;
  padding: 0;
  width: 100%;
  cursor: pointer;
}

.tz-link:disabled {
  color: #64748b;
  cursor: default;
}

.row-menu-trigger {
  opacity: 1;
}

.select-box {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 2px solid #c7d3e4;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

.select-box.is-active {
  background: #2563eb;
  border-color: #2563eb;
}
</style>
