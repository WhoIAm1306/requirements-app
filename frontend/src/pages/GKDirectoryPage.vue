<template>
  <div class="page gkd-page">
    <div class="gkd-page-inner">
      <header class="page-header page-header--dark gkd-page-header">
        <div class="page-header-left page-header-left--dark gkd-header-left">
          <div class="gkd-header-title-block">
            <span class="gkd-header-kicker">Справочник ГК</span>
            <span class="gkd-header-count">{{ headerRecordsLabel }}</span>
          </div>
        </div>

        <div class="header-actions header-actions--dark gkd-header-actions">
          <el-button class="header-tools-btn gkd-header-icon-btn" @click="router.push('/requirements')">
            <el-icon><ArrowLeft /></el-icon>
            <span>Назад</span>
          </el-button>
          <el-button
            v-if="canEditFunctions"
            class="header-tools-btn gkd-header-icon-btn"
            :disabled="!selectedContractId"
            @click="onHeaderImportClick"
          >
            <el-icon><Upload /></el-icon>
            <span>Импорт</span>
          </el-button>
          <el-button v-if="canEditContract" type="primary" class="gkd-header-primary-btn" @click="openCreateContract">
            <el-icon><Plus /></el-icon>
            <span>Добавить ГК</span>
          </el-button>

          <div class="header-user-meta">
            <div class="header-user-meta__text">
              <span class="header-user-meta__name">{{ authStore.fullName || '—' }}</span>
              <span class="header-user-meta__org">{{ authStore.organization || '—' }}</span>
            </div>
            <el-dropdown trigger="click" placement="bottom-end" @command="handleUserMenuCommand">
              <button type="button" class="user-avatar-btn" :title="authStore.fullName">
                {{ userAvatarLetters }}
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">Выйти</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>

      <div class="gkd-body">
        <aside class="gkd-sidebar">
          <div class="gkd-sidebar-toolbar">
            <el-input
              v-model="contractSearch"
              class="gkd-sidebar-search"
              clearable
              placeholder="Поиск по ГК, коду, заказчику…"
            />
            <div class="gkd-filter-pills" role="group" aria-label="Статус ГК">
              <button
                type="button"
                class="gkd-filter-pill"
                :class="{ 'gkd-filter-pill--active': archiveFilter === 'all' }"
                @click="archiveFilter = 'all'"
              >
                Все
              </button>
              <button
                type="button"
                class="gkd-filter-pill"
                :class="{ 'gkd-filter-pill--active': archiveFilter === 'active' }"
                @click="archiveFilter = 'active'"
              >
                ● Активные
              </button>
              <button
                type="button"
                class="gkd-filter-pill"
                :class="{ 'gkd-filter-pill--active': archiveFilter === 'archived' }"
                @click="archiveFilter = 'archived'"
              >
                ○ Архив
              </button>
            </div>
            <div class="gkd-list-meta">{{ listCountLine }}</div>
          </div>

          <div v-loading="loading" class="gkd-sidebar-list">
            <button
              v-for="c in displayContracts"
              :key="c.id"
              type="button"
              class="gkd-sidebar-item"
              :class="{ 'gkd-sidebar-item--active': selectedContractId === c.id }"
              @click="handleSidebarClick(c)"
            >
              <span
                class="gkd-sidebar-item__dot"
                :class="{ 'gkd-sidebar-item__dot--off': !c.isActive }"
                aria-hidden="true"
              />
              <div class="gkd-sidebar-item__body">
                <div class="gkd-sidebar-item__row1">
                  <span class="gkd-sidebar-item__abbr">{{ sidebarAbbr(c) }}</span>
                  <span class="gkd-sidebar-item__num">№ {{ c.id }}</span>
                </div>
                <div class="gkd-sidebar-item__name">{{ c.name }}</div>
                <div class="gkd-sidebar-item__tags">
                  <span class="gkd-mini-tag gkd-mini-tag--stages">{{ stagesLabel(c) }}</span>
                  <span class="gkd-mini-tag gkd-mini-tag--funcs">{{ functionsLabel(c) }}</span>
                </div>
              </div>
            </button>
            <el-empty
              v-if="!loading && !displayContracts.length"
              class="gkd-sidebar-empty"
              :description="emptyListDescription"
            />
          </div>
        </aside>

        <main class="gkd-main-area" :class="{ 'gkd-main-area--empty': !selectedContractId }">
          <div v-if="!selectedContractId" class="gkd-empty-state">
            <div class="gkd-empty-state__inner">
              <div class="gkd-empty-state__head">
                <div class="gkd-empty-state__icon-sq" aria-hidden="true">
                  <el-icon :size="36" class="gkd-empty-state__head-icon">
                    <Pointer />
                  </el-icon>
                </div>
                <h2 class="gkd-empty-state__title">Выберите ГК из списка</h2>
                <p class="gkd-empty-state__subtitle">
                  Нажмите на любую запись слева, чтобы просмотреть детали, управлять этапами и функциями
                </p>
              </div>
              <div class="gkd-empty-state__grid" role="list" aria-label="Сводка по справочнику ГК">
                <div class="gkd-stat-card gkd-stat-card--active" role="listitem">
                  <div class="gkd-stat-card__icon-wrap" aria-hidden="true">
                    <el-icon :size="26" class="gkd-stat-card__icon gkd-stat-card__icon--emerald">
                      <CircleCheck />
                    </el-icon>
                  </div>
                  <div class="gkd-stat-card__body">
                    <div class="gkd-stat-card__value gkd-stat-card__value--emerald">
                      {{ gkDirectoryStats.activeCount }}
                    </div>
                    <div class="gkd-stat-card__label">Активных ГК</div>
                  </div>
                </div>
                <div class="gkd-stat-card gkd-stat-card--archived" role="listitem">
                  <div class="gkd-stat-card__icon-wrap" aria-hidden="true">
                    <el-icon :size="26" class="gkd-stat-card__icon gkd-stat-card__icon--slate">
                      <Box />
                    </el-icon>
                  </div>
                  <div class="gkd-stat-card__body">
                    <div class="gkd-stat-card__value gkd-stat-card__value--slate">
                      {{ gkDirectoryStats.archivedCount }}
                    </div>
                    <div class="gkd-stat-card__label">В архиве</div>
                  </div>
                </div>
                <div class="gkd-stat-card gkd-stat-card--stages" role="listitem">
                  <div class="gkd-stat-card__icon-wrap" aria-hidden="true">
                    <el-icon :size="26" class="gkd-stat-card__icon gkd-stat-card__icon--blue">
                      <Files />
                    </el-icon>
                  </div>
                  <div class="gkd-stat-card__body">
                    <div class="gkd-stat-card__value gkd-stat-card__value--blue">
                      {{ gkDirectoryStats.stagesTotal }}
                    </div>
                    <div class="gkd-stat-card__label">Всего этапов</div>
                  </div>
                </div>
                <div class="gkd-stat-card gkd-stat-card--functions" role="listitem">
                  <div class="gkd-stat-card__icon-wrap" aria-hidden="true">
                    <el-icon :size="26" class="gkd-stat-card__icon gkd-stat-card__icon--violet">
                      <Lightning />
                    </el-icon>
                  </div>
                  <div class="gkd-stat-card__body">
                    <div class="gkd-stat-card__value gkd-stat-card__value--violet">
                      {{ gkDirectoryStats.functionsTotal }}
                    </div>
                    <div class="gkd-stat-card__label">Функций</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="gkd-detail-root" v-loading="drawerLoading">
            <div v-if="contractDetails" class="gkd-detail-hero">
              <div class="gkd-detail-hero__row">
                <div class="gkd-detail-hero__left">
                  <div class="gkd-detail-hero__tags">
                    <span
                      class="gkd-hero-pill gkd-hero-pill--status"
                      :class="
                        contractDetails.isActive
                          ? 'gkd-hero-pill--status-on'
                          : 'gkd-hero-pill--status-off'
                      "
                    >
                      <span
                        class="gkd-hero-pill__dot"
                        :class="contractDetails.isActive ? 'is-on' : 'is-off'"
                        aria-hidden="true"
                      />
                      {{ contractDetails.isActive ? 'Активный' : 'Архивный' }}
                    </span>
                    <span class="gkd-hero-pill gkd-hero-pill--id">№ {{ contractDetails.id }}</span>
                  </div>
                  <h2 class="gkd-detail-hero__title">{{ contractDetails.name || '—' }}</h2>
                </div>
                <div class="gkd-detail-hero__actions" role="toolbar" aria-label="Действия с ГК">
                  <button
                    type="button"
                    class="gkd-hero-ico-btn"
                    :disabled="!canEditContract"
                    :title="canEditContract ? 'Перейти к редактированию' : 'Нет прав на редактирование'"
                    @click="onHeroEdit"
                  >
                    <el-icon class="gkd-hero-ico-btn__icon" :size="20"><EditPen /></el-icon>
                    <span class="gkd-hero-ico-btn__label">Редактировать</span>
                  </button>
                  <button type="button" class="gkd-hero-ico-btn" @click="goToRequirementsForContract">
                    <el-icon class="gkd-hero-ico-btn__icon" :size="20"><ChatLineRound /></el-icon>
                    <span class="gkd-hero-ico-btn__label">Предложения</span>
                  </button>
                  <button
                    v-if="canEditContract"
                    type="button"
                    class="gkd-hero-ico-btn"
                    :disabled="archiveToggling"
                    :title="contractDetails.isActive ? 'Перевести в архив' : 'Восстановить из архива'"
                    @click="toggleContractArchive"
                  >
                    <el-icon class="gkd-hero-ico-btn__icon" :size="20">
                      <Box v-if="contractDetails.isActive" />
                      <RefreshRight v-else />
                    </el-icon>
                    <span class="gkd-hero-ico-btn__label">{{
                      contractDetails.isActive ? 'Архив' : 'Восстановить'
                    }}</span>
                  </button>
                  <button
                    v-if="canDelete"
                    type="button"
                    class="gkd-hero-ico-btn gkd-hero-ico-btn--danger"
                    @click="confirmDeleteContractFromDrawer"
                  >
                    <el-icon class="gkd-hero-ico-btn__icon" :size="20"><Delete /></el-icon>
                    <span class="gkd-hero-ico-btn__label">Удалить</span>
                  </button>
                </div>
              </div>
              <div class="gkd-detail-hero__rule" role="separator" />
              <div class="gkd-detail-hero__tabs" role="tablist" aria-label="Разделы карточки ГК">
                <button
                  type="button"
                  class="gkd-hero-tab"
                  role="tab"
                  :aria-selected="detailViewTab === 'main'"
                  :class="{ 'gkd-hero-tab--active': detailViewTab === 'main' }"
                  @click="detailViewTab = 'main'"
                >
                  <el-icon :size="16" class="gkd-hero-tab__icon"><Document /></el-icon>
                  <span>Основное</span>
                </button>
                <button
                  type="button"
                  class="gkd-hero-tab"
                  role="tab"
                  :aria-selected="detailViewTab === 'stages'"
                  :class="{ 'gkd-hero-tab--active': detailViewTab === 'stages' }"
                  @click="detailViewTab = 'stages'"
                >
                  <el-icon :size="16" class="gkd-hero-tab__icon"><Files /></el-icon>
                  <span>Этапы</span>
                  <span class="gkd-hero-tab__badge" aria-label="число этапов">{{ detailStagesCount }}</span>
                </button>
                <button
                  type="button"
                  class="gkd-hero-tab"
                  role="tab"
                  :aria-selected="detailViewTab === 'functions'"
                  :class="{ 'gkd-hero-tab--active': detailViewTab === 'functions' }"
                  @click="detailViewTab = 'functions'"
                >
                  <el-icon :size="16" class="gkd-hero-tab__icon"><Lightning /></el-icon>
                  <span>Функции</span>
                  <span class="gkd-hero-tab__badge" aria-label="число функций ТЗ">{{
                    detailFunctionsCount
                  }}</span>
                </button>
              </div>
            </div>

            <div v-if="contractDetails" class="drawer-body gkd-drawer-body gkd-detail-scroll gkd-detail-scroll--tabbed">
          <!-- Вкладка: Основное — главная информация и вложения -->
          <div v-show="detailViewTab === 'main'">
          <section v-if="contractDetails" class="gkd-overview">
            <div class="gkd-overview__meta-card">
              <div class="gkd-overview__grid">
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Наименование</div>
                  <div class="gkd-overview__value">{{ contractDetails.name || '—' }}</div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Краткое имя</div>
                  <div class="gkd-overview__value">{{ contractDetails.shortName || '—' }}</div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Код / Номер</div>
                  <div class="gkd-overview__value">2021-ЯНС-{{ contractDetails.id }}</div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Заказчик</div>
                  <div class="gkd-overview__value">{{ authStore.organization || '—' }}</div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Статус</div>
                  <div class="gkd-overview__value">
                    <span class="gkd-overview__status-dot" :class="{ 'is-off': !contractDetails.isActive }" aria-hidden="true" />
                    {{ contractDetails.isActive ? 'Активна' : 'В архиве' }}
                  </div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">ID по короткому</div>
                  <div class="gkd-overview__value">
                    {{ contractDetails.useShortNameInTaskId ? 'Включено' : 'Выключено' }}
                  </div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Создано</div>
                  <div class="gkd-overview__value">{{ formatCreatedAt(contractDetails.createdAt) }}</div>
                </div>
                <div class="gkd-overview__item">
                  <div class="gkd-overview__label">Описание</div>
                  <div class="gkd-overview__value">{{ contractDetails.description || '—' }}</div>
                </div>
              </div>
            </div>

            <div class="gkd-overview__stats">
              <div class="gkd-overview-stat gkd-overview-stat--stages">
                <div class="gkd-overview-stat__value">{{ detailStagesCount }}</div>
                <div class="gkd-overview-stat__label">Этапов</div>
              </div>
              <div class="gkd-overview-stat gkd-overview-stat--functions">
                <div class="gkd-overview-stat__value">{{ detailFunctionsCount }}</div>
                <div class="gkd-overview-stat__label">Функций</div>
              </div>
              <div class="gkd-overview-stat gkd-overview-stat--jira">
                <div class="gkd-overview-stat__value">{{ detailJiraEpicsCount }}</div>
                <div class="gkd-overview-stat__label">Jira epics</div>
              </div>
              <div class="gkd-overview-stat gkd-overview-stat--confluence">
                <div class="gkd-overview-stat__value">{{ detailConfluenceCount }}</div>
                <div class="gkd-overview-stat__label">Confluence</div>
              </div>
            </div>
          </section>

          <el-card shadow="never" class="section-card">
            <template v-if="contractDetails">
              <div class="section-header">
                <div class="section-title">Главная информация</div>
              </div>
              <div class="readonly-grid">
                <div class="readonly-card">
                  <div class="readonly-label">Наименование ГК</div>
                  <div class="readonly-value">{{ contractDetails.name || '—' }}</div>
                </div>
                <div class="readonly-card">
                  <div class="readonly-label">Краткое наименование</div>
                  <div class="readonly-value">{{ contractDetails.shortName || '—' }}</div>
                </div>
                <div class="readonly-card">
                  <div class="readonly-label">Краткое в идентификаторе</div>
                  <div class="readonly-value">
                    {{ contractDetails.useShortNameInTaskId ? 'Да' : 'Нет' }}
                  </div>
                </div>
                <div class="readonly-card full">
                  <div class="readonly-label">Описание</div>
                  <div class="readonly-value">{{ contractDetails.description || '—' }}</div>
                </div>
              </div>
            </template>
          </el-card>

          <!-- Вложения ТЗ / НМЦК (вкладка «Основное») -->
          <el-card shadow="never" class="section-card section-card--attachments">
            <div class="section-header">
              <div class="section-title">Файлы ТЗ и НМЦК</div>
            </div>

            <div v-loading="attachmentsLoading" class="attachments-grid">
              <div class="attachment-col attachment-panel">
                <div class="attachment-type-title">ТЗ</div>

                <input
                  ref="tzFileInputRef"
                  class="visually-hidden"
                  type="file"
                  accept=".doc,.docx,.xls,.xlsx,.pdf"
                  multiple
                  @change="(e) => onFilesSelected(e, 'tz')"
                />

                <div class="upload-row">
                  <el-button v-if="canEditFunctions" type="primary" plain @click="triggerTzFilePick">
                    Прикрепить файлы
                  </el-button>
                  <el-button
                    v-if="canEditFunctions"
                    type="primary"
                    :loading="attachmentsUploading"
                    :disabled="!tzSelectedFiles.length"
                    @click="upload('tz')"
                  >
                    Загрузить выбранные
                  </el-button>
                </div>
                <div v-if="canEditFunctions && tzSelectedFiles.length" class="selected-files-hint">
                  Выбрано файлов: {{ tzSelectedFiles.length }}
                </div>

                <el-empty
                  v-if="!attachments.filter((x) => x.type === 'tz').length"
                  description="Файлов ТЗ пока нет"
                  :image-size="72"
                />

                <div class="attachment-list">
                  <div v-for="a in attachments.filter((x) => x.type === 'tz')" :key="a.id" class="attachment-item">
                    <div class="attachment-name" :title="a.originalFileName">{{ a.originalFileName }}</div>
                    <div class="attachment-row-actions">
                      <el-button size="small" @click="download(a.id)">Скачать</el-button>
                      <el-button
                        v-if="canDelete"
                        size="small"
                        type="danger"
                        plain
                        @click="confirmDeleteAttachment(a.id)"
                      >
                        Удалить
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="attachment-col attachment-panel">
                <div class="attachment-type-title">НМЦК</div>

                <input
                  ref="nmckFileInputRef"
                  class="visually-hidden"
                  type="file"
                  accept=".doc,.docx,.xls,.xlsx,.pdf"
                  multiple
                  @change="(e) => onFilesSelected(e, 'nmck')"
                />

                <div class="upload-row">
                  <el-button v-if="canEditFunctions" type="primary" plain @click="triggerNmckFilePick">
                    Прикрепить файлы
                  </el-button>
                  <el-button
                    v-if="canEditFunctions"
                    type="primary"
                    :loading="attachmentsUploading"
                    :disabled="!nmckSelectedFiles.length"
                    @click="upload('nmck')"
                  >
                    Загрузить выбранные
                  </el-button>
                </div>
                <div v-if="canEditFunctions && nmckSelectedFiles.length" class="selected-files-hint">
                  Выбрано файлов: {{ nmckSelectedFiles.length }}
                </div>

                <el-empty
                  v-if="!attachments.filter((x) => x.type === 'nmck').length"
                  description="Файлов НМЦК пока нет"
                  :image-size="72"
                />

                <div class="attachment-list">
                  <div v-for="a in attachments.filter((x) => x.type === 'nmck')" :key="a.id" class="attachment-item">
                    <div class="attachment-name" :title="a.originalFileName">{{ a.originalFileName }}</div>
                    <div class="attachment-row-actions">
                      <el-button size="small" @click="download(a.id)">Скачать</el-button>
                      <el-button
                        v-if="canDelete"
                        size="small"
                        type="danger"
                        plain
                        @click="confirmDeleteAttachment(a.id)"
                      >
                        Удалить
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
          </div>

          <div v-show="detailViewTab === 'stages'">
          <!-- Этапы -->
          <el-card shadow="never" class="section-card section-card--stages">
            <div class="section-header section-header--stages">
              <div class="section-title">Этапы</div>

              <div class="section-actions section-actions--toolbar">
                <el-button
                  v-if="canEditStages"
                  @click="handleAddStage"
                  type="primary"
                  plain
                >
                  Добавить этап
                </el-button>

                <el-button v-if="canEditFunctions" @click="downloadGKTemplate">
                  Шаблон функций ТЗ
                </el-button>

                <el-button v-if="canEditFunctions" @click="importVisible = true">
                  Импорт из Excel
                </el-button>
              </div>
            </div>

            <el-empty
              v-if="!contractDetails?.stages?.length"
              description="У этой ГК пока нет этапов — добавьте этап кнопкой выше"
            />

            <el-collapse v-else accordion class="gkd-stages-collapse">
              <el-collapse-item v-for="stage in contractDetails?.stages" :key="stage.id" :name="String(stage.id)">
                <template #title>
                  <div class="collapse-stage-header">
                    <span class="collapse-stage-title-text">{{ stageCollapseTitle(stage) }}</span>
                    <el-button
                      v-if="canEditStages"
                      type="primary"
                      size="small"
                      plain
                      class="collapse-stage-rename"
                      @click.stop="handleRenameStage(stage)"
                    >
                      Переименовать
                    </el-button>
                    <el-button
                      v-if="canDelete"
                      type="danger"
                      size="small"
                      plain
                      class="collapse-stage-delete"
                      @click.stop="confirmDeleteStage(stage.stageNumber)"
                    >
                      Удалить этап
                    </el-button>
                  </div>
                </template>

                <div class="stage-body">
                  <el-table
                    :data="stage.functions || []"
                    size="small"
                    border
                    class="gkd-functions-table"
                    empty-text="Для этого этапа ещё не добавлены функции ТЗ"
                  >
                    <el-table-column prop="functionName" label="Наименование функции" min-width="280" show-overflow-tooltip />
                    <el-table-column prop="nmckFunctionNumber" label="НМЦК" width="120" />
                    <el-table-column prop="tzSectionNumber" label="Раздел ТЗ" min-width="120" />
                    <el-table-column v-if="authStore.canAccessExternalLinks" label="Jira" width="130" class-name="jira-col">
                      <template #default="{ row: fnRow }">
                        <a
                          v-if="jiraHref(fnRow.jiraLink)"
                          :href="String(jiraHref(fnRow.jiraLink))"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="jira-table-link"
                          :title="fnRow.jiraLink"
                          @click.stop
                        >
                          Открыть
                        </a>
                        <span v-else class="muted-dash">—</span>
                      </template>
                    </el-table-column>
                    <el-table-column
                      v-if="canEditFunctions || canDelete"
                      label=""
                      width="196"
                      align="center"
                      fixed="right"
                    >
                      <template #default="{ row: fnRow }">
                        <div class="gkd-fn-actions">
                          <el-button
                            v-if="canEditFunctions"
                            type="primary"
                            size="small"
                            link
                            @click.stop="openFunctionDialog(stage.stageNumber, fnRow)"
                          >
                            Изменить
                          </el-button>
                          <el-button
                            v-if="canDelete"
                            type="danger"
                            size="small"
                            link
                            @click.stop="confirmDeleteFunction(fnRow.id)"
                          >
                            Удалить
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>

                  <div v-if="canEditFunctions" class="stage-actions">
                    <el-button type="primary" plain size="small" @click="openFunctionDialog(stage.stageNumber, null)">
                      + Добавить функцию ТЗ
                    </el-button>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-card>
          </div>

          <div v-show="detailViewTab === 'functions'">
            <el-card v-if="contractDetails" shadow="never" class="section-card section-card--all-functions">
              <div class="section-header">
                <div class="section-title">Функции ТЗ</div>
              </div>
              <el-empty
                v-if="!flatFunctionRows.length"
                description="Для этой ГК пока нет функций ТЗ — задайте их на вкладке «Этапы»"
                :image-size="80"
              />
              <el-table
                v-else
                :data="flatFunctionRows"
                size="small"
                border
                class="gkd-functions-table gkd-functions-table--flat"
                row-key="id"
                empty-text="—"
              >
                <el-table-column label="Этап" width="120">
                  <template #default="{ row }">Этап {{ row.__stageNumber }}</template>
                </el-table-column>
                <el-table-column prop="functionName" label="Наименование функции" min-width="220" show-overflow-tooltip />
                <el-table-column prop="nmckFunctionNumber" label="НМЦК" width="110" />
                <el-table-column prop="tzSectionNumber" label="Раздел ТЗ" min-width="100" />
                <el-table-column v-if="authStore.canAccessExternalLinks" label="Jira" width="120" class-name="jira-col">
                  <template #default="{ row: fnRow }">
                    <a
                      v-if="jiraHref(fnRow.jiraLink)"
                      :href="String(jiraHref(fnRow.jiraLink))"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="jira-table-link"
                      :title="fnRow.jiraLink"
                    >
                      Открыть
                    </a>
                    <span v-else class="muted-dash">—</span>
                  </template>
                </el-table-column>
                <el-table-column
                  v-if="canEditFunctions || canDelete"
                  label=""
                  width="200"
                  align="center"
                  fixed="right"
                >
                  <template #default="{ row: fnRow }">
                    <div class="gkd-fn-actions">
                      <el-button
                        v-if="canEditFunctions"
                        type="primary"
                        size="small"
                        link
                        @click="openFunctionDialogFromFlatRow(fnRow)"
                      >
                        Изменить
                      </el-button>
                      <el-button
                        v-if="canDelete"
                        type="danger"
                        size="small"
                        link
                        @click="confirmDeleteFunction(fnRow.id)"
                      >
                        Удалить
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Модалки -->
      <GKContractDialog
        v-model="contractDialogVisible"
        :mode="contractDialogMode"
        :initial-contract="contractDialogInitial"
        v-model:loading="contractDialogLoading"
        @saved="onContractDialogSaved"
      />

      <GKFunctionDialog
        v-if="canEditFunctions"
        v-model="functionDialogVisible"
        :contract-id="selectedContractId"
        :stage-number="functionDialogStageNumber"
        :initial-function="functionDialogInitialFunction"
        :allow-links="authStore.canAccessExternalLinks"
        v-model:loading="functionDialogLoading"
        @saved="reloadContractDetails"
      />

      <ImportExcelDialog
        v-if="canEditFunctions"
        v-model="importVisible"
        mode="gkFunctions"
        :contractId="selectedContractId || undefined"
        @imported="reloadContractDetails"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { ContractAttachmentItem, ContractItem, GKContractDetails, GKFunction, GKStage } from '@/types'
import { fetchContracts } from '@/api/contracts'
import {
  createGKStage,
  deleteGKAttachment,
  deleteGKContract,
  deleteGKFunction,
  deleteGKStage,
  fetchGKContractDetails,
  fetchGKAttachments,
  downloadGKAttachment,
  uploadGKAttachments,
  updateGKContract,
  updateGKStage,
} from '@/api/gkContracts'
import { downloadGKFunctionsTemplate } from '@/utils/excelTemplates'
import {
  ArrowLeft,
  Box,
  ChatLineRound,
  CircleCheck,
  Delete,
  Document,
  EditPen,
  Files,
  Lightning,
  Plus,
  Pointer,
  RefreshRight,
  Upload,
} from '@element-plus/icons-vue'
import GKContractDialog from '@/components/GKContractDialog.vue'
import GKFunctionDialog from '@/components/GKFunctionDialog.vue'
import ImportExcelDialog from '@/components/ImportExcelDialog.vue'

const router = useRouter()
const authStore = useAuthStore()

const canEditContract = computed(() => authStore.canEditGKContract)
const canEditStages = computed(() => authStore.canEditGKStages)
const canEditFunctions = computed(() => authStore.canEditGKFunctions)
const canDelete = computed(() => authStore.isSuperuser)

const loading = ref(false)
const contracts = ref<ContractItem[]>([])
const contractSearch = ref('')
const archiveFilter = ref<'all' | 'active' | 'archived'>('all')

const drawerLoading = ref(false)
const selectedContractId = ref<number | null>(null)
const contractDetails = ref<GKContractDetails | null>(null)

const detailViewTab = ref<'main' | 'stages' | 'functions'>('main')
const archiveToggling = ref(false)

const detailStagesCount = computed(() => contractDetails.value?.stages?.length ?? 0)
const detailFunctionsCount = computed(() => {
  const st = contractDetails.value?.stages
  if (!st?.length) return 0
  return st.reduce((acc, s) => acc + (s.functions?.length || 0), 0)
})
const detailJiraEpicsCount = computed(() => {
  const st = contractDetails.value?.stages || []
  let total = 0
  for (const stage of st) {
    for (const fn of stage.functions || []) {
      total += fn.jiraEpicLinks?.length || 0
    }
  }
  return total
})
const detailConfluenceCount = computed(() => {
  const st = contractDetails.value?.stages || []
  let total = 0
  for (const stage of st) {
    for (const fn of stage.functions || []) {
      total += fn.confluenceLinks?.length || 0
    }
  }
  return total
})

const flatFunctionRows = computed((): (GKFunction & { __stageNumber: number })[] => {
  const out: (GKFunction & { __stageNumber: number })[] = []
  for (const stage of contractDetails.value?.stages || []) {
    for (const fn of stage.functions || []) {
      out.push({ ...fn, __stageNumber: stage.stageNumber })
    }
  }
  return out
})

const userAvatarLetters = computed(() => {
  const name = (authStore.fullName || '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

function ruRecordsPhrase(count: number): string {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return `${count} записей`
  if (n1 === 1) return `${count} запись`
  if (n1 >= 2 && n1 <= 4) return `${count} записи`
  return `${count} записей`
}

const headerRecordsLabel = computed(() => ruRecordsPhrase(contracts.value.length))

const filteredContracts = computed(() => {
  const list = contracts.value
  const q = contractSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((c) => {
    const blob = [c.name, c.shortName, c.description].map((x) => (x || '').toLowerCase()).join(' ')
    return blob.includes(q)
  })
})

const displayContracts = computed(() => {
  let list = filteredContracts.value
  if (archiveFilter.value === 'active') list = list.filter((c) => c.isActive)
  else if (archiveFilter.value === 'archived') list = list.filter((c) => !c.isActive)
  return list
})

const listCountLine = computed(() => {
  const total = contracts.value.length
  const shown = displayContracts.value.length
  return `${shown} из ${total}`
})

/** Сводка для плейсхолдера (все ГК, не с учётом поиска/фильтра в сайдбаре). */
const gkDirectoryStats = computed(() => {
  const list = contracts.value
  const activeCount = list.filter((c) => c.isActive).length
  const archivedCount = list.length - activeCount
  const stagesTotal = list.reduce((acc, c) => acc + (c.stagesCount ?? 0), 0)
  const functionsTotal = list.reduce((acc, c) => acc + (c.functionsCount ?? 0), 0)
  return { activeCount, archivedCount, stagesTotal, functionsTotal }
})

const emptyListDescription = computed(() => {
  if (!contracts.value.length) return 'В справочнике пока нет государственных контрактов'
  if (contractSearch.value.trim()) return 'Нет ГК по запросу'
  if (archiveFilter.value === 'active') return 'Нет активных ГК'
  if (archiveFilter.value === 'archived') return 'В архиве пока ничего нет'
  return 'Нет записей'
})

const reloadToken = ref(0) // используется для надежного обновления формы при повторном открытии

// Dialogs
const contractDialogVisible = ref(false)
const contractDialogMode = ref<'create' | 'edit'>('create')
const contractDialogLoading = ref(false)
const contractDialogInitial = ref<any>(null)

const importVisible = ref(false)

const functionDialogVisible = ref(false)
const functionDialogStageNumber = ref(1)
const functionDialogInitialFunction = ref<GKFunction | null>(null)
const functionDialogLoading = ref(false)

const attachmentsLoading = ref(false)
const attachmentsUploading = ref(false)
const attachments = ref<ContractAttachmentItem[]>([])

const tzSelectedFiles = ref<File[]>([])
const nmckSelectedFiles = ref<File[]>([])
const tzFileInputRef = ref<HTMLInputElement | null>(null)
const nmckFileInputRef = ref<HTMLInputElement | null>(null)

function formatCreatedAt(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function shortText(value: string, maxLength = 80) {
  const text = (value || '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

async function reloadContracts() {
  try {
    loading.value = true
    contracts.value = await fetchContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки справочника ГК')
    contracts.value = []
  } finally {
    loading.value = false
  }
}

async function reloadContractDetails() {
  if (!selectedContractId.value) return
  try {
    drawerLoading.value = true
    contractDetails.value = await fetchGKContractDetails(selectedContractId.value)
    await reloadAttachments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки деталей ГК')
  } finally {
    drawerLoading.value = false
  }
}

async function reloadAttachments() {
  if (!selectedContractId.value) return
  try {
    attachmentsLoading.value = true
    attachments.value = await fetchGKAttachments(selectedContractId.value)
  } catch {
    attachments.value = []
  } finally {
    attachmentsLoading.value = false
  }
}

function openContractDetails(id: number) {
  selectedContractId.value = id
}

function handleRowClick(row: ContractItem) {
  openContractDetails(row.id)
}

function handleSidebarClick(row: ContractItem) {
  handleRowClick(row)
}

function sidebarAbbr(c: ContractItem) {
  const s = (c.shortName || '').trim()
  if (s) return s
  return '—'
}

function stagesLabel(c: ContractItem) {
  const n = c.stagesCount ?? 0
  return `${n} эт.`
}

function functionsLabel(c: ContractItem) {
  const n = c.functionsCount ?? 0
  return `${n} фун.`
}

function handleUserMenuCommand(cmd: string) {
  if (cmd === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}

function onHeaderImportClick() {
  if (!selectedContractId.value) {
    ElMessage.info('Сначала выберите ГК в списке слева')
    return
  }
  importVisible.value = true
}

function openCreateContract() {
  contractDialogMode.value = 'create'
  contractDialogInitial.value = null
  contractDialogVisible.value = true
}

function onContractDialogSaved() {
  void reloadContracts()
  if (selectedContractId.value) void reloadContractDetails()
}

function onHeroEdit() {
  if (!canEditContract.value || !contractDetails.value) return
  contractDialogMode.value = 'edit'
  contractDialogInitial.value = {
    id: contractDetails.value.id,
    name: contractDetails.value.name,
    shortName: contractDetails.value.shortName || '',
    useShortNameInTaskId: Boolean(contractDetails.value.useShortNameInTaskId),
    description: contractDetails.value.description || '',
    isActive: contractDetails.value.isActive,
  }
  contractDialogVisible.value = true
}

function goToRequirementsForContract() {
  const n = (contractDetails.value?.name || '').trim()
  router.push({ path: '/requirements', query: n ? { search: n } : {} })
}

async function toggleContractArchive() {
  if (!canEditContract.value) return
  if (!selectedContractId.value || !contractDetails.value) return
  const d = contractDetails.value
  const toArchive = d.isActive
  const msg = toArchive
    ? 'Перевести эту ГК в архив?'
    : 'Восстановить эту ГК из архива?'
  try {
    await ElMessageBox.confirm(msg, toArchive ? 'В архив' : 'Восстановить', {
      type: 'warning',
      confirmButtonText: toArchive ? 'В архив' : 'Восстановить',
      cancelButtonText: 'Отмена',
    })
  } catch {
    return
  }
  try {
    archiveToggling.value = true
    await updateGKContract(selectedContractId.value, {
      name: d.name,
      shortName: d.shortName?.trim() || '',
      useShortNameInTaskId: Boolean(d.useShortNameInTaskId),
      description: d.description || '',
      isActive: !d.isActive,
    })
    ElMessage.success(toArchive ? 'ГК переведена в архив' : 'ГК восстановлена')
    await reloadContractDetails()
    await reloadContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка')
  } finally {
    archiveToggling.value = false
  }
}

async function handleAddStage() {
  if (!selectedContractId.value) return

  try {
    const { value: numberValue } = await ElMessageBox.prompt('Введите номер этапа (например, 1, 2, 3)', 'Добавить этап', {
      confirmButtonText: 'Добавить',
      cancelButtonText: 'Отмена',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: 'Введите положительное целое число',
    })

    const stageNumber = Number(numberValue)
    let nameValue = ''
    try {
      const res = await ElMessageBox.prompt(
        'Введите наименование этапа (необязательно)',
        `Этап ${stageNumber}`,
        {
          confirmButtonText: 'Сохранить',
          cancelButtonText: 'Пропустить',
          inputValue: '',
        },
      )
      nameValue = (res.value || '').trim()
    } catch {
      nameValue = ''
    }
    const created = await createGKStage(selectedContractId.value, {
      stageNumber,
      stageName: nameValue,
    })
    ElMessage.success(`Этап ${created.stageNumber} готов`)
    await reloadContractDetails()
  } catch {
    // cancel
  }
}

async function handleRenameStage(stage: GKStage) {
  if (!selectedContractId.value) return
  try {
    const { value } = await ElMessageBox.prompt(
      `Укажите наименование для этапа ${stage.stageNumber}`,
      'Переименование этапа',
      {
        confirmButtonText: 'Сохранить',
        cancelButtonText: 'Отмена',
        inputValue: (stage.stageName || '').trim(),
      },
    )
    await updateGKStage(selectedContractId.value, stage.stageNumber, (value || '').trim())
    ElMessage.success('Наименование этапа обновлено')
    await reloadContractDetails()
  } catch {
    // cancel
  }
}

function onFilesSelected(event: Event, type: 'tz' | 'nmck') {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (type === 'tz') tzSelectedFiles.value = files
  else nmckSelectedFiles.value = files
}

async function upload(type: 'tz' | 'nmck') {
  if (!selectedContractId.value) return

  const files = type === 'tz' ? tzSelectedFiles.value : nmckSelectedFiles.value
  if (!files.length) {
    ElMessage.warning('Сначала выберите файлы')
    return
  }

  try {
    attachmentsUploading.value = true
    await uploadGKAttachments(selectedContractId.value, type, files)
    ElMessage.success('Вложения загружены')

    tzSelectedFiles.value = []
    nmckSelectedFiles.value = []
    if (tzFileInputRef.value) tzFileInputRef.value.value = ''
    if (nmckFileInputRef.value) nmckFileInputRef.value.value = ''
    await reloadAttachments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки вложений')
  } finally {
    attachmentsUploading.value = false
  }
}

async function download(attachmentId: number) {
  try {
    const response = await downloadGKAttachment(attachmentId)
    const blob = response.data as Blob
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const item = attachments.value.find((x) => x.id === attachmentId)
    link.download = item?.originalFileName || 'download'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка скачивания')
  }
}

function openFunctionDialog(stageNumber: number, existing: GKFunction | null) {
  functionDialogStageNumber.value = stageNumber
  functionDialogInitialFunction.value = existing
  functionDialogVisible.value = true
}

function openFunctionDialogFromFlatRow(row: GKFunction & { __stageNumber: number }) {
  const { __stageNumber, ...rest } = row
  openFunctionDialog(__stageNumber, rest as GKFunction)
}

function jiraHref(link?: string) {
  const u = (link || '').trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}

function stageCollapseTitle(stage: GKStage) {
  const n = stage.stageNumber
  const name = (stage.stageName || '').trim()
  if (name) return `Этап ${n} — ${name}`
  return `Этап ${n}`
}

function triggerTzFilePick() {
  tzFileInputRef.value?.click()
}

function triggerNmckFilePick() {
  nmckFileInputRef.value?.click()
}

async function confirmDeleteContract(row: ContractItem) {
  try {
    await ElMessageBox.confirm(
      `Удалить ГК «${row.name}» и все этапы, функции и файлы? Ссылки в предложениях на функции будут сняты.`,
      'Удаление ГК',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteGKContract(row.id)
    ElMessage.success('ГК удалён')
    if (selectedContractId.value === row.id) {
      selectedContractId.value = null
      contractDetails.value = null
    }
    await reloadContracts()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления ГК')
  }
}

async function confirmDeleteContractFromDrawer() {
  if (!selectedContractId.value || !contractDetails.value) return
  await confirmDeleteContract({
    id: selectedContractId.value,
    name: contractDetails.value.name,
  } as ContractItem)
}

async function confirmDeleteStage(stageNumber: number) {
  if (!selectedContractId.value) return
  try {
    await ElMessageBox.confirm(
      `Удалить этап ${stageNumber} и все функции ТЗ? Ссылки в предложениях будут сняты.`,
      'Удаление этапа',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteGKStage(selectedContractId.value, stageNumber)
    ElMessage.success('Этап удалён')
    await reloadContractDetails()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления этапа')
  }
}

async function confirmDeleteFunction(functionId: number) {
  if (!selectedContractId.value) return
  try {
    await ElMessageBox.confirm(
      'Удалить функцию ТЗ? Ссылка в карточках предложений будет снята.',
      'Удаление функции',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteGKFunction(selectedContractId.value, functionId)
    ElMessage.success('Функция удалена')
    await reloadContractDetails()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления функции')
  }
}

async function confirmDeleteAttachment(attachmentId: number) {
  try {
    await ElMessageBox.confirm('Удалить файл со всеми данными?', 'Удаление файла', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    })
  } catch {
    return
  }
  try {
    await deleteGKAttachment(attachmentId)
    ElMessage.success('Файл удалён')
    await reloadAttachments()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления файла')
  }
}

function downloadGKTemplate() {
  downloadGKFunctionsTemplate()
}

// Initial load
onMounted(async () => {
  await reloadContracts()
})

watch(selectedContractId, (id) => {
  detailViewTab.value = 'main'
  if (!id) {
    contractDetails.value = null
    attachments.value = []
    return
  }
  void reloadContractDetails()
})

onBeforeUnmount(() => {
  reloadToken.value++
})
</script>

<style scoped>
.page.gkd-page {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background: #e8eef5;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.gkd-page-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
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
  border-bottom: 1px solid #1e293b;
  padding: 8px 16px;
  box-shadow: 0 4px 12px rgba(8, 20, 40, 0.2);
}

.page-header-left--dark {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.gkd-header-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gkd-header-kicker {
  font-size: 15px;
  font-weight: 700;
  color: #f8fbff;
  letter-spacing: 0.02em;
}

.gkd-header-count {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

.header-actions--dark {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.header-tools-btn {
  --el-button-bg-color: rgba(255, 255, 255, 0.08);
  --el-button-border-color: rgba(255, 255, 255, 0.18);
  --el-button-text-color: #f3f8ff;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.14);
  --el-button-hover-border-color: rgba(255, 255, 255, 0.28);
  --el-button-hover-text-color: #ffffff;
}

.gkd-header-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gkd-header-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.header-user-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 12px;
}

.header-user-meta__text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
}

.header-user-meta__name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-user-meta__org {
  font-size: 11px;
  color: #94a3b8;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-avatar-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-btn:hover {
  filter: brightness(1.06);
}

.gkd-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 0.34fr) minmax(0, 1fr);
  width: 100%;
}

.gkd-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border-right: 1px solid #dce3ee;
}

.gkd-sidebar-toolbar {
  flex-shrink: 0;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.gkd-sidebar-search {
  width: 100%;
  margin-bottom: 10px;
}

.gkd-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.gkd-filter-pill {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.gkd-filter-pill--active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.gkd-list-meta {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.gkd-sidebar-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px 12px;
}

.gkd-sidebar-item {
  width: 100%;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  padding: 10px 10px 10px 8px;
  margin-bottom: 6px;
  border: 1px solid #e7ecf3;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.gkd-sidebar-item:hover {
  border-color: #bfdbfe;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
}

.gkd-sidebar-item--active {
  border-color: #93c5fd;
  box-shadow: inset 3px 0 0 0 #2563eb;
  background: #eff6ff;
}

.gkd-sidebar-item__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  background: #22c55e;
}

.gkd-sidebar-item__dot--off {
  background: #94a3b8;
}

.gkd-sidebar-item__body {
  flex: 1;
  min-width: 0;
}

.gkd-sidebar-item__row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.gkd-sidebar-item__abbr {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 8px;
  border-radius: 6px;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gkd-sidebar-item__num {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
}

.gkd-sidebar-item__name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  margin-bottom: 8px;
  word-break: break-word;
}

.gkd-sidebar-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gkd-mini-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.gkd-mini-tag--stages {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.gkd-mini-tag--funcs {
  background: #ecfdf5;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.gkd-sidebar-empty {
  padding: 24px 8px;
}

.gkd-main-area {
  min-width: 0;
  min-height: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gkd-main-area--empty {
  background: #f8f9fb;
}

.gkd-detail-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gkd-detail-hero {
  flex-shrink: 0;
  background: #0f172a;
  color: #f1f5f9;
  padding: 12px 16px 0;
  border-bottom: 1px solid #1e293b;
  box-shadow: 0 4px 12px rgba(8, 20, 40, 0.15);
}

.gkd-detail-hero__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding-bottom: 10px;
}

.gkd-detail-hero__left {
  min-width: 0;
  flex: 1 1 220px;
}

.gkd-detail-hero__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.gkd-hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  line-height: 1.2;
  border: 1px solid transparent;
}

.gkd-hero-pill--status {
  background: #fff;
  color: #0f172a;
  border-color: #e2e8f0;
}

.gkd-hero-pill--status-on {
  color: #15803d;
  border-color: #bbf7d0;
}

.gkd-hero-pill--status-off {
  color: #64748b;
  border-color: #e2e8f0;
}

.gkd-hero-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.gkd-hero-pill__dot.is-on {
  background: #22c55e;
}
.gkd-hero-pill__dot.is-off {
  background: #94a3b8;
}

.gkd-hero-pill--id {
  background: #1e293b;
  color: #cbd5e1;
  border-color: #334155;
  font-weight: 600;
}

.gkd-detail-hero__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.2;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.gkd-detail-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 6px 10px;
}

.gkd-hero-ico-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 64px;
  padding: 4px 4px 2px;
  background: none;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  font: inherit;
  line-height: 1.1;
  border-radius: 8px;
  transition: background 0.15s ease, color 0.15s ease;
}
.gkd-hero-ico-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}
.gkd-hero-ico-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.gkd-hero-ico-btn--danger:hover:not(:disabled) {
  color: #fecaca;
}
.gkd-hero-ico-btn__label {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  max-width: 84px;
  text-align: center;
}
.gkd-hero-ico-btn:hover:not(:disabled) .gkd-hero-ico-btn__label {
  color: #e2e8f0;
}

.gkd-detail-hero__rule {
  height: 0;
  border: 0;
  border-top: 1px solid #1e3a5c;
  margin: 0 -16px 0;
  padding: 0 16px;
  background: #0f172a;
  box-sizing: border-box;
}

.gkd-detail-hero__tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 4px;
  padding: 0 0 0 2px;
}

.gkd-hero-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
  padding: 8px 10px 10px;
  margin: 0;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: color 0.15s ease, background 0.15s ease;
}
.gkd-hero-tab:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}
.gkd-hero-tab--active {
  color: #e2e8f0;
}
.gkd-hero-tab--active::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: #3b82f6;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
}
.gkd-hero-tab__icon {
  color: #94a3b8;
}
.gkd-hero-tab--active .gkd-hero-tab__icon {
  color: #e2e8f0;
}
.gkd-hero-tab__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
}

.gkd-detail-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 20px 28px;
  box-sizing: border-box;
}

.gkd-detail-scroll--tabbed {
  padding: 16px 20px 28px;
  background: #fafbfd;
}

.gkd-overview {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.gkd-overview__meta-card {
  border: 1px solid #e7ecf3;
  border-radius: 12px;
  background: #fff;
  padding: 14px 16px;
}

.gkd-overview__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 22px;
}

.gkd-overview__label {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 3px;
}

.gkd-overview__value {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
  word-break: break-word;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gkd-overview__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}
.gkd-overview__status-dot.is-off {
  background: #94a3b8;
}

.gkd-overview__stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.gkd-overview-stat {
  border-radius: 12px;
  border: 1px solid #dbe4ef;
  padding: 10px 12px;
}

.gkd-overview-stat__value {
  font-size: 30px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.gkd-overview-stat__label {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.gkd-overview-stat--stages {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.gkd-overview-stat--stages .gkd-overview-stat__value {
  color: #1d4ed8;
}
.gkd-overview-stat--functions {
  background: #ecfdf5;
  border-color: #bbf7d0;
}
.gkd-overview-stat--functions .gkd-overview-stat__value {
  color: #15803d;
}
.gkd-overview-stat--jira {
  background: #f5f3ff;
  border-color: #ddd6fe;
}
.gkd-overview-stat--jira .gkd-overview-stat__value {
  color: #6d28d9;
}
.gkd-overview-stat--confluence {
  background: #fff7ed;
  border-color: #fed7aa;
}
.gkd-overview-stat--confluence .gkd-overview-stat__value {
  color: #c2410c;
}

.gkd-empty-state {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 40px;
  box-sizing: border-box;
}

.gkd-empty-state__inner {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.gkd-empty-state__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.gkd-empty-state__icon-sq {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #e8f0fe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gkd-empty-state__head-icon {
  color: #3b82f6;
}

.gkd-empty-state__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.gkd-empty-state__subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
  max-width: 440px;
}

.gkd-empty-state__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.gkd-stat-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 14px 12px;
  border-radius: 12px;
  text-align: left;
  min-width: 0;
}

.gkd-stat-card--active {
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.gkd-stat-card--archived {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.gkd-stat-card--stages {
  background: #eff6ff;
  border: 1px solid #93c5fd;
}

.gkd-stat-card--functions {
  background: #f5f3ff;
  border: 1px solid #c4b5fd;
}

.gkd-stat-card__icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
}

.gkd-stat-card--active .gkd-stat-card__icon-wrap {
  background: rgba(255, 255, 255, 0.7);
}
.gkd-stat-card--archived .gkd-stat-card__icon-wrap {
  background: #fff;
}
.gkd-stat-card--stages .gkd-stat-card__icon-wrap {
  background: rgba(255, 255, 255, 0.5);
}
.gkd-stat-card--functions .gkd-stat-card__icon-wrap {
  background: rgba(255, 255, 255, 0.5);
}

.gkd-stat-card__icon--emerald {
  color: #16a34a;
}
.gkd-stat-card__icon--slate {
  color: #475569;
}
.gkd-stat-card__icon--blue {
  color: #2563eb;
}
.gkd-stat-card__icon--violet {
  color: #7c3aed;
}

.gkd-stat-card__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gkd-stat-card__value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.gkd-stat-card__value--emerald {
  color: #15803d;
}
.gkd-stat-card__value--slate {
  color: #334155;
}
.gkd-stat-card__value--blue {
  color: #1d4ed8;
}
.gkd-stat-card__value--violet {
  color: #6d28d9;
}

.gkd-stat-card__label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.25;
}

@media (max-width: 900px) {
  .gkd-body {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(200px, auto) 1fr;
  }

  .gkd-sidebar {
    border-right: 0;
    border-bottom: 1px solid #dce3ee;
    max-height: 46vh;
  }

  .gkd-empty-state__grid {
    grid-template-columns: 1fr;
  }
}

.gkd-fn-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 14px;
  justify-content: center;
  align-items: center;
  padding: 2px 4px;
  box-sizing: border-box;
  white-space: nowrap;
}

.gkd-functions-table :deep(.el-table__fixed-right .el-table__cell:last-child .cell) {
  padding-left: 10px;
  padding-right: 10px;
}

.jira-table-link {
  color: #1e4d7b;
  font-size: 13px;
  word-break: break-all;
}

.muted-dash {
  color: #94a3b8;
}

.drawer-body {
  display: grid;
  gap: 20px;
  box-sizing: border-box;
}

.gkd-drawer-body {
  min-height: 0;
}

.section-card {
  border-radius: 16px;
  border: 1px solid #e7ecf3;
}

.section-card :deep(.el-card__body) {
  padding: 18px 20px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 4px;
}

.section-header--stages {
  align-items: center;
  flex-wrap: wrap;
}

.section-header--stages .section-title {
  flex: 1 1 auto;
  min-width: 120px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.01em;
}

.section-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.section-actions--toolbar {
  gap: 8px;
}

.gkd-stages-collapse {
  border: none;
  margin-top: 8px;
}

.gkd-stages-collapse :deep(.el-collapse-item) {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  margin-bottom: 10px;
  overflow: hidden;
  background: #fff;
}

.gkd-stages-collapse :deep(.el-collapse-item:last-child) {
  margin-bottom: 0;
}

.gkd-stages-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 48px;
  line-height: 1.35;
  padding: 10px 14px 10px 16px;
  font-weight: 600;
  color: #1f2937;
  background: #fafbfd;
}

.gkd-stages-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.gkd-stages-collapse :deep(.el-collapse-item__content) {
  padding: 0 14px 16px 16px;
}

.gkd-stages-collapse :deep(.el-collapse-item__arrow) {
  margin: 0 0 0 10px;
}

.collapse-stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-right: 4px;
  box-sizing: border-box;
}

.collapse-stage-title-text {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 15px;
}

.collapse-stage-delete {
  flex-shrink: 0;
}

.collapse-stage-rename {
  flex-shrink: 0;
}

.readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.readonly-card {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fff;
}

.readonly-card.full {
  grid-column: 1 / -1;
}

.readonly-label {
  font-size: 12px;
  color: #667085;
  margin-bottom: 6px;
  font-weight: 700;
}

.readonly-value {
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937;
}

.stage-body {
  display: grid;
  gap: 14px;
}

.stage-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.attachments-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: stretch;
}

.attachment-col {
  display: grid;
  gap: 12px;
  align-content: start;
}

.attachment-panel {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  padding: 14px 16px 16px;
  background: #fafbfd;
  min-height: 200px;
}

.attachment-type-title {
  font-weight: 700;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.upload-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: stretch;
}

.upload-row :deep(.el-button) {
  margin: 0;
  width: 100%;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.selected-files-hint {
  font-size: 13px;
  color: #667085;
}

.attachment-row-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.attachment-list {
  display: grid;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e7ecf3;
  background: #fff;
}

.attachment-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #344054;
}

@media (max-width: 900px) {
  .page-header--dark {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions--dark {
    justify-content: flex-start;
    width: 100%;
  }

  .attachments-grid {
    grid-template-columns: 1fr;
  }

  .gkd-overview__grid {
    grid-template-columns: 1fr;
  }

  .gkd-overview__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .upload-row {
    grid-template-columns: 1fr;
  }
}
</style>

