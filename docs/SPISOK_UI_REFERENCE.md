# SPISOK UI Reference

Краткая памятка для агента по папке `spisok` (прототип из Figma Make), чтобы брать оттуда паттерны верстки в `requirements-app`.

## Где находится

- Локальный путь: `C:/Users/D.Zinovev/Desktop/spisok`
- Это референс-проект UI, не часть production-сборки `requirements-app`.

## Главный каркас

- `src/app/App.tsx`
  - Темная верхняя навигация (логотип, табы, переключатели).
  - Паттерн pills/segmented controls для шапки.

- `src/app/RegistryPage.tsx`
  - Эталонная композиция реестра:
    1. `HeaderToolbar`
    2. `FilterBar`
    3. `ColumnHeaders`
    4. `RequirementRowCard[]`
    5. `PaginationBar`
    6. `BulkActionsBar`

## Ключевые UI-компоненты

- `src/app/components/HeaderToolbar.tsx`
  - Заголовок + счетчик + поиск + добавить + экспорт + `...`.
  - Использовать как шаблон верхней части режима "Список".

- `src/app/components/FilterBar.tsx`
  - Ряд фильтров в виде компактных dropdown-пилюль.
  - Есть reset и счетчик активных фильтров.

- `src/app/components/ColumnHeaders.tsx`
  - Sticky header на CSS Grid.
  - Ключевая сетка колонок:
    - `40px 84px 1fr 148px 162px 162px 148px 112px 52px`
  - Эту сетку переиспользовать для row-компонента 1:1.

- `src/app/components/RequirementRowCard.tsx`
  - Строка-элемент списка с состояниями:
    - `default`, `hover`, `selected`,
    - `archived_completed`, `archived_outdated`.
  - Внутренние вертикальные разделители колонок.
  - ID-chip + приоритет, статус-бейдж, правое action-меню.

- `src/app/components/BulkActionsBar.tsx`
  - Floating нижняя панель массовых действий.
  - Паттерн: dark rounded bar, счетчик, архив/отвязка/удаление/очистить.

- `src/app/components/PaginationBar.tsx`
  - Нижняя зона с "Показано X-Y", выбором page size, пагинацией.

## Соответствие данным requirements-app

- `displayId` -> `taskIdentifier`
- `title` -> `shortName`
- `status` -> `statusText`
- `initiator` -> `initiator`
- `initiatorOrg` -> `authorOrg`
- `responsible` -> `responsiblePerson`
- `responsibleDept` -> `sectionName` (или близкое поле)
- `gkNumber` -> `contractName`
- `stage` -> производное из `tzCellLabel(row)`/этапа ГК
- `updatedAt` -> `updatedAt` (через `formatTableDate`)

## Что копировать в первую очередь

1. Порядок блоков из `RegistryPage.tsx`.
2. Сетку колонок из `ColumnHeaders.tsx`.
3. Ряд строки из `RequirementRowCard.tsx`.
4. Нижний bulk-bar из `BulkActionsBar.tsx`.
5. Top toolbar + filters из `HeaderToolbar.tsx` и `FilterBar.tsx`.

## Что не переносить "как есть"

- Тестовые переключатели `Variant`/`ViewState`.
- Mock data и типы из `spisok/src/app/components/registry/mock-data.ts`.
- Иконки/действия, которых нет в production-логике.

## Правило использования

При доработках UI `RequirementsPage.vue`:
- сначала взять визуальную структуру из `spisok`,
- затем подставить существующие данные и обработчики из `requirements-app`,
- не менять backend-API ради точного копирования прототипа.
