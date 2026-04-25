<template>
  <div class="page">
    <div class="page-shell">
      <!-- Шапка -->
      <div class="page-header page-header--dark">
        <div class="page-header-left page-header-left--dark">
          <div class="brand-pill">Учет предложений</div>
          <div class="header-filter-preset">
            <button
              type="button"
              class="header-filter-preset__btn"
              :class="{ 'is-active': listFilterPreset === 'all' }"
              @click="setListFilterPreset('all')"
            >
              Все
            </button>
            <button
              type="button"
              class="header-filter-preset__btn"
              :class="{ 'is-active': listFilterPreset === 'sys112' }"
              @click="setListFilterPreset('sys112')"
            >
              Система 112
            </button>
            <button
              type="button"
              class="header-filter-preset__btn"
              :class="{ 'is-active': listFilterPreset === 'sys101' }"
              @click="setListFilterPreset('sys101')"
            >
              Система 101
            </button>
            <button
              type="button"
              class="header-filter-preset__btn"
              :class="{ 'is-active': listFilterPreset === 'tel112' }"
              @click="setListFilterPreset('tel112')"
            >
              Телефония 112
            </button>
            <button
              type="button"
              class="header-filter-preset__btn"
              :class="{ 'is-active': listFilterPreset === 'tel101' }"
              @click="setListFilterPreset('tel101')"
            >
              Телефония 101
            </button>
          </div>
        </div>

        <div class="header-actions header-actions--dark">
          <div class="variant-switch variant-switch--right">
            <span class="variant-switch__label">Вариант:</span>
            <div class="variant-switch__group" role="tablist" aria-label="Вариант отображения">
              <button
                type="button"
                class="variant-switch__option"
                :class="{ 'is-active': viewMode === 'table' }"
                role="tab"
                :aria-selected="viewMode === 'table'"
                @click="setViewMode('table')"
              >
                A — Табличный
              </button>
              <button
                type="button"
                class="variant-switch__option"
                :class="{ 'is-active': viewMode === 'cards' }"
                role="tab"
                :aria-selected="viewMode === 'cards'"
                @click="setViewMode('cards')"
              >
                B — Карточный
              </button>
            </div>
          </div>
          <el-dropdown
            trigger="click"
            placement="bottom-end"
            @command="handleSectionsMenuCommand"
            @visible-change="handleSectionsDropdownVisibleChange"
          >
            <el-button class="sections-btn">
              Разделы
              <el-icon class="el-icon--right sections-btn__arrow" :class="{ 'is-open': sectionsDropdownOpen }">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="gk-directory">Справочник ГК</el-dropdown-item>
                <el-dropdown-item v-if="authStore.canAccessFunctionsDirectory" command="functions-directory">
                  Справочник функций
                </el-dropdown-item>
                <el-dropdown-item v-if="authStore.isSuperuser" command="admin-panel" divided>
                  Административная панель
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" placement="bottom-end" @command="handleUserMenuCommand">
            <button type="button" class="user-avatar-btn" :title="authStore.fullName">
              {{ userAvatarLetters }}
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">Профиль</el-dropdown-item>
                <el-dropdown-item command="change-password">Сменить пароль</el-dropdown-item>
                <el-dropdown-item divided command="logout">Выйти</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="registry-topbar">
        <div class="registry-topbar__left">
          <h1 class="registry-topbar__title">Реестр предложений</h1>
          <el-popover
            trigger="hover"
            placement="bottom-start"
            popper-class="summary-popover-popper"
            :popper-style="{
              width: 'fit-content',
              maxWidth: 'calc(100vw - 24px)',
            }"
          >
            <template #reference>
              <el-card class="summary-card summary-card--main summary-card--nav" shadow="hover">
                <div class="summary-main-inline">
                  <span class="summary-label summary-label--inline">Всего записей</span>
                  <span class="summary-value summary-value--inline">{{ items.length }}</span>
                </div>
              </el-card>
            </template>
            <div class="summary-popover-grid">
              <div class="summary-popover-row summary-popover-row--statuses">
                <el-card class="summary-card summary-card--mini status-card--new" shadow="hover">
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">Новое</span>
                    <span class="summary-value summary-value--inline">{{ countByStatus('Новое') }}</span>
                  </div>
                </el-card>
                <el-card class="summary-card summary-card--mini status-card--confirmed" shadow="hover">
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">Подтверждено</span>
                    <span class="summary-value summary-value--inline">{{ countByStatus('Подтверждено') }}</span>
                  </div>
                </el-card>
                <el-card class="summary-card summary-card--mini status-card--discussion" shadow="hover">
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">Требуется обсуждение</span>
                    <span class="summary-value summary-value--inline">
                      {{ countByStatus('Требуется обсуждение') }}
                    </span>
                  </div>
                </el-card>
                <el-card class="summary-card summary-card--mini status-card--accounted" shadow="hover">
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">Учтено</span>
                    <span class="summary-value summary-value--inline">{{ countByStatus('Учтено') }}</span>
                  </div>
                </el-card>
                <el-card class="summary-card summary-card--mini status-card--done" shadow="hover">
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">Выполнено</span>
                    <span class="summary-value summary-value--inline">{{ countByStatus('Выполнено') }}</span>
                  </div>
                </el-card>
              </div>
              <div class="summary-popover-row summary-popover-row--queues">
                <el-card
                  v-for="queue in queues"
                  :key="queue.id"
                  class="summary-card summary-card--mini"
                  :class="queueSummaryCardClass(queue.name)"
                  shadow="hover"
                >
                  <div class="summary-main-inline">
                    <span class="summary-label summary-label--inline">{{ queue.name }}</span>
                    <span class="summary-value summary-value--inline">{{ countByQueue(queue.name) }}</span>
                  </div>
                </el-card>
              </div>
            </div>
          </el-popover>
        </div>
        <div class="registry-topbar__right">
          <el-input
            v-model="search"
            placeholder="Поиск по реестру..."
            clearable
            class="registry-topbar__search"
          />
          <el-button v-if="canEdit" type="primary" class="registry-topbar__add-btn" @click="createDialogVisible = true">
            <el-icon><Plus /></el-icon>
            Добавить запись
          </el-button>
          <el-button class="registry-topbar__export-btn" @click="handleExport">Экспорт Excel</el-button>
          <el-dropdown trigger="click" placement="bottom-end" popper-class="header-tools-dropdown" @command="handleHeaderToolsCommand">
            <el-button class="registry-topbar__more-btn">...</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="canEdit || canDeleteRequirements" command="toggle-selection">
                  {{ selectionMode ? 'Завершить выделение' : 'Выделить' }}
                </el-dropdown-item>
                <el-dropdown-item v-if="canEdit" command="import">Импорт предложений</el-dropdown-item>
                <el-dropdown-item v-if="canEdit" command="template">Шаблон предложений (Excel)</el-dropdown-item>
                <el-dropdown-item command="print" divided>Печать реестра</el-dropdown-item>
                <el-dropdown-item command="history">Журнал изменений</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div v-if="!showToolbarPanel" class="toolbar-toggle-row">
        <el-button text size="small" @click="showToolbarPanel = !showToolbarPanel">
          Показать панель фильтров и действий
        </el-button>
      </div>

      <!-- Фильтры -->
      <el-card v-show="showToolbarPanel" class="toolbar-card toolbar-card--scaled" shadow="never">
        <div class="toolbar-row">
          <div class="toolbar-left">
            <div class="main-filters">
            </div>

            <div class="filters-row-compact">
              <span class="filters-row-compact__label">
                <svg
                  class="filters-row-compact__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <line x1="21" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <line x1="10" y1="6" x2="3" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <line x1="21" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <line x1="8" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <line x1="21" y1="18" x2="16" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <line x1="12" y1="18" x2="3" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="2" />
                  <circle cx="10" cy="12" r="2" stroke="currentColor" stroke-width="2" />
                  <circle cx="14" cy="18" r="2" stroke="currentColor" stroke-width="2" />
                </svg>
                Фильтры:
              </span>
              <el-select
                v-model="status"
                placeholder="Статус"
                clearable
                filterable
                allow-create
                default-first-option
                class="status-select filters-row-compact__select"
              >
                <el-option
                  v-for="s in STANDARD_REQUIREMENT_STATUSES"
                  :key="s"
                  :label="s"
                  :value="s"
                />
              </el-select>

              <el-select
                v-model="implementationQueue"
                placeholder="Приоритет"
                clearable
                class="queue-select filters-row-compact__select"
              >
                <el-option
                  v-for="queue in queues"
                  :key="queue.id"
                  :label="queue.name"
                  :value="queue.name"
                />
              </el-select>

              <el-select
                v-model="archiveFilterMode"
                placeholder="Записи"
                class="archive-filter-select filters-row-compact__select"
              >
                <el-option label="Только активные" value="active" />
                <el-option label="Активные и архив" value="all" />
                <el-option label="Только архивные" value="archived_only" />
              </el-select>

              <label class="sequence-sort-toggle">
                <span class="sequence-sort-toggle__label">Сначала ранние</span>
                <el-switch v-model="sequenceSortAsc" class="sequence-sort-switch" />
              </label>

              <label class="filter-no-fn-toggle">
                <span class="filter-no-fn-toggle__label">Без функций</span>
                <el-switch v-model="filterNoFunction" class="filter-no-fn-switch" />
              </label>

              <el-tooltip content="Сбросить фильтры" placement="top">
                <el-button class="reset-filters-btn" circle size="small" @click="resetFilters">
                  <el-icon><Close /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <div v-if="selectionMode" class="selection-actions-row">
              <el-button
                v-if="canEdit"
                type="warning"
                plain
                :disabled="selectedRows.length === 0"
                @click="handleArchiveSelected"
              >
                В архив ({{ selectedRows.length }})
              </el-button>
              <el-button
                v-if="canEdit"
                type="info"
                plain
                :disabled="selectedRows.length === 0"
                @click="handleUnlinkGKSelected"
              >
                Отвязать ГК ({{ selectedRows.length }})
              </el-button>
              <el-button
                v-if="canDeleteRequirements"
                type="danger"
                plain
                :disabled="selectedRows.length === 0"
                @click="handleDeleteSelected"
              >
                Удалить ({{ selectedRows.length }})
              </el-button>
              <el-button @click="exitSelectionMode">Готово</el-button>
            </div>
          </div>

        </div>
        <div class="toolbar-footer-toggle">
          <el-button text size="small" @click="showToolbarPanel = false">
            Скрыть
          </el-button>
        </div>
      </el-card>

      <!-- Таблица: пагинация на клиенте — в DOM только текущая страница (быстрее, чем сотни строк) -->
      <el-card class="table-card" shadow="never">
        <div class="table-stack">
          <template v-if="viewMode === 'table'">
          <div
            class="table-header-scroll"
            ref="tableHeaderScrollRef"
            :style="{ paddingRight: `${tableBodyScrollbarWidth}px` }"
            aria-hidden="true"
          >
            <div class="table-width-box" :style="{ width: `${tableWidth}px` }">
              <div class="requirements-header-sticky">
                <table class="requirements-header-table" aria-hidden="true">
                  <colgroup>
                    <col v-if="selectionMode" style="width: 48px" />
                    <col style="width: 56px" />
                    <col style="width: 150px" />
                    <col style="width: 330px" />
                    <col style="width: 180px" />
                    <col style="width: 200px" />
                    <col style="width: 130px" />
                    <col style="width: 120px" />
                    <col style="width: 190px" />
                    <col style="width: 280px" />
                    <col style="width: 150px" />
                    <col style="width: 130px" />
                    <col style="width: 200px" />
                    <col style="width: 520px" />
                    <col style="width: 400px" />
                    <col style="width: 128px" />
                    <col style="width: 128px" />
                    <col style="width: 64px" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th v-if="selectionMode"></th>
                      <th>№</th>
                      <th>ID</th>
                      <th>Наименование</th>
                      <th>Инициатор</th>
                      <th>Ответственный</th>
                      <th>Раздел</th>
                      <th>Приоритет</th>
                      <th>ГК</th>
                      <th>Функция НМЦК, ТЗ</th>
                      <th>Статус</th>
                      <th>Система</th>
                      <th>Письмо в ДИТ</th>
                      <th>Предложение</th>
                      <th>Комментарии и описание проблем</th>
                      <th>Дата создания</th>
                      <th>Дата выполнения</th>
                      <th></th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </div>

          <div
            class="table-header-scroll"
            ref="tableHeaderScrollRef"
            :style="{ paddingRight: `${tableBodyScrollbarWidth}px` }"
            aria-hidden="true"
          >
            <div class="table-width-box" :style="{ width: `${tableWidth}px` }">
              <div class="requirements-header-sticky">
                <table class="requirements-header-table" aria-hidden="true">
                  <colgroup>
                    <col v-if="selectionMode" style="width: 48px" />
                    <col style="width: 56px" />
                    <col style="width: 150px" />
                    <col style="width: 330px" />
                    <col style="width: 180px" />
                    <col style="width: 200px" />
                    <col style="width: 130px" />
                    <col style="width: 120px" />
                    <col style="width: 190px" />
                    <col style="width: 280px" />
                    <col style="width: 150px" />
                    <col style="width: 130px" />
                    <col style="width: 200px" />
                    <col style="width: 520px" />
                    <col style="width: 400px" />
                    <col style="width: 128px" />
                    <col style="width: 128px" />
                    <col style="width: 64px" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th v-if="selectionMode"></th>
                      <th>№</th>
                      <th>ID</th>
                      <th>Наименование</th>
                      <th>Инициатор</th>
                      <th>Ответственный</th>
                      <th>Раздел</th>
                      <th>Приоритет</th>
                      <th>ГК</th>
                      <th>Функция НМЦК, ТЗ</th>
                      <th>Статус</th>
                      <th>Система</th>
                      <th>Письмо в ДИТ</th>
                      <th>Предложение</th>
                      <th>Комментарии и описание проблем</th>
                      <th>Дата создания</th>
                      <th>Дата выполнения</th>
                      <th></th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </div>

          <div
            v-loading="loading"
            class="table-horizontal-wrap"
            ref="tableBodyScrollRef"
            @scroll.passive="syncHeaderScroll"
            element-loading-background="rgba(255, 255, 255, 0.72)"
          >
            <div class="table-width-box" :style="{ width: `${tableWidth}px` }">
              <el-table
                ref="tableRef"
                class="requirements-table"
                :class="{ 'drag-selecting': dragSelectionActive }"
                :data="pagedItems"
                @row-click="handleRowClick"
                @selection-change="handleSelectionChange"
                @cell-mouse-enter="handleCellMouseEnter"
                row-key="id"
                stripe
                border
                empty-text="Нет предложений по выбранным условиям"
                :row-class-name="getRowClassName"
                table-layout="fixed"
                :fit="false"
                :show-header="false"
                :style="{ width: `${tableWidth}px` }"
              >
                <el-table-column v-if="selectionMode" type="selection" width="48" />
                <el-table-column
                  prop="sequenceNumber"
                  label="№"
                  width="56"
                  class-name="sequence-col"
                />
                <el-table-column prop="taskIdentifier" label="ID" width="150" />

                <el-table-column
                  prop="shortName"
                  label="Наименование"
                  width="330"
                  show-overflow-tooltip
                />

                <el-table-column
                  prop="initiator"
                  label="Инициатор"
                  width="180"
                  show-overflow-tooltip
                />

                <el-table-column
                  prop="responsiblePerson"
                  label="Ответственный"
                  width="200"
                  show-overflow-tooltip
                />

                <el-table-column
                  prop="sectionName"
                  label="Раздел"
                  width="130"
                  show-overflow-tooltip
                />

                <el-table-column prop="implementationQueue" label="Приоритет" width="120">
                  <template #default="{ row }">
                    <QueueTag :queue="row.implementationQueue" />
                  </template>
                </el-table-column>

                <el-table-column label="ГК" width="190" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span class="gk-cell">
                      {{ row.contractName || '—' }}
                      <span
                        v-if="row.contractUseShortNameInTaskId && (row.contractShortName || '').trim()"
                        class="gk-short-hint"
                      >
                        ({{ row.contractShortName }})
                      </span>
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="Функция НМЦК, ТЗ" width="280" class-name="tz-col">
                  <template #default="{ row }">
                    <button
                      type="button"
                      class="tz-cell-link"
                      :disabled="!tzCellLabel(row)"
                      :title="tzCellLabel(row) || undefined"
                      @click.stop="openTzInfo(row)"
                    >
                      {{ tzCellLabel(row) || '—' }}
                    </button>
                  </template>
                </el-table-column>

                <el-table-column prop="statusText" label="Статус" width="150">
                  <template #default="{ row }">
                    <StatusTag :status="row.statusText" />
                  </template>
                </el-table-column>

                <el-table-column label="Система" width="130">
                  <template #default="{ row }">
                    {{ systemTypeLabel(row.systemType) }}
                  </template>
                </el-table-column>

                <el-table-column label="Письмо в ДИТ" width="200" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ ditLetterCell(row) }}
                  </template>
                </el-table-column>

                <el-table-column label="Предложение" width="520">
                  <template #default="{ row }">
                    <span class="cell-clamp" :title="row.proposalText">
                      {{ shortText(row.proposalText, 90) }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="Комментарии и описание проблем" width="400">
                  <template #default="{ row }">
                    <span class="cell-clamp" :title="row.problemComment">
                      {{ shortText(row.problemComment, 90) }}
                    </span>
                  </template>
                </el-table-column>

                <el-table-column label="Дата создания" width="128">
                  <template #default="{ row }">
                    {{ formatTableDate(row.createdAt) }}
                  </template>
                </el-table-column>

                <el-table-column label="Дата выполнения" width="128">
                  <template #default="{ row }">
                    {{ formatTableDate(row.completedAt) }}
                  </template>
                </el-table-column>

                <el-table-column
                  label=""
                  width="64"
                  align="center"
                  class-name="row-menu-col"
                >
                  <template #default="{ row }">
                    <el-dropdown trigger="click" @command="(cmd: string) => handleRowMenuCommand(cmd, row)">
                      <el-button size="small" circle class="row-menu-trigger" @click.stop>
                        <el-icon class="row-menu-ellipsis"><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="open">Просмотр</el-dropdown-item>
                          <template v-if="canDeleteRequirements">
                            <el-dropdown-item command="delete" divided>Удалить</el-dropdown-item>
                          </template>
                          <template v-if="canEdit">
                            <el-dropdown-item v-if="!row.isArchived" command="archive">
                              В архив
                            </el-dropdown-item>
                            <el-dropdown-item v-else command="restore">Восстановить</el-dropdown-item>
                          </template>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          <div v-if="items.length > 0" class="table-pagination-panel">
            <div class="table-pagination">
              <el-pagination
                v-model:current-page="tablePage"
                v-model:page-size="tablePageSize"
                :page-sizes="[25, 50, 100, 200]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="items.length"
                size="small"
                background
              />
            </div>
          </div>
          </template>

          <template v-else>
            <div v-loading="loading" class="cards-wrap">
              <div v-if="pagedItems.length > 0" class="requirements-cards-grid">
                <article
                  v-for="row in pagedItems"
                  :key="row.id"
                  class="requirement-list-card"
                  :class="[
                    cardToneClass(row),
                    {
                      'requirement-list-card--archived-completed': row.isArchived && row.archivedReason === 'completed',
                      'requirement-list-card--archived-outdated': row.isArchived && row.archivedReason !== 'completed',
                    },
                  ]"
                  @click="handleCardClick(row)"
                >
                  <div class="requirement-list-card__head">
                    <div class="requirement-list-card__id-wrap">
                      <span class="requirement-list-card__status-dot" :class="cardStatusDotClass(row.statusText)" />
                      <div class="requirement-list-card__id">{{ row.taskIdentifier || `#${row.id}` }}</div>
                    </div>
                    <div class="requirement-list-card__head-tags">
                      <QueueTag :queue="row.implementationQueue" />
                      <StatusTag :status="row.statusText" />
                    </div>
                  </div>
                  <div class="requirement-list-card__title">{{ row.shortName || 'Без наименования' }}</div>
                  <div class="requirement-list-card__meta">
                    <span>Приоритет: <strong>{{ row.implementationQueue || '—' }}</strong></span>
                    <span>Система: <strong>{{ systemTypeLabel(row.systemType) }}</strong></span>
                  </div>
                  <div class="requirement-list-card__meta">
                    <span>ГК: <strong>{{ row.contractName || '—' }}</strong></span>
                  </div>
                  <div class="requirement-list-card__text">{{ shortText(row.proposalText, 180) || '—' }}</div>
                  <div class="requirement-list-card__footer">
                    <span class="requirement-list-card__date">Создано: {{ formatTableDate(row.createdAt) }}</span>
                    <span class="requirement-list-card__open">Открыть</span>
                  </div>
                  <label v-if="selectionMode" class="requirement-list-card__select" @click.stop>
                    <input
                      type="checkbox"
                      :checked="isRowSelected(row.id)"
                      @change="toggleCardSelection(row, ($event.target as HTMLInputElement).checked)"
                    />
                  </label>
                </article>
              </div>
              <el-empty v-else description="Нет предложений по выбранным условиям" />
            </div>
            <div v-if="items.length > 0" class="table-pagination-panel">
              <div class="table-pagination">
                <el-pagination
                  v-model:current-page="tablePage"
                  v-model:page-size="tablePageSize"
                  :page-sizes="[25, 50, 100, 200]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="items.length"
                  size="small"
                  background
                />
              </div>
            </div>
          </template>
        </div>
      </el-card>

      <!-- Модалки -->
      <RequirementFormDialog
        v-if="canEdit"
        v-model="createDialogVisible"
        v-model:loading="createLoading"
        @saved="loadData"
      />

      <RequirementDetailsDrawer
        v-model="detailsVisible"
        :requirement-id="selectedRequirementId"
        @updated="loadData"
        @deleted="onRequirementDeletedFromDrawer"
      />

      <ImportExcelDialog
        v-if="canEdit"
        v-model="importRequirementsVisible"
        mode="requirements"
        @imported="loadData"
      />

      <ProfileDrawer v-model="profileDrawerVisible" />

      <RequirementTzInfoDialog
        v-model="tzInfoVisible"
        :requirement-id="tzInfoRequirementId"
        :can-edit="canEdit"
        @updated="loadData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Close, MoreFilled, Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  type ArchiveRequirementReason,
  archiveRequirement,
  deleteAllRequirements,
  deleteRequirement,
  exportRequirementsFile,
  fetchRequirements,
  restoreRequirement,
  unlinkRequirementGK,
} from '@/api/requirements'
import { fetchQueues } from '@/api/queues'
import { debounce } from '@/utils/debounce'
import { downloadRequirementsTemplate } from '@/utils/excelTemplates'
import RequirementFormDialog from '@/components/RequirementFormDialog.vue'
import RequirementDetailsDrawer from '@/components/RequirementDetailsDrawer.vue'
import ImportExcelDialog from '@/components/ImportExcelDialog.vue'
import ProfileDrawer from '@/components/ProfileDrawer.vue'
import RequirementTzInfoDialog from '@/components/RequirementTzInfoDialog.vue'
import StatusTag from '@/components/StatusTag.vue'
import QueueTag from '@/components/QueueTag.vue'
import { STANDARD_REQUIREMENT_STATUSES } from '@/constants/requirementStatuses'
import { systemTypeLabel } from '@/constants/systemTypes'
import type { QueueItem, Requirement } from '@/types'

/**
 * Router для переходов между страницами.
 */
const router = useRouter()

/**
 * Текущий пользователь из store.
 */
const authStore = useAuthStore()

/**
 * Пользователь может изменять данные только если у него edit или superuser.
 */
const canEdit = computed(() => authStore.isSuperuser || authStore.accessLevel === 'edit')
const canDeleteRequirements = computed(() => authStore.canDeleteRequirements)

/**
 * Состояния страницы.
 */
const loading = ref(false)
const deleteAllLoading = ref(false)
const createLoading = ref(false)
const createDialogVisible = ref(false)
const detailsVisible = ref(false)
const profileDrawerVisible = ref(false)
const importRequirementsVisible = ref(false)
const selectedRequirementId = ref<number | null>(null)
const selectedRows = ref<Requirement[]>([])
const tzInfoVisible = ref(false)
const tzInfoRequirementId = ref<number | null>(null)
const tableRef = ref<any>(null)
const selectionMode = ref(false)
const dragSelectionActive = ref(false)
const dragSelectionChecked = ref(false)
const dragVisitedRowIds = new Set<number>()

const archiveFilterMode = ref<'active' | 'all' | 'archived_only'>('active')
const DEFAULT_QUEUE_NAME = 'Не определена'

/**
 * Основные данные таблицы и справочники.
 */
const items = shallowRef<Requirement[]>([])
const queues = ref<QueueItem[]>([])

/** Сумма ширин колонок (table-layout: fixed). */
const tableWidthBase = 3356
const tableWidth = computed(() => tableWidthBase + (selectionMode.value ? 48 : 0))
/** Клиентская пагинация: меньше узлов в DOM → отзывчивее интерфейс. */
const tablePage = ref(1)
const tablePageSize = ref(50)
const showToolbarPanel = ref(true)
const viewMode = ref<'table' | 'cards'>('table')

const pagedItems = computed(() => {
  const list = [...items.value].sort(compareRequirementsBySequence)
  const start = (tablePage.value - 1) * tablePageSize.value
  return list.slice(start, start + tablePageSize.value)
})

const tableHeaderScrollRef = ref<HTMLElement | null>(null)
const tableBodyScrollRef = ref<HTMLElement | null>(null)
const tableBodyScrollbarWidth = ref(0)

function syncHeaderScrollbarCompensation() {
  if (!tableBodyScrollRef.value) return
  tableBodyScrollbarWidth.value =
    tableBodyScrollRef.value.offsetWidth - tableBodyScrollRef.value.clientWidth
}

function syncHeaderScroll() {
  if (!tableHeaderScrollRef.value || !tableBodyScrollRef.value) return
  tableHeaderScrollRef.value.scrollLeft = tableBodyScrollRef.value.scrollLeft
}

/**
 * Фильтры списка.
 */
type ListFilterPreset = 'all' | 'sys112' | 'sys101' | 'tel112' | 'tel101'

const search = ref('')
const status = ref('')
const listFilterPreset = ref<ListFilterPreset>('all')
const implementationQueue = ref('')

const filterNoFunction = ref(false)
const sequenceSortAsc = ref(false)
const sectionsDropdownOpen = ref(false)


let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

/** Счётчик запросов списка: отбрасываем устаревшие ответы при гонке поиска и фильтров. */
let loadListSeq = 0

/** Перезагрузка списка после смены фильтров без лишних запросов подряд */
const debouncedReloadList = debounce(() => {
  void loadData()
}, 120)

async function askArchiveReason(): Promise<ArchiveRequirementReason | null> {
  try {
    await ElMessageBox.confirm(
      'Выберите причину архивации: предложение выполнено или больше не актуально?',
      'Причина архивации',
      {
        type: 'warning',
        confirmButtonText: 'Выполнено',
        cancelButtonText: 'Не актуально',
        distinguishCancelAndClose: true,
      },
    )
    return 'completed'
  } catch (error: any) {
    if (error === 'cancel') return 'outdated'
    return null
  }
}

function clearSearchDebounce() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

const userAvatarLetters = computed(() => {
  const name = (authStore.fullName || '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

/**
 * Укорачиваем длинные тексты для таблицы.
 */
function shortText(value: string, maxLength = 80) {
  const text = (value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function compareRequirementsBySequence(a: Requirement, b: Requirement) {
  const sequenceDiff = (a.sequenceNumber || 0) - (b.sequenceNumber || 0)
  if (sequenceDiff !== 0) return sequenceSortAsc.value ? sequenceDiff : -sequenceDiff
  const idDiff = (a.id || 0) - (b.id || 0)
  if (idDiff !== 0) return sequenceSortAsc.value ? idDiff : -idDiff
  return 0
}

function listFilterQuery(): { systemType?: string; telephonySection?: 'true' | 'false' } {
  switch (listFilterPreset.value) {
    case 'all':
      return {}
    case 'sys112':
      return { systemType: '112', telephonySection: 'false' }
    case 'sys101':
      return { systemType: '101', telephonySection: 'false' }
    case 'tel112':
      return { systemType: '112', telephonySection: 'true' }
    case 'tel101':
      return { systemType: '101', telephonySection: 'true' }
  }
}

function setListFilterPreset(p: ListFilterPreset) {
  listFilterPreset.value = p
  clearSearchDebounce()
  debouncedReloadList()
}

function formatTableDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function ditLetterCell(row: Requirement) {
  const num = (row.ditOutgoingNumber || '').trim()
  const d = row.ditOutgoingDate
  if (!num && !d) return '—'
  const dateStr = d ? new Date(d).toLocaleDateString('ru-RU') : ''
  return [num && `№ ${num}`, dateStr].filter(Boolean).join(', ')
}

function exportFileBaseName() {
  switch (listFilterPreset.value) {
    case 'all':
      return 'Все требования'
    case 'sys112':
      return 'Требования 112'
    case 'sys101':
      return 'Требования 101'
    case 'tel112':
      return 'Требования Телефония 112'
    case 'tel101':
      return 'Требования Телефония 101'
  }
}

function buildExportFileName() {
  const now = new Date()
  const d = now.toLocaleDateString('ru-RU').replace(/\./g, '-')
  const t = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-')
  const raw = `${exportFileBaseName()} - ${d} - ${t}.xlsx`
  return raw.replace(/[/\\?%*:|"<>]/g, '-')
}

/**
 * Полный сброс фильтров.
 */
function resetFilters() {
  search.value = ''
  status.value = ''
  listFilterPreset.value = 'all'
  archiveFilterMode.value = 'active'
  implementationQueue.value = ''
  filterNoFunction.value = false
  sequenceSortAsc.value = false
  tablePage.value = 1
  clearSearchDebounce()
  loadData()
}

/**
 * Подсчёт записей по статусу.
 */
function countByStatus(statusName: string) {
  return items.value.filter((item) => (item.statusText || '').trim() === statusName).length
}

/**
 * Подсчёт записей по очереди.
 */
function countByQueue(queueName: string) {
  return items.value.filter((item) => (item.implementationQueue || '').trim() === queueName).length
}

function queueSummaryCardClass(queueName: string) {
  const value = (queueName || '').trim().toLowerCase()
  if (value.includes('1')) return 'queue-card--1'
  if (value.includes('2')) return 'queue-card--2'
  if (value.includes('3')) return 'queue-card--3'
  return 'queue-card--default'
}

/**
 * Загрузка очередей.
 */
async function loadQueues() {
  try {
    const loaded = await fetchQueues()
    if (loaded.some((q) => (q.name || '').trim() === DEFAULT_QUEUE_NAME)) {
      queues.value = loaded
    } else {
      queues.value = [
        { id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' },
        ...loaded,
      ]
    }
  } catch {
    queues.value = [{ id: 0, number: 0, name: DEFAULT_QUEUE_NAME, isActive: true, createdAt: '' }]
  }
}

/**
 * Загрузка таблицы.
 */
function archiveQueryParams() {
  const mode = archiveFilterMode.value
  if (mode === 'archived_only') {
    return { archivedOnly: true as const }
  }
  if (mode === 'all') {
    return { includeArchived: true as const }
  }
  return {}
}

async function loadData() {
  const seq = ++loadListSeq
  loading.value = true
  try {
    const arch = archiveQueryParams()
    const lf = listFilterQuery()
    const data = await fetchRequirements({
      ...lf,
      status: status.value || undefined,
      search: search.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
      noFunction: filterNoFunction.value || undefined,
      sortOrder: sequenceSortAsc.value ? 'asc' : 'desc',
      ...arch,
    })
    if (seq !== loadListSeq) return
    items.value = data
    selectedRows.value = []
    tableRef.value?.clearSelection?.()
    tablePage.value = 1
    await nextTick()
    syncHeaderScrollbarCompensation()
    syncHeaderScroll()
  } catch (error: any) {
    if (seq !== loadListSeq) return
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки')
  } finally {
    if (seq === loadListSeq) loading.value = false
  }
}

/**
 * Экспорт Excel.
 */
async function handleExport() {
  try {
    const arch = archiveQueryParams()
    const lf = listFilterQuery()
    const blob = await exportRequirementsFile({
      ...lf,
      status: status.value || undefined,
      search: search.value || undefined,
      implementationQueue: implementationQueue.value || undefined,
      noFunction: filterNoFunction.value || undefined,
      sortOrder: sequenceSortAsc.value ? 'asc' : 'desc',
      ...arch,
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildExportFileName()
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка экспорта')
  }
}

/**
 * Архивирование записи.
 */
async function handleArchive(row: Requirement) {
  const reason = await askArchiveReason()
  if (!reason) return
  try {
    await archiveRequirement(row.id, reason)
    ElMessage.success('Запись отправлена в архив')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка архивирования')
  }
}

function handleSelectionChange(rows: Requirement[]) {
  selectedRows.value = rows
}

function isSelectionColumn(column: any) {
  return column?.type === 'selection' || column?.columnKey === 'selection'
}

function isRowSelected(id: number) {
  return selectedRows.value.some((row) => row.id === id)
}

function applyDragSelection(row: Requirement) {
  if (dragVisitedRowIds.has(row.id)) return
  dragVisitedRowIds.add(row.id)
  tableRef.value?.toggleRowSelection?.(row, dragSelectionChecked.value)
}

function exitSelectionMode() {
  selectionMode.value = false
  selectedRows.value = []
  dragSelectionActive.value = false
  dragVisitedRowIds.clear()
  tableRef.value?.clearSelection?.()
}

function setViewMode(mode: 'table' | 'cards') {
  if (selectionMode.value) {
    exitSelectionMode()
  }
  viewMode.value = mode
}

function handleCardClick(row: Requirement) {
  if (selectionMode.value) return
  selectedRequirementId.value = row.id
  detailsVisible.value = true
}

function toggleCardSelection(row: Requirement, checked: boolean) {
  const next = new Set(selectedRows.value.map((x) => x.id))
  if (checked) next.add(row.id)
  else next.delete(row.id)
  selectedRows.value = items.value.filter((x) => next.has(x.id))
}

function normalizeStatusName(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function cardStatusDotClass(statusText: string) {
  const v = normalizeStatusName(statusText)
  if (v.includes('выполн')) return 'is-done'
  if (v.includes('подтвержд')) return 'is-confirmed'
  if (v.includes('обсужд')) return 'is-discussion'
  if (v.includes('учтен')) return 'is-accounted'
  return 'is-new'
}

function cardToneClass(row: Requirement) {
  if (row.isArchived) {
    return row.archivedReason === 'completed'
      ? 'requirement-list-card--tone-completed'
      : 'requirement-list-card--tone-outdated'
  }
  const v = normalizeStatusName(row.statusText || '')
  if (v.includes('выполн')) return 'requirement-list-card--tone-done'
  if (v.includes('обсужд')) return 'requirement-list-card--tone-discussion'
  if (v.includes('подтвержд')) return 'requirement-list-card--tone-confirmed'
  if (v.includes('учтен')) return 'requirement-list-card--tone-accounted'
  return 'requirement-list-card--tone-new'
}

function handleCellMouseEnter(row: Requirement, column: any, _cell: HTMLElement, event: MouseEvent) {
  if (!selectionMode.value) return
  if (event.buttons !== 1) return
  if (!isSelectionColumn(column)) return
  if (!dragSelectionActive.value) {
    dragSelectionActive.value = true
    dragVisitedRowIds.clear()
    dragSelectionChecked.value = !isRowSelected(row.id)
  }
  applyDragSelection(row)
}

function handleDragSelectionStop() {
  dragSelectionActive.value = false
  dragVisitedRowIds.clear()
}

async function handleArchiveSelected() {
  const rows = selectedRows.value.filter((row) => !row.isArchived)
  if (!rows.length) {
    ElMessage.info('Для архивации выберите хотя бы одну активную запись')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Перенести в архив выбранные записи: ${rows.length} шт.?`,
      'Массовая архивация',
      {
        type: 'warning',
        confirmButtonText: 'В архив',
        cancelButtonText: 'Отмена',
      },
    )
  } catch {
    return
  }
  const reason = await askArchiveReason()
  if (!reason) return
  try {
    await Promise.all(rows.map((row) => archiveRequirement(row.id, reason)))
    ElMessage.success(`В архив отправлено: ${rows.length}`)
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка массовой архивации')
  }
}

/**
 * Восстановление записи.
 */
async function handleRestore(row: Requirement) {
  try {
    await restoreRequirement(row.id)
    ElMessage.success('Запись восстановлена')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка восстановления')
  }
}

/**
 * Выход.
 */
function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function handleUserMenuCommand(cmd: string) {
  if (cmd === 'profile') {
    profileDrawerVisible.value = true
    return
  }
  if (cmd === 'change-password') {
    profileDrawerVisible.value = true
    ElMessage.info('Смена пароля доступна в разделе профиля')
    return
  }
  if (cmd === 'logout') {
    handleLogout()
  }
}

function handleSectionsMenuCommand(cmd: string) {
  if (cmd === 'gk-directory') {
    router.push('/gk-directory')
    return
  }
  if (cmd === 'functions-directory') {
    router.push('/functions-directory')
    return
  }
  if (cmd === 'admin-panel') {
    router.push('/admin/users')
  }
}

function handleSectionsDropdownVisibleChange(visible: boolean) {
  sectionsDropdownOpen.value = visible
}

function handleHeaderToolsCommand(cmd: string) {
  if (cmd === 'columns') {
    ElMessage.info('Настройка столбцов будет доступна в следующем обновлении')
    return
  }
  if (cmd === 'save-filters') {
    ElMessage.success('Текущие фильтры сохранены локально в рамках сессии')
    return
  }
  if (cmd === 'print') {
    window.print()
    return
  }
  if (cmd === 'history') {
    ElMessage.info('Журнал изменений будет подключен после интеграции')
    return
  }
  handleImportMenuCommand(cmd)
}

function handleImportMenuCommand(cmd: string) {
  if (cmd === 'toggle-selection') {
    if (!canEdit.value && !canDeleteRequirements.value) {
      ElMessage.warning('Недостаточно прав для режима выделения')
      return
    }
    if (selectionMode.value) {
      exitSelectionMode()
    } else {
      selectionMode.value = true
      selectedRows.value = []
      tableRef.value?.clearSelection?.()
    }
    return
  }
  if (cmd === 'import') {
    importRequirementsVisible.value = true
    return
  }
  if (cmd === 'template') {
    downloadRequirementsTemplate()
  }
}

function tzCellLabel(row: Requirement) {
  const n = (row.nmckPointText || '').trim()
  const t = (row.tzPointText || '').trim()
  if (n && t) return `${n} · ${t}`
  return n || t || ''
}

function openTzInfo(row: Requirement) {
  if (!tzCellLabel(row)) return
  tzInfoRequirementId.value = row.id
  tzInfoVisible.value = true
}

async function handleDelete(row: Requirement) {
  if (!canDeleteRequirements.value) {
    ElMessage.warning('Недостаточно прав для удаления предложений')
    return
  }
  try {
    await ElMessageBox.confirm(
      'Удалить запись? Она исчезнет из списков. Это не архив: архивные записи можно фильтром «Только архивные».',
      'Удаление предложения',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
  } catch {
    return
  }
  try {
    await deleteRequirement(row.id)
    ElMessage.success('Запись удалена')
    if (selectedRequirementId.value === row.id) {
      detailsVisible.value = false
      selectedRequirementId.value = null
    }
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления')
  }
}

async function handleDeleteSelected() {
  if (!canDeleteRequirements.value) {
    ElMessage.warning('Недостаточно прав для удаления предложений')
    return
  }
  const rows = selectedRows.value
  if (!rows.length) {
    ElMessage.info('Выберите записи для удаления')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Удалить выбранные записи: ${rows.length} шт.? Это действие нельзя отменить.`,
      'Массовое удаление',
      {
        type: 'error',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  try {
    await Promise.all(rows.map((row) => deleteRequirement(row.id)))
    ElMessage.success(`Удалено записей: ${rows.length}`)
    if (selectedRequirementId.value && rows.some((row) => row.id === selectedRequirementId.value)) {
      detailsVisible.value = false
      selectedRequirementId.value = null
    }
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка массового удаления')
  }
}

async function handleUnlinkGKSelected() {
  if (!canEdit.value) {
    ElMessage.warning('Недостаточно прав для отвязки ГК')
    return
  }
  const rows = selectedRows.value.filter((row) => (row.contractName || '').trim() !== '' || row.contractTZFunctionId)
  if (!rows.length) {
    ElMessage.info('Среди выбранных записей нет привязки к ГК')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Отвязать ГК у выбранных записей: ${rows.length} шт.?`,
      'Массовая отвязка ГК',
      {
        type: 'warning',
        confirmButtonText: 'Отвязать',
        cancelButtonText: 'Отмена',
      },
    )
  } catch {
    return
  }
  try {
    await Promise.all(rows.map((row) => unlinkRequirementGK(row.id)))
    ElMessage.success(`ГК отвязан у записей: ${rows.length}`)
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка массовой отвязки ГК')
  }
}

async function handleDeleteAllRequirements() {
  try {
    await ElMessageBox.confirm(
      'Будут удалены все предложения в базе (системы 112 и 101, в том числе из архива). Комментарии в карточках удаляются безвозвратно. Отменить операцию будет нельзя.',
      'Удалить все предложения',
      {
        type: 'error',
        confirmButtonText: 'Удалить все',
        cancelButtonText: 'Отмена',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  try {
    deleteAllLoading.value = true
    const res = await deleteAllRequirements()
    ElMessage.success(res.message || `Удалено записей: ${res.deleted}`)
    detailsVisible.value = false
    selectedRequirementId.value = null
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка массового удаления')
  } finally {
    deleteAllLoading.value = false
  }
}

/**
 * Открытие карточки записи.
 */
function handleRowClick(row: Requirement, column?: any) {
  if (selectionMode.value) return
  if (isSelectionColumn(column)) return
  selectedRequirementId.value = row.id
  detailsVisible.value = true
}

function handleRowMenuCommand(cmd: string, row: Requirement) {
  if (cmd === 'open') {
    handleRowClick(row)
    return
  }
  if (cmd === 'delete') {
    void handleDelete(row)
    return
  }
  if (cmd === 'archive') {
    void handleArchive(row)
    return
  }
  if (cmd === 'restore') {
    void handleRestore(row)
  }
}

function getRowClassName({ row }: { row: Requirement }) {
  if (!row.isArchived) return ''
  return row.archivedReason === 'completed' ? 'archived-row archived-row--completed' : 'archived-row archived-row--outdated'
}

watch(
  () => [items.value.length, tablePageSize.value] as const,
  () => {
    const n = items.value.length
    const maxPage = Math.max(1, Math.ceil(n / tablePageSize.value) || 1)
    if (tablePage.value > maxPage) tablePage.value = maxPage
  },
)

watch(
  [status, implementationQueue, archiveFilterMode, filterNoFunction, sequenceSortAsc],
  () => {
    clearSearchDebounce()
    debouncedReloadList()
  },
)

watch(search, () => {
  clearSearchDebounce()
  searchDebounceTimer = setTimeout(() => {
    loadData()
  }, 400)
})

/**
 * Инициализация страницы.
 */
function onRequirementDeletedFromDrawer() {
  selectedRequirementId.value = null
  void loadData()
}

onMounted(async () => {
  window.addEventListener('resize', syncHeaderScrollbarCompensation)
  window.addEventListener('mouseup', handleDragSelectionStop)
  await Promise.all([loadQueues(), loadData()])
  await nextTick()
  syncHeaderScrollbarCompensation()
  syncHeaderScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncHeaderScrollbarCompensation)
  window.removeEventListener('mouseup', handleDragSelectionStop)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background: linear-gradient(165deg, #e8eef6 0%, #f2f5f9 40%, #edf1f7 100%);
  padding: 0 0 4px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.page-shell {
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 0;
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-x: hidden;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.page-header--dark {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 0;
  padding: 6px 10px;
  box-shadow: 0 4px 12px rgba(8, 20, 40, 0.2);
}

.page-header-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-header-left--dark {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 0;
  padding: 0;
  background: transparent;
  border: 0;
  color: #f8fbff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.variant-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.variant-switch--right {
  margin-left: 0;
  margin-right: 12px;
}

.variant-switch__label {
  font-size: 12px;
  color: #64748b;
  line-height: 1;
  font-weight: 400;
}

.variant-switch__group {
  display: inline-flex;
  gap: 2px;
  background: #1e293b;
  border: 0;
  border-radius: 8px;
  padding: 2px;
}

.variant-switch__option {
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border-radius: 6px;
  padding: 7px 10px;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.variant-switch__option:hover {
  color: #e2e8f0;
}

.variant-switch__option.is-active {
  background: #2563eb;
  color: #ffffff;
  box-shadow: none;
}

.variant-switch__option:nth-child(2).is-active {
  background: #2563eb;
  color: #ffffff;
  box-shadow: none;
}

.header-tools-btn {
  --el-button-bg-color: rgba(255, 255, 255, 0.08);
  --el-button-border-color: rgba(255, 255, 255, 0.18);
  --el-button-text-color: #f3f8ff;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.14);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.28);
  --el-button-hover-text-color: #ffffff;
}

:deep(.header-tools-dropdown) {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 6px;
}

:deep(.header-tools-dropdown .el-dropdown-menu) {
  padding: 0;
}

:deep(.header-tools-dropdown .el-dropdown-menu__item) {
  border-radius: 8px;
  margin: 1px 0;
  font-size: 13px;
  color: #334155;
}

:deep(.header-tools-dropdown .el-dropdown-menu__item:hover) {
  background: #f8fafc;
  color: #0f172a;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 56px;
  justify-content: center;
}

.page-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 700;
  color: #142032;
  letter-spacing: -0.02em;
}

.meta {
  color: #667085;
  font-size: 14px;
  margin-top: 0;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;
  background: #e2eaf4;
  color: #1e4d7b;
  font-size: 13px;
  font-weight: 600;
  align-self: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.header-actions--dark {
  gap: 8px;
}

.sections-btn {
  --el-button-bg-color: #2563eb;
  --el-button-border-color: #2563eb;
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: #1d4ed8;
  --el-button-hover-border-color: #1d4ed8;
  --el-button-hover-text-color: #ffffff;
  --el-button-active-bg-color: #1e40af;
  --el-button-active-border-color: #1e40af;
  --el-button-outline-color: rgba(37, 99, 235, 0.3);
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  height: 32px;
  padding: 0 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.16);
}

.sections-btn__arrow {
  transition: transform 0.2s ease;
}

.sections-btn__arrow.is-open {
  transform: rotate(180deg);
}

.header-before-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.header-btn-delete-all {
  color: rgb(236, 100, 82);
  font-weight: 500;
}

.header-btn-delete-all:hover {
  color: white;
  background-color: rgba(231, 101, 84, 0.56) !important;
}

/* После клика остаётся :focus — не показываем его как «наведение» */
.header-btn-delete-all:focus {
  outline: none;
  color: rgb(236, 100, 82) !important;
  background-color: transparent !important;
}

.header-btn-delete-all:focus:hover {
  color: white !important;
  background-color: rgba(231, 101, 84, 0.56) !important;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.registry-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0;
  padding: 8px 12px;
}

.registry-topbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.registry-topbar__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.registry-topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.registry-topbar__right :deep(.el-button + .el-button) {
  margin-left: 0;
}

.registry-topbar__search {
  width: 240px;
}

.registry-topbar__search :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 8px;
  background: #f8fafc;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.registry-topbar__search :deep(.el-input__inner) {
  font-size: 14px;
  color: #334155;
}

.registry-topbar__search :deep(.el-input__inner::placeholder) {
  color: #94a3b8;
}

.registry-topbar__search :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px #60a5fa inset,
    0 0 0 3px rgba(59, 130, 246, 0.18);
}

.registry-topbar__add-btn {
  --el-button-bg-color: #2563eb;
  --el-button-border-color: #2563eb;
  --el-button-text-color: #ffffff;
  --el-button-hover-bg-color: #1d4ed8;
  --el-button-hover-border-color: #1d4ed8;
  --el-button-active-bg-color: #1e40af;
  --el-button-active-border-color: #1e40af;
  min-height: 36px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.registry-topbar__add-btn :deep(.el-icon) {
  margin-right: 4px;
}

.registry-topbar__export-btn {
  --el-button-bg-color: #ffffff;
  --el-button-border-color: #e2e8f0;
  --el-button-text-color: #334155;
  --el-button-hover-bg-color: #f8fafc;
  --el-button-hover-border-color: #cbd5e1;
  --el-button-active-bg-color: #f1f5f9;
  --el-button-active-border-color: #cbd5e1;
  min-height: 36px;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.registry-topbar__more-btn {
  --el-button-bg-color: #ffffff;
  --el-button-border-color: #e2e8f0;
  --el-button-text-color: #475569;
  --el-button-hover-bg-color: #f8fafc;
  --el-button-hover-border-color: #cbd5e1;
  width: 36px;
  min-height: 36px;
  border-radius: 8px;
  padding: 0;
  font-size: 16px;
  font-weight: 600;
}

.toolbar-left {
  flex: 1;
  min-width: 280px;
  display: grid;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.view-toggle-btn {
  width: 36px;
  padding: 0;
}

.view-cubes-icon {
  display: grid;
  grid-template-columns: repeat(2, 6px);
  grid-template-rows: repeat(2, 6px);
  gap: 3px;
}

.view-cubes-icon > span {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: currentColor;
}

.reset-filters-btn {
  flex-shrink: 0;
}

.filter-no-fn {
  margin-right: 4px;
  white-space: nowrap;
}

.filter-no-fn-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.filter-no-fn-toggle__label {
  font-size: 13px;
  color: #4b5565;
}

.filter-no-fn-switch :deep(.el-switch__core) {
  height: 18px;
}

.filter-no-fn-switch :deep(.el-switch__core::after) {
  width: 12px;
  height: 12px;
}

.list-sort-switch :deep(.el-switch__core) {
  height: 18px;
}

.list-sort-switch :deep(.el-switch__core::after) {
  width: 12px;
  height: 12px;
}

.list-sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4b5565;
  font-size: 13px;
  white-space: nowrap;
}

.list-sort-toggle__label {
  line-height: 1;
}

.list-sort-checkbox {
  display: inline-flex;
  align-items: center;
}

.list-sort-checkbox :deep(.el-checkbox__label) {
  display: none;
}

.user-avatar-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #5d7fb3;
  background: linear-gradient(145deg, #1e4d7b, #2d6a4f);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(30, 77, 123, 0.25);
}

.user-avatar-btn:hover {
  filter: brightness(1.05);
}

.archive-filter-select {
  width: 200px;
  flex: 0 0 200px;
}

.tz-cell-link {
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  color: #1e4d7b;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.4;
}

.tz-cell-link:hover:not(:disabled) {
  color: #163a5e;
}

.tz-cell-link:disabled {
  color: inherit;
  text-decoration: none;
  cursor: default;
}

.summary-grid-all {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  min-width: 0;
}

.summary-card {
  border-radius: 14px;
  border: 1px solid #e7ecf3;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.summary-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.summary-main-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.summary-label {
  color: #667085;
  font-size: 12px;
  margin-bottom: 6px;
  line-height: 1.2;
}

.summary-label--inline {
  margin-bottom: 0;
}

.summary-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: #1f2937;
}

.summary-value--inline {
  font-size: 20px;
}

.summary-card--main {
  width: 168px;
  height: 48px;
  cursor: default;
  margin-top: 0;
}

.summary-card--nav {
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.92);
}

.summary-card--main :deep(.el-card__body) {
  height: 100%;
  padding: 7px 10px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.summary-card--main .summary-label {
  font-size: 11px;
}

.summary-card--main .summary-value {
  font-size: 18px;
}

.summary-popover-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  width: max-content;
}

.summary-popover-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 168px;
  gap: 12px;
  width: max-content;
}

.summary-popover-row--statuses,
.summary-popover-row--queues {
  align-items: center;
}

.summary-card--mini {
  width: 168px;
}

.summary-card--mini :deep(.el-card__body) {
  padding: 10px 12px;
}

.status-card--new {
  background: var(--el-fill-color-lighter);
  border-color: var(--el-border-color);
}

.status-card--confirmed {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.status-card--discussion {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-7);
}

.status-card--accounted {
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-7);
}

.status-card--done {
  background: var(--el-color-success-light-8);
  border-color: var(--el-color-success-light-5);
}

.status-card--other {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.queue-card--1 {
  background: #f9dfe8;
  border-color: #f2c6d4;
}

.queue-card--2 {
  background: #fff4cc;
  border-color: #f3e3a2;
}

.queue-card--3 {
  background: #dff5df;
  border-color: #c5e7c7;
}

.queue-card--default {
  background: #eef2f7;
  border-color: #dde3eb;
}

/* Полу-прозрачный контейнер поповера. */
:deep(.summary-popover-popper) {
  background: rgba(255, 255, 255, 0.78) !important;
  backdrop-filter: blur(10px);
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  width: fit-content !important;
  max-width: calc(100vw - 24px) !important;
  overflow: hidden;
}

.toolbar-card,
.table-card {
  border-radius: 20px;
  border: 1px solid #e7ecf3;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
  box-sizing: border-box;
}

.toolbar-card {
  min-width: 0;
  position: relative;
}

.toolbar-toggle-row {
  display: flex;
  justify-content: center;
  align-items: center;
}

.toolbar-card--scaled :deep(.el-card__body) {
  zoom: 0.92;
}

.toolbar-footer-toggle {
  position: absolute;
  right: 12px;
  bottom: 8px;
  z-index: 2;
}

.table-card {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 8px;
  box-sizing: border-box;
}

.table-stack {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  gap: 0;
}

.table-header-scroll {
  flex: 0 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  border-bottom: 1px solid var(--el-table-border-color);
}

.table-header-scroll::-webkit-scrollbar {
  display: none;
}

.table-horizontal-wrap {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 280px;
  overflow-x: auto;
  overflow-y: auto;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.cards-wrap {
  flex: 1 1 auto;
  min-height: 280px;
  overflow: auto;
  padding-right: 4px;
}

.requirements-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.requirement-list-card {
  position: relative;
  border: 1px solid #d7e1ef;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  padding: 14px;
  display: grid;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.requirement-list-card:hover {
  transform: translateY(-2px);
  border-color: #adc3e4;
  box-shadow: 0 10px 24px rgba(26, 51, 91, 0.12);
}

.requirement-list-card:active {
  transform: translateY(0);
}

.requirement-list-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.requirement-list-card__id-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.requirement-list-card__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #7b8ba7;
  box-shadow: 0 0 0 3px rgba(123, 139, 167, 0.16);
}

.requirement-list-card__status-dot.is-new {
  background: #7b8ba7;
  box-shadow: 0 0 0 3px rgba(123, 139, 167, 0.16);
}

.requirement-list-card__status-dot.is-confirmed {
  background: #2e7dd7;
  box-shadow: 0 0 0 3px rgba(46, 125, 215, 0.16);
}

.requirement-list-card__status-dot.is-discussion {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}

.requirement-list-card__status-dot.is-accounted {
  background: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.16);
}

.requirement-list-card__status-dot.is-done {
  background: #0e9f6e;
  box-shadow: 0 0 0 3px rgba(14, 159, 110, 0.18);
}

.requirement-list-card__head-tags {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.requirement-list-card__id {
  font-size: 12px;
  color: #58667d;
  font-weight: 700;
}

.requirement-list-card__title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  color: #1f2937;
}

.requirement-list-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12px;
  color: #475467;
}

.requirement-list-card__text {
  font-size: 13px;
  color: #3f4c5e;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.requirement-list-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #637188;
  border-top: 1px dashed #d7dfeb;
  padding-top: 8px;
}

.requirement-list-card__select {
  position: absolute;
  top: 10px;
  right: 10px;
}

.requirement-list-card__open {
  color: #1e4d7b;
  font-weight: 600;
}

.requirement-list-card--tone-new {
  border-left: 4px solid #7b8ba7;
}

.requirement-list-card--tone-confirmed {
  border-left: 4px solid #2e7dd7;
}

.requirement-list-card--tone-discussion {
  border-left: 4px solid #f59e0b;
}

.requirement-list-card--tone-accounted {
  border-left: 4px solid #16a34a;
}

.requirement-list-card--tone-done,
.requirement-list-card--tone-completed {
  border-left: 4px solid #0e9f6e;
}

.requirement-list-card--tone-outdated {
  border-left: 4px solid #d97706;
}

.requirement-list-card--archived-completed {
  background: #dff5df;
  border-color: #bfe3c3;
}

.requirement-list-card--archived-outdated {
  background: #fff4cc;
  border-color: #f0d68a;
}

.table-horizontal-wrap::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.table-horizontal-wrap::-webkit-scrollbar-thumb {
  background: rgba(130, 146, 168, 0.45);
  border-radius: 6px;
}

.table-horizontal-wrap::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.55);
}

.table-width-box {
  width: max-content;
}

.table-pagination-panel {
  flex-shrink: 0;
  padding-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.table-pagination {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  min-height: 28px;
}

.table-pagination :deep(.el-pagination) {
  --el-pagination-font-size: 12px;
}

.table-pagination :deep(.el-pager li) {
  min-width: 24px;
  height: 24px;
  line-height: 24px;
}

.table-pagination :deep(.btn-prev),
.table-pagination :deep(.btn-next) {
  min-width: 24px;
  height: 24px;
}

.requirements-table {
  width: 100%;
}

.requirements-table.drag-selecting :deep(td.el-table__cell),
.requirements-table.drag-selecting :deep(th.el-table__cell) {
  user-select: none;
}

.requirements-header-sticky {
  position: relative;
  z-index: 2;
}

.requirements-header-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background: #f8fbff;
}

.requirements-header-table th {
  position: relative;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  color: #1f2937;
  background: #f8fbff;
  border: 1px solid var(--el-table-border-color);
}

.requirements-header-table th:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: #d8dee8;
}

.requirements-table :deep(td.tz-col) {
  vertical-align: top;
}

.requirements-table :deep(td.tz-col .cell) {
  white-space: normal !important;
  word-break: break-word;
  line-height: 1.4;
}

.requirements-table :deep(th.el-table__cell) {
  padding: 10px 8px;
  font-size: 13px;
  background: #f8fbff;
}

.requirements-table :deep(td.el-table__cell) {
  padding: 8px 8px;
  font-size: 13px;
  vertical-align: top;
}

.requirements-table :deep(.cell) {
  text-overflow: clip;
}

.requirements-table :deep(.el-table__inner-wrapper) {
  overflow-x: hidden !important;
}

.requirements-table :deep(.el-table__body-wrapper) {
  overflow-x: hidden !important;
}

.requirements-table :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}

.requirements-table :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

.requirements-table :deep(.el-scrollbar__bar.is-vertical) {
  opacity: 1 !important;
  width: 8px;
}

.requirements-table :deep(.row-menu-col .cell) {
  padding: 8px 4px;
  overflow: visible;
}

.top-actions {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.main-filters {
  display: none;
}

.header-filter-preset {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
  background: #1e293b;
  border-radius: 8px;
  padding: 2px;
  margin-left: 8px;
}

.header-filter-preset__btn {
  border: 0;
  background: transparent;
  color: #94a3b8;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.header-filter-preset__btn:hover {
  color: #e2e8f0;
}

.header-filter-preset__btn.is-active {
  background: #2563eb;
  color: #ffffff;
}

.list-sort-switch--toolbar {
  flex-shrink: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-width: 0;
}

.filters-row-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.filters-row-compact__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  padding-right: 2px;
}

.filters-row-compact__icon {
  width: 14px;
  height: 14px;
  color: #94a3b8;
  flex-shrink: 0;
}

.filters-row-compact__select {
  width: 150px;
  flex: 0 0 150px;
}

.filters-row-compact__select :deep(.el-select__wrapper) {
  min-height: 32px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.filters-row-compact__select :deep(.el-select__placeholder) {
  color: #64748b;
  font-size: 13px;
}

.filters-row-compact__select :deep(.el-select__selected-item) {
  font-size: 13px;
  color: #334155;
}

.selection-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  width: 360px;
  flex: 1 1 280px;
  min-width: 0;
  max-width: 480px;
}

.list-sort-switch {
  flex-shrink: 0;
}

.status-select {
  width: 180px;
  flex: 0 0 180px;
  min-width: 0;
}

.queue-select {
  width: 170px;
  flex: 0 0 170px;
  min-width: 0;
}

.sequence-sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sequence-sort-toggle__label {
  font-size: 13px;
  color: #4b5565;
}

.sequence-sort-switch {
  flex-shrink: 0;
}

.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  word-break: break-word;
}

.row-menu-trigger {
  padding: 6px;
}

.row-menu-ellipsis {
  transform: rotate(90deg);
}

.gk-cell {
  display: inline;
}

.gk-short-hint {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.requirements-table :deep(td.sequence-col .cell) {
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 1365px) {
  .summary-grid-all {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .search-row {
    flex-wrap: wrap;
  }

  .search-input,
  .status-select,
  .queue-select {
    width: 100%;
    flex: 1 1 100%;
  }
}

@media (max-width: 900px) {
  .page {
    padding: 0 0 4px 0;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .summary-grid-all {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .summary-grid-all {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.archived-row td {
  opacity: 1;
}

.archived-row--completed td {
  background-color: #dff5df !important;
}

.archived-row--outdated td {
  background-color: #fff4cc !important;
}
</style>