# AGENT.md — оперативная карта проекта requirements-app

Этот файл нужен как рабочий навигатор для ИИ-агента и разработчика: куда идти в коде, где точка входа для каждой задачи, какие ограничения по правам и где легко сломать поведение.

## 1) Что это за система

Внутреннее веб-приложение для учета предложений (requirements):
- карточки предложений с полями, статусами, очередями и архивом;
- комментарии и вложения (включая библиотеку файлов для повторного прикрепления);
- справочник государственных контрактов (ГК): контракты, этапы, функции ТЗ, вложения;
- импорт/экспорт Excel;
- управление пользователями и granular grants.

Роли:
- `read` — базовое чтение, плюс точечные grants;
- `edit` — редактирование доменных сущностей;
- `isSuperuser=true` — админ-функции и обход большинства ограничений.

## 2) Быстрый старт (5 минут)

Локально:

```bash
# backend
cd backend
go run ./cmd/app

# frontend (в отдельном терминале)
cd frontend
npm install
npm run dev
```

Docker:

```bash
docker compose up -d --build
```

Проверка живости:
- `GET /api/health` в `backend/cmd/app/main.go`.

Ключевые env и конфиг:
- backend env читается в `backend/internal/config/config.go`;
- пример: `backend/.env.example`;
- deploy env: `deploy.env.example`.

## 3) Карта репозитория

Корень:
- `Dockerfile` — multi-stage сборка frontend + backend, рантайм с `frontend-dist`;
- `docker-compose.yml` — app + postgres + volume для загрузок;
- `DEPLOY.md` — сценарии развёртывания и обслуживания;
- `infra/docker-compose.yml` — минимальный postgres для локальных сценариев.

Backend:
- `backend/cmd/app/main.go` — главный роутер, CORS, auth groups, SPA fallback;
- `backend/internal/db/postgres.go` — подключение, `AutoMigrate`, начальные данные;
- `backend/internal/models/models.go` — все GORM-сущности и связи;
- `backend/internal/handlers/*` — бизнес-логика API;
- `backend/internal/middleware/*` — auth/RBAC/grants;
- `backend/cmd/purge/main.go` — destructive очистка данных и uploads (использовать очень осторожно).

Frontend:
- `frontend/src/main.ts` — инициализация Vue/Pinia/Router/ElementPlus;
- `frontend/src/router/index.ts` — маршруты и guard;
- `frontend/src/stores/auth.ts` — профиль, capability-флаги, grants;
- `frontend/src/api/*.ts` — слой HTTP-клиента;
- `frontend/src/pages/*` — главные экраны;
- `frontend/src/components/*` — диалоги и составные элементы.

Docs:
- `docs/ADMIN_USERS_IMPORT_EXPORT_HINTS.md` — нюансы импорта/экспорта пользователей и грантов.

## 4) Архитектура по потокам (куда идти при задаче)

### 4.1 Логин и сессия
- UI: `frontend/src/pages/LoginPage.vue`
- API client: `frontend/src/api/auth.ts`
- Backend: `backend/internal/handlers/auth_handler.go`
- Route wiring: `backend/cmd/app/main.go` (`POST /api/auth/login`)
- Состояние сессии: `frontend/src/stores/auth.ts` + `localStorage`.

### 4.2 Список и карточка requirement
- Экран списка: `frontend/src/pages/RequirementsPage.vue`
- Детали и частичное редактирование: `frontend/src/components/RequirementDetailsDrawer.vue`
- API: `frontend/src/api/requirements.ts`
- Backend handler: `backend/internal/handlers/requirement_handler.go`
- Права и merge разрешенных полей:  
  - `backend/internal/middleware/requirement_grants.go`  
  - `backend/internal/handlers/requirement_grant_merge.go`

### 4.3 Комментарии requirement
- UI блок: `RequirementDetailsDrawer.vue`
- Middleware: `backend/internal/middleware/requirement_comment.go`
- Routes: `POST/DELETE /api/requirements/:id/comments...` в `backend/cmd/app/main.go`.

### 4.4 Вложения requirement и библиотека
- Backend logic: `backend/internal/handlers/requirement_attachment_handler.go`
- Основные endpoints подключены в `backend/cmd/app/main.go`
- Физическое хранение: `./uploads/requirements/library/...`.

### 4.5 Справочник ГК
- Экран: `frontend/src/pages/GKDirectoryPage.vue`
- API: `frontend/src/api/gkContracts.ts`, `frontend/src/api/contracts.ts`
- Backend: `backend/internal/handlers/contract_directory_handler.go`
- Права GK: `backend/internal/middleware/gk_directory_grants.go`.

### 4.6 Админ-пользователи
- Экран: `frontend/src/pages/AdminUsersPage.vue`
- Диалог: `frontend/src/components/AdminUserDialog.vue`
- API: `frontend/src/api/adminUsers.ts`
- Backend: `backend/internal/handlers/user_handler.go`
- Routes: `/api/admin/users*` в `backend/cmd/app/main.go`.

## 5) Индекс API-групп (как читать роутинг)

Опорный файл: `backend/cmd/app/main.go`.

- `public`:
  - `POST /api/auth/login`

- `read` (`RequireAuth`):
  - чтение requirements/справочников/ГК;
  - некоторые mutation-операции под granular middleware (comments, attachments, partial PUT, GK edit grants).

- `edit` (`RequireAuth + RequireEditOrSuperuser`):
  - создание requirement, архив/restore;
  - создание очереди;
  - импорт requirements и TZ points.

- `admin` (`/api/admin` + `RequireSuperuser`):
  - CRUD/import/export users;
  - массовое удаление требований.

Важно: часть write-операций intentionally находится в `read`-группе, но дополнительно закрыта специфичными middleware по grants.

## 6) RBAC и grants (критично для любых правок)

Базовые проверки:
- `backend/internal/middleware/auth_middleware.go`

Requirement field grants:
- источник: `users.requirement_field_grants` (JSON);
- проверка и допуск к `PUT`: `backend/internal/middleware/requirement_grants.go`;
- защитный merge разрешенных полей: `backend/internal/handlers/requirement_grant_merge.go`.

Тонкости:
- grant `comment` отдельно от общего `PUT` карточки;
- для `PUT` у `read`-пользователя нужен хотя бы один grant, отличный от `comment`;
- удаление requirement: `edit` + grant `deleteRequirement` (или superuser);
- вложения requirement: grant `attachments` (или edit/superuser).

GK directory grants:
- источник: `users.gk_directory_grants` (JSON);
- ключи: `gkContractEdit`, `gkStageEdit`, `gkFunctionEdit`;
- проверка: `backend/internal/middleware/gk_directory_grants.go`;
- для несуперпользователя нужен `accessLevel=edit`.

Frontend capability-флаги:
- `frontend/src/stores/auth.ts`

Правило синхронизации: ключи grants должны совпадать между backend и frontend 1:1.

## 7) Данные и хранение

Опорный файл: `backend/internal/models/models.go`.

Ключевые сущности:
- `Requirement`, `Comment`;
- `RequirementAttachmentLibrary`, `RequirementAttachment`;
- `ContractDictionary`, `ContractStage`, `ContractTZFunction`, `ContractAttachment`;
- `QueueDictionary`, `TZPoint`, `AuthorDictionary`;
- `User` (включая JSON grants).

Где что хранится:
- PostgreSQL: доменные сущности, связи, grants, метаданные файлов;
- файловая система: бинарные вложения в `./uploads/contracts/...` и `./uploads/requirements/library/...`.

## 8) Operational Safety (что не ломать)

Перед любой правкой проверять:
- grants-ключи и их соответствие в `stores/auth.ts` + backend middleware/merge;
- целостность ссылок requirement <-> GK functions при удалениях в справочнике ГК;
- логику генерации/обновления `taskIdentifier` в `requirement_handler.go`;
- поведение upload/download/delete для файлов (зависимость от рабочей директории и volume);
- что route реально существует на backend, если используется на frontend API.

## 9) Playbooks изменений (чеклисты)

### Добавить поле в requirement
1. Обновить `backend/internal/models/models.go` (+ миграции через `AutoMigrate`).
2. Обновить DTO/валидацию в `backend/internal/handlers/requirement_handler.go`.
3. Обновить merge по grants в `backend/internal/handlers/requirement_grant_merge.go` (если поле редактируемое).
4. Добавить/обновить grant-ключи:
   - backend: `middleware/requirement_grants.go`
   - frontend: `frontend/src/constants/requirementFieldGrants.ts`, `stores/auth.ts`.
5. Обновить UI формы/детали/таблицу и `frontend/src/types/index.ts`.

### Добавить новый grant
1. Определить источник (`requirement_field_grants` или `gk_directory_grants`).
2. Реализовать backend check middleware.
3. Добавить frontend capability и отображение в админ-форме пользователя.
4. Проверить импорт/экспорт users (`user_handler.go` + `docs/ADMIN_USERS_IMPORT_EXPORT_HINTS.md`).

### Добавить endpoint
1. Реализовать handler.
2. Подключить route в `backend/cmd/app/main.go` в правильную группу (`public/read/edit/admin`).
3. Если endpoint write-sensitive, добавить middleware grants.
4. Добавить frontend API-функцию и типы.

### Изменить импорт/экспорт Excel
1. Backend parsing/headers: `requirement_handler.go` или `user_handler.go` / `contract_directory_handler.go`.
2. Frontend загрузка/скачивание: `frontend/src/api/imports.ts` и соответствующие dialog-компоненты.
3. Обновить пользовательские подсказки в `docs/`.

## 10) Мини-чеклист перед завершением задачи

- Backend компилируется (`go run ./cmd/app` или `go test ./...` при необходимости).
- Frontend собирается (`npm run build`) или минимум не содержит TypeScript-ошибок в измененных местах.
- RBAC smoke-тест:
  - `read` без grants,
  - `read` с точечным grant,
  - `edit`,
  - `superuser`.
- Не утекли секреты/локальные uploads в git.
