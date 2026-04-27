<template>
  <!-- Внешний слой: фон на всю ширину скролла + sticky; внутри — inset как у строк, чтобы колонки совпадали с `tableColumnsTemplate`. -->
  <div class="requirements-list-header-shell">
    <div class="requirements-list-header" :style="{ gridTemplateColumns: columnsTemplate }">
      <div v-if="selectionMode" class="head-cell head-cell--checkbox">
        <button type="button" class="select-box" :class="{ 'is-active': allSelected || someSelected }" @click="emit('toggle-all')">
          <span v-if="allSelected">✓</span>
          <span v-else-if="someSelected">—</span>
        </button>
      </div>

      <div class="head-cell head-cell--center">№</div>
      <div class="head-cell head-cell--center">ID</div>
      <div class="head-cell">Наименование</div>
      <div class="head-cell head-cell--center">Инициатор</div>
      <div class="head-cell">Ответственный</div>
      <div class="head-cell">Раздел</div>
      <div class="head-cell head-cell--center">Приоритет</div>
      <div class="head-cell head-cell--center">ГК</div>
      <div class="head-cell">Функция НМЦК, ТЗ</div>
      <div class="head-cell head-cell--center">Статус</div>
      <div class="head-cell head-cell--center">Система</div>
      <div class="head-cell">Письмо в ДИТ</div>
      <div class="head-cell">Предложение</div>
      <div class="head-cell">Комментарии и описание проблем</div>
      <div class="head-cell head-cell--center">Дата создания</div>
      <div class="head-cell head-cell--center">Дата выполнения</div>
      <div class="head-cell"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columnsTemplate: string
  selectionMode: boolean
  allSelected: boolean
  someSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-all'): void
}>()
</script>

<style scoped>
.requirements-list-header-shell {
  position: sticky;
  top: 0;
  z-index: 12;
  box-sizing: border-box;
  margin-left: calc(-1 * var(--requirements-table-h-inset, 0px));
  margin-right: calc(-1 * var(--requirements-table-h-inset, 0px));
  width: calc(100% + 2 * var(--requirements-table-h-inset, 0px));
  padding-left: var(--requirements-table-h-inset, 0px);
  padding-right: var(--requirements-table-h-inset, 0px);
  background: #f7faff;
  box-shadow: 0 1px 0 rgba(215, 225, 239, 0.95);
  border-top: 1px solid #d7e1ef;
  border-bottom: 1px solid #d7e1ef;
}

.requirements-list-header {
  display: grid;
  align-items: center;
  min-height: 38px;
  box-sizing: border-box;
  width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.head-cell {
  padding: 6px 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  /* Как у `.row-cell`, чтобы вертикали совпадали со строками */
  border-right: 1px solid #f0f4fa;
}

.head-cell:last-child {
  border-right: 0;
}

.head-cell--checkbox,
.head-cell--center {
  display: flex;
  align-items: center;
  justify-content: center;
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
