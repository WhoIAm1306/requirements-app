# AGENT.md — проект «Учёт предложений»

Краткое описание для ИИ-агентов и разработчиков: назначение репозитория, стек, структура каталогов и ответственность файлов.

## Назначение

Внутреннее веб-приложение для учёта предложений (требований): карточки с полями ГК, очереди, статусы, комментарии, архив, импорт/экспорт Excel, справочник государственных контрактов (ГК) с этапами и функциями ТЗ, вложения к предложениям с общей «библиотекой» файлов для повторного прикрепления. Роли: чтение / редактирование / суперпользователь (админ-пользователи, массовое удаление).

## Стек

| Слой     | Технологии |
|----------|------------|
| Backend  | Go 1.22+, Gin, GORM, PostgreSQL, JWT (bcrypt для паролей) |
| Frontend | Vue 3, TypeScript, Vite, Pinia, Vue Router, Element Plus, axios, xlsx |
| Deploy   | Docker (мультистейдж: сборка фронта + Go-бинарник), см. `Dockerfile`, `DEPLOY.md` |

## Корень репозитория

| Путь | Роль |
|------|------|
| `Dockerfile` | Сборка образа: `frontend` → `dist`, Go `cmd/app` → бинарник, статика в `frontend-dist` |
| `docker-compose.yml` | Локальный запуск приложения + Postgres |
| `deploy.env.example` | Пример переменных для продакшена |
| `DEPLOY.md` | Инструкции по развёртыванию |
| `.gitignore` | Игнор: `.env`, `node_modules`, `dist`, локальные `uploads` под `backend/cmd/app/uploads/` |

## Backend (`backend/`)

| Путь | Роль |
|------|------|
| `cmd/app/main.go` | Точка входа HTTP: CORS, группы маршрутов `read` / `edit` / `admin`, раздача `frontend-dist`, health |
| `cmd/purge/main.go` | Утилита полной очистки данных БД (кроме `users`) и каталогов вложений |
| `internal/config/config.go` | Загрузка `.env`, структура `Config` |
| `internal/db/postgres.go` | Подключение PostgreSQL, `AutoMigrate`, сиды очередей и суперпользователя |
| `internal/models/models.go` | GORM-сущности: `Requirement`, `Comment`, справочники ГК, вложения, пользователи, библиотека файлов предложений |
| `internal/security/jwt.go` | Подпись и валидация JWT |
| `internal/middleware/auth_middleware.go` | `RequireAuth`, `RequireEditOrSuperuser`, `RequireSuperuser` |
| `internal/handlers/auth_handler.go` | Логин, смена пароля, `/auth/me` |
| `internal/handlers/user_handler.go` | CRUD пользователей (админ) |
| `internal/handlers/requirement_handler.go` | CRUD предложений, список, фильтры, комментарии, архив, импорт/экспорт, привязка к ГК |
| `internal/handlers/requirement_attachment_handler.go` | Вложения предложений: загрузка, библиотека, скачивание, открепление |
| `internal/handlers/dictionary_handler.go` | Авторы, пункты ТЗ, очереди, список/поиск ГК (legacy-справочник имён) |
| `internal/handlers/contract_directory_handler.go` | Полный CRUD справочника ГК: этапы, функции ТЗ, Excel-импорт, вложения ГК |

Файлы на диске: `uploads/contracts/...`, `uploads/requirements/library/...` (относительно рабочей директории процесса).

## Frontend (`frontend/src/`)

| Путь | Роль |
|------|------|
| `main.ts` | Создание приложения, плагины, импорт стилей Element Plus + `styles/app-theme.css` |
| `App.vue` | Корневой `<router-view />` |
| `router/index.ts` | Маршруты, ленивые импорты страниц, guard по токену и `isSuperuser` |
| `stores/auth.ts` | Сессия: токен, профиль, вычисляемые `accessLevel`, `isSuperuser` |
| `api/client.ts` | Axios: `baseURL`, Bearer, обработка 401 |
| `api/auth.ts` | Логин и смена пароля |
| `api/requirements.ts` | Все запросы по предложениям, экспорт Excel, вложения, библиотека файлов |
| `api/contracts.ts`, `api/gkContracts.ts` | Справочник ГК и операции с этапами/функциями/вложениями |
| `api/queues.ts`, `api/adminUsers.ts`, `api/imports.ts` | Очереди, админ-пользователи, импорты Excel |
| `types/index.ts` | Общие TypeScript-типы DTO |
| `constants/` | Статусы, типы систем, инициатор по системе |
| `utils/excelTemplates.ts` | Шаблоны Excel для скачивания |
| `utils/debounce.ts` | Утилита debounce (например, resize) |
| `styles/app-theme.css` | Корпоративные цвета, кнопки, переключатели, таблицы |
| `pages/LoginPage.vue` | Вход |
| `pages/RequirementsPage.vue` | Главная: таблица, фильтры, действия, диалоги |
| `pages/GKDirectoryPage.vue` | Справочник ГК |
| `pages/AdminUsersPage.vue` | Управление пользователями |
| `components/RequirementDetailsDrawer.vue` | Карточка предложения, вложения, комментарии |
| `components/RequirementFormDialog.vue` | Создание/редактирование в диалоге |
| `components/ImportExcelDialog.vue`, `ProfileDrawer.vue`, `AdminUserDialog.vue` | Импорт, профиль, пользователь |
| Остальные `components/*` | Диалоги и теги для ГК и статусов |

Сборка: `frontend/npm run build` → `dist/`. Переменная `VITE_API_BASE_URL` (см. `.env.production.example`) задаёт префикс API.

## Команды

```bash
# Backend (из backend/)
go run ./cmd/app

# Frontend dev (из frontend/)
npm run dev

# Purge БД (из backend/, осторожно)
go run ./cmd/purge
```

## Соглашения для правок

- Не коммитить секреты и локальные `uploads` под `backend/cmd/app/uploads/`.
- Новые API — симметрично типы в `types/index.ts` и функции в `api/*.ts`.
- Маршруты бэкенда: публичные/чтение/редактирование/админ — по образцу `cmd/app/main.go`.
